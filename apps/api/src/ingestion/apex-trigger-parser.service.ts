import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { stableId } from '../common/ids';
import type { GraphEdge, GraphNode, GraphPayload } from '../graph/graph.types';

export class ApexTriggerParseError extends Error {
  constructor(
    readonly filePath: string,
    readonly reason: string
  ) {
    super(`Failed to parse Apex trigger at ${filePath}: ${reason}`);
    this.name = 'ApexTriggerParseError';
  }
}

@Injectable()
export class ApexTriggerParserService {
  parseFromFixtures(rootPath: string): GraphPayload {
    const triggersDir = path.join(rootPath, 'apex-triggers');
    const nodesById = new Map<string, GraphNode>();
    const edgesById = new Map<string, GraphEdge>();

    if (!fs.existsSync(triggersDir)) {
      return { nodes: [], edges: [] };
    }

    const files = fs.readdirSync(triggersDir).filter((name) => name.endsWith('.trigger'));

    for (const file of files) {
      const filePath = path.join(triggersDir, file);
      const source = fs.readFileSync(filePath, 'utf8');
      const parsed = this.parseTriggerSource(source, filePath);

      const triggerNode = this.upsertNode(nodesById, {
        type: NODE_TYPES.APEX_TRIGGER,
        name: parsed.triggerName,
        meta: JSON.stringify({ source: file })
      });

      const targetObject = this.upsertNode(nodesById, {
        type: NODE_TYPES.OBJECT,
        name: parsed.objectName
      });

      this.upsertEdge(edgesById, {
        srcId: triggerNode.id,
        dstId: targetObject.id,
        rel: REL_TYPES.TRIGGERS_ON,
        meta: JSON.stringify({ source: file })
      });

      for (const objectName of parsed.references) {
        const referencedObject = this.upsertNode(nodesById, {
          type: NODE_TYPES.OBJECT,
          name: objectName
        });
        this.upsertEdge(edgesById, {
          srcId: triggerNode.id,
          dstId: referencedObject.id,
          rel: REL_TYPES.REFERENCES,
          meta: JSON.stringify({ source: file })
        });
      }
    }

    const nodes = [...nodesById.values()].sort(
      (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
    );
    const edges = [...edgesById.values()].sort(
      (a, b) =>
        a.srcId.localeCompare(b.srcId) ||
        a.dstId.localeCompare(b.dstId) ||
        a.rel.localeCompare(b.rel) ||
        a.id.localeCompare(b.id)
    );

    return { nodes, edges };
  }

  private parseTriggerSource(
    source: string,
    filePath: string
  ): { triggerName: string; objectName: string; references: string[] } {
    const headerMatch = source.match(/\btrigger\s+([A-Za-z_][A-Za-z0-9_]*)\s+on\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/i);
    if (!headerMatch) {
      throw new ApexTriggerParseError(filePath, 'missing trigger declaration header');
    }

    const triggerName = headerMatch[1];
    const objectName = headerMatch[2];

    const references = new Set<string>();
    const fromRegex = /\bfrom\s+([A-Za-z_][A-Za-z0-9_]*)\b/gi;
    const dmlRegex = /\b(update|insert|upsert|delete)\s+([A-Za-z_][A-Za-z0-9_]*)\b/gi;

    for (const match of source.matchAll(fromRegex)) {
      references.add(match[1]);
    }

    for (const match of source.matchAll(dmlRegex)) {
      references.add(match[2]);
    }

    references.delete(objectName);

    return {
      triggerName,
      objectName,
      references: [...references].sort((a, b) => a.localeCompare(b))
    };
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
