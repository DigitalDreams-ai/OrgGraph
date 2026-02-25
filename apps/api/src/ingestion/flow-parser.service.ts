import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { stableId } from '../common/ids';
import type { GraphEdge, GraphNode, GraphPayload } from '../graph/graph.types';
import type { ParserStats } from './parser-stats';

export class FlowParseError extends Error {
  constructor(
    readonly filePath: string,
    readonly reason: string
  ) {
    super(`Failed to parse Flow metadata at ${filePath}: ${reason}`);
    this.name = 'FlowParseError';
  }
}

@Injectable()
export class FlowParserService {
  private static readonly IGNORED_DOTTED_PREFIXES = new Set([
    'apex',
    'flowruntime',
    'process',
    'schema'
  ]);

  private lastStats: ParserStats = {
    parser: 'flow',
    filesDiscovered: 0,
    filesParsed: 0,
    filesSkipped: 0,
    warnings: []
  };

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true
  });

  parseFromFixtures(rootPath: string): GraphPayload {
    const flowsDir = path.join(rootPath, 'flows');
    const nodesById = new Map<string, GraphNode>();
    const edgesById = new Map<string, GraphEdge>();
    this.lastStats = {
      parser: 'flow',
      filesDiscovered: 0,
      filesParsed: 0,
      filesSkipped: 0,
      warnings: []
    };

    if (!fs.existsSync(flowsDir)) {
      return { nodes: [], edges: [] };
    }

    const files = fs.readdirSync(flowsDir).filter((name) => name.endsWith('.xml'));
    this.lastStats.filesDiscovered = files.length;

    for (const file of files) {
      const filePath = path.join(flowsDir, file);
      const xml = fs.readFileSync(filePath, 'utf8');
      const parsed = this.parseFlowFile(xml, filePath);
      this.lastStats.filesParsed += 1;
      const flowName = this.flowNameFromFilename(file);

      const flowNode = this.upsertNode(nodesById, {
        type: NODE_TYPES.FLOW,
        name: flowName,
        meta: JSON.stringify({ source: file })
      });

      if (parsed.triggerObject) {
        const objectNode = this.upsertNode(nodesById, {
          type: NODE_TYPES.OBJECT,
          name: parsed.triggerObject
        });

        this.upsertEdge(edgesById, {
          srcId: flowNode.id,
          dstId: objectNode.id,
          rel: REL_TYPES.TRIGGERS_ON,
          meta: JSON.stringify({ source: file, parser: 'flow', confidence: 'high' })
        });
      }

      for (const fieldName of parsed.referencedFields) {
        const fieldNode = this.upsertNode(nodesById, {
          type: NODE_TYPES.FIELD,
          name: fieldName
        });

        this.upsertEdge(edgesById, {
          srcId: flowNode.id,
          dstId: fieldNode.id,
          rel: REL_TYPES.REFERENCES,
          meta: JSON.stringify({ source: file, parser: 'flow', confidence: 'medium' })
        });
      }

      for (const fieldName of parsed.writtenFields) {
        const fieldNode = this.upsertNode(nodesById, {
          type: NODE_TYPES.FIELD,
          name: fieldName
        });

        this.upsertEdge(edgesById, {
          srcId: flowNode.id,
          dstId: fieldNode.id,
          rel: REL_TYPES.WRITES,
          meta: JSON.stringify({ source: file, parser: 'flow', confidence: 'high' })
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

  getLastStats(): ParserStats {
    return this.lastStats;
  }

  private parseFlowFile(
    xml: string,
    filePath: string
  ): { triggerObject?: string; referencedFields: string[]; writtenFields: string[] } {
    try {
      const parsed = this.parser.parse(xml) as { Flow?: Record<string, unknown> };
      if (!parsed || typeof parsed !== 'object' || !parsed.Flow) {
        throw new FlowParseError(filePath, 'missing Flow root element');
      }

      const flow = parsed.Flow;
      const triggerObject = this.extractTriggerObject(flow);
      const referencedFields = this.extractDottedFields(xml);
      const writtenFields = this.extractWrittenFields(flow);

      return {
        triggerObject,
        referencedFields: [...referencedFields].sort((a, b) => a.localeCompare(b)),
        writtenFields: [...writtenFields].sort((a, b) => a.localeCompare(b))
      };
    } catch (error) {
      if (error instanceof FlowParseError) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new FlowParseError(filePath, reason);
    }
  }

  private extractTriggerObject(flow: Record<string, unknown>): string | undefined {
    const start = flow.start as Record<string, unknown> | undefined;
    const object = start?.object;
    if (typeof object === 'string' && object.trim().length > 0) {
      return object.trim();
    }
    return undefined;
  }

  private extractDottedFields(xml: string): Set<string> {
    const output = new Set<string>();
    const matches = xml.match(/\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b/g) ?? [];
    for (const token of matches) {
      const [lhs, rhs] = token.split('.');
      if (FlowParserService.IGNORED_DOTTED_PREFIXES.has(lhs.toLowerCase())) {
        this.lastStats.filesSkipped += 1;
        continue;
      }
      if (lhs[0] !== lhs[0].toUpperCase() && !lhs.includes('__')) {
        continue;
      }
      if (rhs.length < 2) {
        continue;
      }
      output.add(token);
    }
    return output;
  }

  private extractWrittenFields(flow: Record<string, unknown>): Set<string> {
    const output = new Set<string>();
    const updates = this.toArray<Record<string, unknown>>(flow.recordUpdates);

    for (const update of updates) {
      const object = typeof update.object === 'string' ? update.object : undefined;
      for (const assignment of this.toArray<Record<string, unknown>>(update.inputAssignments)) {
        const field = typeof assignment.field === 'string' ? assignment.field : undefined;
        if (!field) {
          continue;
        }
        if (field.includes('.')) {
          output.add(field);
        } else if (object) {
          output.add(`${object}.${field}`);
        }
      }
    }

    return output;
  }

  private toArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
      return value as T[];
    }
    return value ? [value as T] : [];
  }

  private flowNameFromFilename(file: string): string {
    return file.replace(/\.flow-meta\.xml$/i, '').replace(/\.xml$/i, '');
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
