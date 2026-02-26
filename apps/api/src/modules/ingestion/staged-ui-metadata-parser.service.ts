import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { stableId } from '../../common/ids';
import type { GraphEdge, GraphNode, GraphPayload } from '../graph/graph.types';
import { createParserStats, type ParserStats } from './parser-stats';

interface UiTargetConfig {
  parser: string;
  type: GraphNode['type'];
  mode: 'file' | 'bundle';
  dirs: string[];
  extensions?: string[];
  strip?: RegExp;
}

@Injectable()
export class StagedUiMetadataParserService {
  private lastStats: ParserStats = createParserStats('ui-metadata');

  private readonly configs: UiTargetConfig[] = [
    {
      parser: 'ui-apex-page',
      type: NODE_TYPES.APEX_PAGE,
      mode: 'file',
      dirs: ['pages'],
      extensions: ['.page', '.page-meta.xml'],
      strip: /\.(page-meta\.xml|page)$/i
    },
    {
      parser: 'ui-lwc',
      type: NODE_TYPES.LIGHTNING_COMPONENT_BUNDLE,
      mode: 'bundle',
      dirs: ['lwc']
    },
    {
      parser: 'ui-aura',
      type: NODE_TYPES.AURA_DEFINITION_BUNDLE,
      mode: 'bundle',
      dirs: ['aura']
    },
    {
      parser: 'ui-quick-action',
      type: NODE_TYPES.QUICK_ACTION,
      mode: 'file',
      dirs: ['quickActions', 'quick-actions'],
      extensions: ['.quickAction-meta.xml'],
      strip: /\.quickAction-meta\.xml$/i
    },
    {
      parser: 'ui-layout',
      type: NODE_TYPES.LAYOUT,
      mode: 'file',
      dirs: ['layouts'],
      extensions: ['.layout-meta.xml'],
      strip: /\.layout-meta\.xml$/i
    }
  ];

  parseFromFixtures(rootPath: string): GraphPayload {
    const nodesById = new Map<string, GraphNode>();
    const edgesById = new Map<string, GraphEdge>();
    this.lastStats = createParserStats('ui-metadata');

    for (const config of this.configs) {
      for (const dirName of config.dirs) {
        const dirPath = path.join(rootPath, dirName);
        if (!fs.existsSync(dirPath)) {
          continue;
        }

        if (config.mode === 'bundle') {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
          this.lastStats.filesDiscovered += entries.length;
          for (const entry of entries) {
            if (!entry.isDirectory()) {
              this.lastStats.filesSkipped += 1;
              continue;
            }
            this.lastStats.filesParsed += 1;
            this.upsertNode(nodesById, {
              type: config.type,
              name: entry.name,
              meta: JSON.stringify({ source: `${dirName}/${entry.name}`, parser: config.parser })
            });
          }
          continue;
        }

        const files = fs
          .readdirSync(dirPath)
          .filter((name) => (config.extensions ?? []).some((ext) => name.endsWith(ext)))
          .sort((a, b) => a.localeCompare(b));
        this.lastStats.filesDiscovered += files.length;

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const raw = fs.readFileSync(filePath, 'utf8');
          const name = file.replace(config.strip ?? /\.xml$/i, '');
          if (!name) {
            this.lastStats.filesSkipped += 1;
            continue;
          }

          this.lastStats.filesParsed += 1;
          const src = this.upsertNode(nodesById, {
            type: config.type,
            name,
            meta: JSON.stringify({ source: `${dirName}/${file}`, parser: config.parser })
          });

          for (const objectName of this.extractObjects(raw)) {
            const objectNode = this.upsertNode(nodesById, {
              type: NODE_TYPES.OBJECT,
              name: objectName
            });
            this.upsertEdge(edgesById, {
              srcId: src.id,
              dstId: objectNode.id,
              rel: REL_TYPES.REFERENCES,
              meta: JSON.stringify({ source: `${dirName}/${file}`, parser: config.parser, confidence: 'low' })
            });
          }

          for (const fieldName of this.extractFields(raw)) {
            const fieldNode = this.upsertNode(nodesById, {
              type: NODE_TYPES.FIELD,
              name: fieldName
            });
            this.upsertEdge(edgesById, {
              srcId: src.id,
              dstId: fieldNode.id,
              rel: REL_TYPES.REFERENCES,
              meta: JSON.stringify({ source: `${dirName}/${file}`, parser: config.parser, confidence: 'low' })
            });
          }
        }
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

  private extractObjects(raw: string): string[] {
    const allow = new Set<string>();
    const tagged = raw.matchAll(
      /<(object|targetObject|sobjectType)>\s*([A-Za-z_][A-Za-z0-9_]*(__c)?)\s*<\/\1>/g
    );
    for (const match of tagged) {
      allow.add(match[2]);
    }

    const fieldTokens = raw.match(
      /\b([A-Za-z_][A-Za-z0-9_]*(__c)?\.[A-Za-z_][A-Za-z0-9_]*(__c)?)\b/g
    ) ?? [];
    for (const token of fieldTokens) {
      allow.add(token.split('.')[0]);
    }
    return [...allow].sort((a, b) => a.localeCompare(b));
  }

  private extractFields(raw: string): string[] {
    const matches = raw.match(/\b([A-Za-z_][A-Za-z0-9_]*(__c)?\.[A-Za-z_][A-Za-z0-9_]*(__c)?)\b/g) ?? [];
    return [...new Set(matches)].sort((a, b) => a.localeCompare(b));
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
