import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { stableId } from '../common/ids';
import type { GraphEdge, GraphNode, GraphPayload } from '../graph/graph.types';
import { createParserStats, type ParserStats } from './parser-stats';

interface ParsedPermissionSetGroup {
  PermissionSetGroup?: {
    fullName?: unknown;
    permissionSets?: unknown;
  };
}

@Injectable()
export class PermissionSetGroupParserService {
  private lastStats: ParserStats = createParserStats('permission-set-group');

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true
  });

  parseFromFixtures(rootPath: string): GraphPayload {
    const nodesById = new Map<string, GraphNode>();
    const edgesById = new Map<string, GraphEdge>();
    this.lastStats = createParserStats('permission-set-group');

    const dirPath = this.resolveGroupDir(rootPath);
    if (!fs.existsSync(dirPath)) {
      return { nodes: [], edges: [] };
    }

    const files = fs.readdirSync(dirPath).filter((name) => name.endsWith('.permissionsetgroup-meta.xml'));
    this.lastStats.filesDiscovered += files.length;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const parsed = this.parser.parse(fs.readFileSync(filePath, 'utf8')) as ParsedPermissionSetGroup;
      const groupName = this.asString(parsed.PermissionSetGroup?.fullName) ?? file.replace(/\.permissionsetgroup-meta\.xml$/i, '');
      if (!groupName) {
        this.lastStats.filesSkipped += 1;
        continue;
      }

      this.lastStats.filesParsed += 1;
      const groupNode = this.upsertNode(nodesById, {
        type: NODE_TYPES.PERMISSION_SET_GROUP,
        name: groupName,
        meta: JSON.stringify({ source: file, parser: 'permission-set-group' })
      });

      for (const member of this.toArray<unknown>(parsed.PermissionSetGroup?.permissionSets)) {
        const permissionSetName = this.memberName(member);
        if (!permissionSetName) {
          continue;
        }

        const permissionSetNode = this.upsertNode(nodesById, {
          type: NODE_TYPES.PERMISSION_SET,
          name: permissionSetName
        });

        this.upsertEdge(edgesById, {
          srcId: groupNode.id,
          dstId: permissionSetNode.id,
          rel: REL_TYPES.INCLUDES_PERMISSION_SET,
          meta: JSON.stringify({ source: file, parser: 'permission-set-group', confidence: 'high' })
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

  private resolveGroupDir(rootPath: string): string {
    const candidates = ['permission-set-groups', 'permissionsetgroups'];
    for (const name of candidates) {
      const dirPath = path.join(rootPath, name);
      if (fs.existsSync(dirPath)) {
        return dirPath;
      }
    }
    return path.join(rootPath, candidates[0]);
  }

  private memberName(raw: unknown): string | undefined {
    if (typeof raw === 'string') {
      return this.asString(raw);
    }
    if (typeof raw === 'object' && raw !== null) {
      const cast = raw as Record<string, unknown>;
      return this.asString(cast.permissionSet) ?? this.asString(cast.fullName) ?? this.asString(cast.name);
    }
    return undefined;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  private toArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    return value ? [value as T] : [];
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
