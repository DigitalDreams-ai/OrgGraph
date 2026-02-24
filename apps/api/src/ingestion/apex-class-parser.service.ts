import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { stableId } from '../common/ids';
import type { GraphEdge, GraphNode, GraphPayload } from '../graph/graph.types';

export class ApexClassParseError extends Error {
  constructor(
    readonly filePath: string,
    readonly reason: string
  ) {
    super(`Failed to parse Apex class at ${filePath}: ${reason}`);
    this.name = 'ApexClassParseError';
  }
}

@Injectable()
export class ApexClassParserService {
  parseFromFixtures(rootPath: string): GraphPayload {
    const classesDir = path.join(rootPath, 'apex-classes');
    const nodesById = new Map<string, GraphNode>();
    const edgesById = new Map<string, GraphEdge>();

    if (!fs.existsSync(classesDir)) {
      return { nodes: [], edges: [] };
    }

    const files = fs.readdirSync(classesDir).filter((name) => name.endsWith('.cls'));

    for (const file of files) {
      const filePath = path.join(classesDir, file);
      const source = fs.readFileSync(filePath, 'utf8');
      const parsed = this.parseClassSource(source, filePath);

      const classNode = this.upsertNode(nodesById, {
        type: NODE_TYPES.APEX_CLASS,
        name: parsed.className,
        meta: JSON.stringify({ source: file })
      });

      for (const objectName of parsed.queriedObjects) {
        const objectNode = this.upsertNode(nodesById, {
          type: NODE_TYPES.OBJECT,
          name: objectName
        });

        this.upsertEdge(edgesById, {
          srcId: classNode.id,
          dstId: objectNode.id,
          rel: REL_TYPES.QUERIES,
          meta: JSON.stringify({ source: file })
        });

        this.upsertEdge(edgesById, {
          srcId: classNode.id,
          dstId: objectNode.id,
          rel: REL_TYPES.REFERENCES,
          meta: JSON.stringify({ source: file })
        });
      }

      for (const objectName of parsed.writtenObjects) {
        const objectNode = this.upsertNode(nodesById, {
          type: NODE_TYPES.OBJECT,
          name: objectName
        });

        this.upsertEdge(edgesById, {
          srcId: classNode.id,
          dstId: objectNode.id,
          rel: REL_TYPES.WRITES,
          meta: JSON.stringify({ source: file })
        });
      }

      for (const fieldName of parsed.queriedFields) {
        const fieldNode = this.upsertNode(nodesById, {
          type: NODE_TYPES.FIELD,
          name: fieldName
        });

        this.upsertEdge(edgesById, {
          srcId: classNode.id,
          dstId: fieldNode.id,
          rel: REL_TYPES.QUERIES,
          meta: JSON.stringify({ source: file })
        });

        this.upsertEdge(edgesById, {
          srcId: classNode.id,
          dstId: fieldNode.id,
          rel: REL_TYPES.REFERENCES,
          meta: JSON.stringify({ source: file })
        });
      }
    }

    return {
      nodes: [...nodesById.values()].sort(
        (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
      ),
      edges: [...edgesById.values()].sort(
        (a, b) =>
          a.srcId.localeCompare(b.srcId) ||
          a.dstId.localeCompare(b.dstId) ||
          a.rel.localeCompare(b.rel) ||
          a.id.localeCompare(b.id)
      )
    };
  }

  private parseClassSource(source: string, filePath: string): {
    className: string;
    queriedObjects: string[];
    queriedFields: string[];
    writtenObjects: string[];
  } {
    const classMatch = source.match(/\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (!classMatch) {
      throw new ApexClassParseError(filePath, 'missing class declaration');
    }

    const className = classMatch[1];
    const variableTypes = this.parseVariableTypes(source);

    const queriedObjects = new Set<string>();
    const queriedFields = new Set<string>();

    const soqlRegex = /\[\s*select\s+([\s\S]*?)\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\b/gi;
    for (const match of source.matchAll(soqlRegex)) {
      const fields = match[1]
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const objectName = match[2];
      queriedObjects.add(objectName);

      for (const field of fields) {
        if (field.includes('(') || field === '*') {
          continue;
        }
        const normalized = field.replace(/\s+/g, '');
        queriedFields.add(`${objectName}.${normalized}`);
      }
    }

    const writtenObjects = new Set<string>();
    const dmlRegex = /\b(update|insert|upsert|delete)\s+([A-Za-z_][A-Za-z0-9_]*)\b/gi;
    for (const match of source.matchAll(dmlRegex)) {
      const token = match[2];
      const resolved = variableTypes.get(token) ?? token;
      if (resolved[0] === resolved[0].toUpperCase()) {
        writtenObjects.add(resolved);
      }
    }

    return {
      className,
      queriedObjects: [...queriedObjects].sort((a, b) => a.localeCompare(b)),
      queriedFields: [...queriedFields].sort((a, b) => a.localeCompare(b)),
      writtenObjects: [...writtenObjects].sort((a, b) => a.localeCompare(b))
    };
  }

  private parseVariableTypes(source: string): Map<string, string> {
    const map = new Map<string, string>();

    const listDecl = /\bList<\s*([A-Za-z_][A-Za-z0-9_]*)\s*>\s+([A-Za-z_][A-Za-z0-9_]*)\b/g;
    for (const match of source.matchAll(listDecl)) {
      map.set(match[2], match[1]);
    }

    const objDecl = /\b([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(=|;)/g;
    for (const match of source.matchAll(objDecl)) {
      const type = match[1];
      const variable = match[2];
      if (type[0] === type[0].toUpperCase()) {
        map.set(variable, type);
      }
    }

    return map;
  }

  private upsertNode(
    nodesById: Map<string, GraphNode>,
    params: { type: GraphNode['type']; name: string; meta?: string }
  ): GraphNode {
    const id = stableId('node', params.type, params.name);
    const node: GraphNode = {
      id,
      type: params.type,
      name: params.name,
      meta: params.meta
    };

    nodesById.set(id, nodesById.get(id) ?? node);
    return nodesById.get(id) as GraphNode;
  }

  private upsertEdge(
    edgesById: Map<string, GraphEdge>,
    params: { srcId: string; dstId: string; rel: GraphEdge['rel']; meta?: string }
  ): GraphEdge {
    const id = stableId('edge', params.srcId, params.dstId, params.rel);
    const edge: GraphEdge = {
      id,
      srcId: params.srcId,
      dstId: params.dstId,
      rel: params.rel,
      meta: params.meta
    };

    edgesById.set(id, edgesById.get(id) ?? edge);
    return edgesById.get(id) as GraphEdge;
  }
}
