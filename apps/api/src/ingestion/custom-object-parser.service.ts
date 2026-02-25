import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { stableId } from '../common/ids';
import type { GraphEdge, GraphNode, GraphPayload } from '../graph/graph.types';
import { createParserStats, type ParserStats } from './parser-stats';

interface ParsedCustomObject {
  CustomObject?: {
    fullName?: unknown;
    fields?: unknown;
  };
}

@Injectable()
export class CustomObjectParserService {
  private lastStats: ParserStats = createParserStats('custom-object');

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true
  });

  parseFromFixtures(rootPath: string): GraphPayload {
    const nodesById = new Map<string, GraphNode>();
    const edgesById = new Map<string, GraphEdge>();
    this.lastStats = createParserStats('custom-object');

    const objectsDir = path.join(rootPath, 'objects');
    if (!fs.existsSync(objectsDir)) {
      return { nodes: [], edges: [] };
    }

    const objectFiles = this.findObjectFiles(objectsDir);
    this.lastStats.filesDiscovered += objectFiles.length;

    for (const filePath of objectFiles) {
      const xml = fs.readFileSync(filePath, 'utf8');
      const parsed = this.parser.parse(xml) as ParsedCustomObject;
      const objectName = this.resolveObjectName(parsed, path.basename(filePath));
      if (!objectName) {
        this.lastStats.filesSkipped += 1;
        continue;
      }

      this.lastStats.filesParsed += 1;
      const objectNode = this.upsertNode(nodesById, {
        type: NODE_TYPES.OBJECT,
        name: objectName,
        meta: JSON.stringify({ source: path.basename(filePath), parser: 'custom-object' })
      });

      const fields = this.toArray<Record<string, unknown>>(parsed.CustomObject?.fields);
      for (const field of fields) {
        const fieldNameRaw = this.asString(field.fullName);
        if (!fieldNameRaw) {
          continue;
        }
        const normalized = fieldNameRaw.includes('.') ? fieldNameRaw : `${objectName}.${fieldNameRaw}`;
        const fieldNode = this.upsertNode(nodesById, {
          type: NODE_TYPES.FIELD,
          name: normalized,
          meta: JSON.stringify({ source: path.basename(filePath), parser: 'custom-object' })
        });

        this.upsertEdge(edgesById, {
          srcId: objectNode.id,
          dstId: fieldNode.id,
          rel: REL_TYPES.HAS_FIELD,
          meta: JSON.stringify({ source: path.basename(filePath), parser: 'custom-object', confidence: 'high' })
        });
      }
    }

    return {
      nodes: [...nodesById.values()].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)),
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

  private findObjectFiles(root: string): string[] {
    const out: string[] = [];
    const stack = [root];

    while (stack.length > 0) {
      const current = stack.pop() as string;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const abs = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(abs);
          continue;
        }
        if (entry.isFile() && entry.name.endsWith('.object-meta.xml')) {
          out.push(abs);
        }
      }
    }

    return out.sort((a, b) => a.localeCompare(b));
  }

  private resolveObjectName(parsed: ParsedCustomObject, filename: string): string | undefined {
    const fromXml = this.asString(parsed.CustomObject?.fullName);
    if (fromXml) {
      return fromXml;
    }
    return filename.replace(/\.object-meta\.xml$/i, '');
  }

  private toArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    return value ? [value as T] : [];
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  private upsertNode(
    nodesById: Map<string, GraphNode>,
    params: { type: GraphNode['type']; name: string; meta?: string }
  ): GraphNode {
    const id = stableId('node', params.type, params.name);
    const node: GraphNode = { id, type: params.type, name: params.name, meta: params.meta };
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
