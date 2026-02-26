import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES } from '@orggraph/ontology';
import { stableId } from '../../common/ids';
import type { GraphNode, GraphPayload } from '../graph/graph.types';
import { createParserStats, type ParserStats } from './parser-stats';

interface ParsedConnectedApp {
  ConnectedApp?: {
    fullName?: unknown;
    developerName?: unknown;
    masterLabel?: unknown;
  };
  ExternalClientApplication?: {
    fullName?: unknown;
    developerName?: unknown;
    masterLabel?: unknown;
  };
}

@Injectable()
export class ConnectedAppParserService {
  private lastStats: ParserStats = createParserStats('connected-app');

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true
  });

  parseFromFixtures(rootPath: string): GraphPayload {
    const nodesById = new Map<string, GraphNode>();
    this.lastStats = createParserStats('connected-app');

    const dirs = this.resolveDirs(rootPath);
    for (const dirPath of dirs) {
      if (!fs.existsSync(dirPath)) {
        continue;
      }

      const files = fs
        .readdirSync(dirPath)
        .filter((name) => name.endsWith('.connectedApp-meta.xml') || name.endsWith('.externalClientApplication-meta.xml'))
        .sort((a, b) => a.localeCompare(b));
      this.lastStats.filesDiscovered += files.length;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const parsed = this.parser.parse(fs.readFileSync(filePath, 'utf8')) as ParsedConnectedApp;
        const appName = this.resolveAppName(parsed, file);
        if (!appName) {
          this.lastStats.filesSkipped += 1;
          continue;
        }

        this.lastStats.filesParsed += 1;
        this.upsertNode(nodesById, {
          type: NODE_TYPES.CONNECTED_APP,
          name: appName,
          meta: JSON.stringify({ source: file, parser: 'connected-app' })
        });
      }
    }

    return {
      nodes: [...nodesById.values()].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)),
      edges: []
    };
  }

  getLastStats(): ParserStats {
    return this.lastStats;
  }

  private resolveDirs(rootPath: string): string[] {
    return [
      path.join(rootPath, 'connectedApps'),
      path.join(rootPath, 'connected-apps'),
      path.join(rootPath, 'externalClientApplications'),
      path.join(rootPath, 'external-client-apps')
    ];
  }

  private resolveAppName(parsed: ParsedConnectedApp, filename: string): string | undefined {
    const container = parsed.ConnectedApp ?? parsed.ExternalClientApplication;
    const fromMeta =
      this.asString(container?.fullName) ??
      this.asString(container?.developerName) ??
      this.asString(container?.masterLabel);
    if (fromMeta) {
      return fromMeta;
    }

    return filename
      .replace(/\.connectedApp-meta\.xml$/i, '')
      .replace(/\.externalClientApplication-meta\.xml$/i, '');
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
