import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { resolveDbPath } from '../common/path';
import { AppConfigService } from '../config/app-config.service';
import type { GraphPayload, PermPath } from './graph.types';

@Injectable()
export class GraphService implements OnModuleDestroy {
  private readonly dbPath: string;

  private readonly db: Database.Database;

  constructor(private readonly configService: AppConfigService) {
    this.dbPath = resolveDbPath(this.configService.databaseUrl());
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  onModuleDestroy(): void {
    this.db.close();
  }

  getDatabasePath(): string {
    return this.dbPath;
  }

  fullRebuild(payload: GraphPayload): { nodeCount: number; edgeCount: number } {
    const insertNode = this.db.prepare(
      `INSERT INTO nodes (id, type, name, meta, created_at)
       VALUES (@id, @type, @name, @meta, @createdAt)`
    );
    const insertEdge = this.db.prepare(
      `INSERT INTO edges (id, src_id, dst_id, rel, meta, created_at)
       VALUES (@id, @srcId, @dstId, @rel, @meta, @createdAt)`
    );

    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      this.db.exec('DELETE FROM edges; DELETE FROM nodes;');

      for (const node of payload.nodes) {
        insertNode.run({ ...node, meta: node.meta ?? null, createdAt: now });
      }

      for (const edge of payload.edges) {
        insertEdge.run({ ...edge, meta: edge.meta ?? null, createdAt: now });
      }
    });

    tx();

    return { nodeCount: payload.nodes.length, edgeCount: payload.edges.length };
  }

  findObjectPermPaths(principals: string[], objectName: string): PermPath[] {
    if (principals.length === 0) {
      return [];
    }

    const objectNode = this.findNode(NODE_TYPES.OBJECT, objectName);

    if (!objectNode) {
      return [];
    }

    const principalRows = this.findPrincipals(principals);

    if (principalRows.length === 0) {
      return [];
    }
    const paths: PermPath[] = [];

    for (const principal of principalRows) {
      if (!this.hasGrant(principal.id, objectNode.id, REL_TYPES.GRANTS_OBJECT)) {
        continue;
      }

      paths.push({
        principal: principal.name,
        object: objectNode.name,
        path: [
          {
            from: principal.name,
            rel: REL_TYPES.GRANTS_OBJECT,
            to: objectNode.name
          }
        ]
      });
    }

    return paths.sort((a, b) => a.principal.localeCompare(b.principal));
  }

  findFieldPermPaths(principals: string[], objectName: string, fieldName: string): PermPath[] {
    if (principals.length === 0) {
      return [];
    }

    const objectNode = this.findNode(NODE_TYPES.OBJECT, objectName);
    const fieldNode = this.findNode(NODE_TYPES.FIELD, fieldName);

    if (!objectNode || !fieldNode) {
      return [];
    }

    const principalRows = this.findPrincipals(principals);
    if (principalRows.length === 0) {
      return [];
    }

    const paths: PermPath[] = [];

    for (const principal of principalRows) {
      const objectGrant = this.hasGrant(principal.id, objectNode.id, REL_TYPES.GRANTS_OBJECT);
      const fieldGrant = this.hasGrant(principal.id, fieldNode.id, REL_TYPES.GRANTS_FIELD);
      if (!objectGrant || !fieldGrant) {
        continue;
      }

      paths.push({
        principal: principal.name,
        object: objectNode.name,
        path: [
          {
            from: principal.name,
            rel: REL_TYPES.GRANTS_OBJECT,
            to: objectNode.name
          },
          {
            from: principal.name,
            rel: REL_TYPES.GRANTS_FIELD,
            to: fieldNode.name
          }
        ]
      });
    }

    return paths.sort((a, b) => a.principal.localeCompare(b.principal));
  }

  private findNode(type: string, name: string): { id: string; name: string } | undefined {
    return this.db
      .prepare('SELECT id, name FROM nodes WHERE type = ? AND name = ? LIMIT 1')
      .get(type, name) as { id: string; name: string } | undefined;
  }

  private findPrincipals(principals: string[]): Array<{ id: string; name: string }> {
    return this.db
      .prepare(
        `SELECT id, name FROM nodes
         WHERE (type = ? OR type = ?) AND name IN (${principals.map(() => '?').join(',')})`
      )
      .all(NODE_TYPES.PROFILE, NODE_TYPES.PERMISSION_SET, ...principals) as Array<{
      id: string;
      name: string;
    }>;
  }

  private hasGrant(srcId: string, dstId: string, rel: string): boolean {
    const grant = this.db
      .prepare('SELECT 1 FROM edges WHERE src_id = ? AND dst_id = ? AND rel = ? LIMIT 1')
      .get(srcId, dstId, rel);
    return Boolean(grant);
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        meta TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        src_id TEXT NOT NULL,
        dst_id TEXT NOT NULL,
        rel TEXT NOT NULL,
        meta TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(src_id) REFERENCES nodes(id),
        FOREIGN KEY(dst_id) REFERENCES nodes(id)
      );

      CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
      CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);
      CREATE INDEX IF NOT EXISTS idx_edges_src_rel ON edges(src_id, rel);
      CREATE INDEX IF NOT EXISTS idx_edges_dst_rel ON edges(dst_id, rel);
    `);
  }
}
