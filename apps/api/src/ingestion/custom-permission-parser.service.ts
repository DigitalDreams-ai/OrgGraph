import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES } from '@orggraph/ontology';
import { stableId } from '../common/ids';
import type { GraphNode, GraphPayload } from '../graph/graph.types';
import { createParserStats, type ParserStats } from './parser-stats';

interface ParsedCustomPermission {
  CustomPermission?: {
    fullName?: unknown;
  };
}

@Injectable()
export class CustomPermissionParserService {
  private lastStats: ParserStats = createParserStats('custom-permission');

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true
  });

  parseFromFixtures(rootPath: string): GraphPayload {
    const nodesById = new Map<string, GraphNode>();
    this.lastStats = createParserStats('custom-permission');

    const dirPath = this.resolveDir(rootPath);
    if (!fs.existsSync(dirPath)) {
      return { nodes: [], edges: [] };
    }

    const files = fs.readdirSync(dirPath).filter((name) => name.endsWith('.customPermission-meta.xml'));
    this.lastStats.filesDiscovered += files.length;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const parsed = this.parser.parse(fs.readFileSync(filePath, 'utf8')) as ParsedCustomPermission;
      const permissionName =
        this.asString(parsed.CustomPermission?.fullName) ?? file.replace(/\.customPermission-meta\.xml$/i, '');
      if (!permissionName) {
        this.lastStats.filesSkipped += 1;
        continue;
      }

      this.lastStats.filesParsed += 1;
      this.upsertNode(nodesById, {
        type: NODE_TYPES.CUSTOM_PERMISSION,
        name: permissionName,
        meta: JSON.stringify({ source: file, parser: 'custom-permission' })
      });
    }

    return {
      nodes: [...nodesById.values()].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)),
      edges: []
    };
  }

  getLastStats(): ParserStats {
    return this.lastStats;
  }

  private resolveDir(rootPath: string): string {
    const candidates = ['custom-permissions', 'custompermissions'];
    for (const candidate of candidates) {
      const abs = path.join(rootPath, candidate);
      if (fs.existsSync(abs)) {
        return abs;
      }
    }
    return path.join(rootPath, candidates[0]);
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
}
