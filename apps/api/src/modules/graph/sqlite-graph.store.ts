import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orgumented/ontology';
import { resolveDbPath } from '../../common/path';
import { AppConfigService } from '../../config/app-config.service';
import type { AutomationHit, GraphPayload, ImpactHit, PermPath } from './graph.types';
import type { GraphStore } from './graph-store';

export class SqliteGraphStore implements GraphStore {
  readonly backend = 'sqlite' as const;

  readonly storageRef: string;

  private readonly db: Database.Database;

  constructor(private readonly configService: AppConfigService) {
    this.storageRef = resolveDbPath(this.configService.databaseUrl());
    fs.mkdirSync(path.dirname(this.storageRef), { recursive: true });
    this.db = new Database(this.storageRef);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async getCounts(): Promise<{ nodeCount: number; edgeCount: number }> {
    const nodes = this.db.prepare('SELECT COUNT(*) as value FROM nodes').get() as { value: number };
    const edges = this.db.prepare('SELECT COUNT(*) as value FROM edges').get() as { value: number };
    return { nodeCount: nodes.value, edgeCount: edges.value };
  }

  async getLowConfidenceSummary(limit = 10): Promise<Array<{ source: string; count: number }>> {
    return this.db
      .prepare(
        `SELECT n.name as source, COUNT(*) as count
         FROM edges e
         JOIN nodes n ON n.id = e.src_id
         WHERE e.meta LIKE '%"confidence":"low"%'
         GROUP BY n.name
         ORDER BY count DESC, n.name ASC
         LIMIT ?`
      )
      .all(limit) as Array<{ source: string; count: number }>;
  }

  async fullRebuild(payload: GraphPayload): Promise<{ nodeCount: number; edgeCount: number }> {
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

  async findObjectPermPaths(principals: string[], objectName: string): Promise<PermPath[]> {
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

  async findFieldPermPaths(
    principals: string[],
    objectName: string,
    fieldName: string
  ): Promise<PermPath[]> {
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

  async findSystemPermissionPaths(
    principals: string[],
    permissionName: string
  ): Promise<PermPath[]> {
    if (principals.length === 0) {
      return [];
    }

    const permissionNode = this.findNode(NODE_TYPES.SYSTEM_PERMISSION, permissionName);
    if (!permissionNode) {
      return [];
    }

    const principalRows = this.findPrincipals(principals);
    if (principalRows.length === 0) {
      return [];
    }

    const paths: PermPath[] = [];
    for (const principal of principalRows) {
      if (!this.hasGrant(principal.id, permissionNode.id, REL_TYPES.GRANTS_SYSTEM_PERMISSION)) {
        continue;
      }
      paths.push({
        principal: principal.name,
        object: permissionNode.name,
        path: [
          {
            from: principal.name,
            rel: REL_TYPES.GRANTS_SYSTEM_PERMISSION,
            to: permissionNode.name
          }
        ]
      });
    }

    return paths.sort((a, b) => a.principal.localeCompare(b.principal));
  }

  async findAutomationsForObject(objectName: string): Promise<AutomationHit[]> {
    const objectNode = this.findNode(NODE_TYPES.OBJECT, objectName);
    if (!objectNode) {
      return [];
    }

    const rels = [
      REL_TYPES.TRIGGERS_ON,
      REL_TYPES.REFERENCES,
      REL_TYPES.QUERIES,
      REL_TYPES.WRITES
    ];
    const srcTypes = [NODE_TYPES.APEX_TRIGGER, NODE_TYPES.FLOW, NODE_TYPES.APEX_CLASS];

    const rows = this.db
      .prepare(
        `SELECT n.type as type, n.name as name, e.rel as rel, t.name as target, e.meta as meta
         FROM edges e
         JOIN nodes n ON e.src_id = n.id
         JOIN nodes t ON e.dst_id = t.id
         WHERE e.rel IN (${rels.map(() => '?').join(',')})
           AND e.dst_id = ?
           AND n.type IN (${srcTypes.map(() => '?').join(',')})
         ORDER BY e.rel ASC, n.name ASC`
      )
      .all(...rels, objectNode.id, ...srcTypes) as AutomationHit[];

    return rows;
  }

  async findImpactForField(fieldName: string): Promise<ImpactHit[]> {
    const rels = [REL_TYPES.REFERENCES, REL_TYPES.QUERIES, REL_TYPES.WRITES];
    const srcTypes = [NODE_TYPES.APEX_TRIGGER, NODE_TYPES.FLOW, NODE_TYPES.APEX_CLASS];
    const output = new Map<string, ImpactHit>();

    const fieldNode = this.findNode(NODE_TYPES.FIELD, fieldName);
    if (fieldNode) {
      const fieldRows = this.db
        .prepare(
          `SELECT n.type as type, n.name as name, e.rel as rel, t.name as target, e.meta as meta
           FROM edges e
           JOIN nodes n ON e.src_id = n.id
           JOIN nodes t ON e.dst_id = t.id
           WHERE e.rel IN (${rels.map(() => '?').join(',')})
             AND e.dst_id = ?
             AND n.type IN (${srcTypes.map(() => '?').join(',')})
           ORDER BY e.rel ASC, n.name ASC`
        )
        .all(...rels, fieldNode.id, ...srcTypes) as ImpactHit[];

      for (const row of fieldRows) {
        output.set(`${row.type}|${row.name}|${row.rel}|${row.target}`, row);
      }
    }

    const objectFromField = fieldName.split('.')[0];
    const objectNode = this.findNode(NODE_TYPES.OBJECT, objectFromField);
    if (objectNode) {
      const objectRows = this.db
        .prepare(
          `SELECT n.type as type, n.name as name, e.rel as rel, t.name as target, e.meta as meta
           FROM edges e
           JOIN nodes n ON e.src_id = n.id
           JOIN nodes t ON e.dst_id = t.id
           WHERE e.rel IN (${rels.map(() => '?').join(',')})
             AND e.dst_id = ?
             AND n.type IN (${srcTypes.map(() => '?').join(',')})
           ORDER BY e.rel ASC, n.name ASC`
        )
        .all(...rels, objectNode.id, ...srcTypes) as ImpactHit[];

      for (const row of objectRows) {
        output.set(`${row.type}|${row.name}|${row.rel}|${row.target}`, row);
      }
    }

    return [...output.values()].sort(
      (a, b) =>
        a.rel.localeCompare(b.rel) || a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
    );
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
