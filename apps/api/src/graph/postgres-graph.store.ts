import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { Pool, type QueryResult } from 'pg';
import { AppConfigService } from '../config/app-config.service';
import type { AutomationHit, GraphPayload, ImpactHit, PermPath } from './graph.types';
import type { GraphStore } from './graph-store';

type PgPoolLike = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>;
  end: () => Promise<void>;
};

export class PostgresGraphStore implements GraphStore {
  readonly backend = 'postgres' as const;

  readonly storageRef: string;

  private readonly pool: PgPoolLike;

  private initPromise: Promise<void> | undefined;

  constructor(private readonly configService: AppConfigService) {
    const dbUrl = this.configService.databaseUrl()?.trim();
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required when GRAPH_BACKEND=postgres');
    }
    this.storageRef = dbUrl;
    this.pool = this.createPool(dbUrl);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getCounts(): Promise<{ nodeCount: number; edgeCount: number }> {
    await this.ensureInit();
    const nodes = await this.pool.query('SELECT COUNT(*)::int as value FROM nodes');
    const edges = await this.pool.query('SELECT COUNT(*)::int as value FROM edges');
    return {
      nodeCount: Number(nodes.rows[0]?.value ?? 0),
      edgeCount: Number(edges.rows[0]?.value ?? 0)
    };
  }

  async getLowConfidenceSummary(limit = 10): Promise<Array<{ source: string; count: number }>> {
    await this.ensureInit();
    const result = await this.pool.query(
      `SELECT n.name as source, COUNT(*)::int as count
       FROM edges e
       JOIN nodes n ON n.id = e.src_id
       WHERE e.meta LIKE '%"confidence":"low"%'
       GROUP BY n.name
       ORDER BY count DESC, n.name ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows as Array<{ source: string; count: number }>;
  }

  async fullRebuild(payload: GraphPayload): Promise<{ nodeCount: number; edgeCount: number }> {
    await this.ensureInit();
    await this.pool.query('BEGIN');
    try {
      await this.pool.query('DELETE FROM edges');
      await this.pool.query('DELETE FROM nodes');

      const now = new Date().toISOString();
      for (const node of payload.nodes) {
        await this.pool.query(
          `INSERT INTO nodes (id, type, name, meta, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [node.id, node.type, node.name, node.meta ?? null, now]
        );
      }

      for (const edge of payload.edges) {
        await this.pool.query(
          `INSERT INTO edges (id, src_id, dst_id, rel, meta, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [edge.id, edge.srcId, edge.dstId, edge.rel, edge.meta ?? null, now]
        );
      }
      await this.pool.query('COMMIT');
    } catch (error) {
      await this.pool.query('ROLLBACK');
      throw error;
    }

    return { nodeCount: payload.nodes.length, edgeCount: payload.edges.length };
  }

  async findObjectPermPaths(principals: string[], objectName: string): Promise<PermPath[]> {
    await this.ensureInit();
    if (principals.length === 0) {
      return [];
    }
    const principalPlaceholders = principals.map((_, idx) => `$${idx + 6}`).join(', ');
    const result = await this.pool.query(
      `SELECT p.name as principal, o.name as object_name
       FROM nodes p
       JOIN edges e ON e.src_id = p.id AND e.rel = $1
       JOIN nodes o ON o.id = e.dst_id
       WHERE o.type = $2
         AND o.name = $3
         AND (p.type = $4 OR p.type = $5)
         AND p.name IN (${principalPlaceholders})
       ORDER BY p.name ASC`,
      [
        REL_TYPES.GRANTS_OBJECT,
        NODE_TYPES.OBJECT,
        objectName,
        NODE_TYPES.PROFILE,
        NODE_TYPES.PERMISSION_SET,
        ...principals
      ]
    );

    return result.rows.map((row) => ({
      principal: row.principal as string,
      object: row.object_name as string,
      path: [
        {
          from: row.principal as string,
          rel: REL_TYPES.GRANTS_OBJECT,
          to: row.object_name as string
        }
      ]
    }));
  }

  async findFieldPermPaths(
    principals: string[],
    objectName: string,
    fieldName: string
  ): Promise<PermPath[]> {
    await this.ensureInit();
    if (principals.length === 0) {
      return [];
    }
    const principalPlaceholders = principals.map((_, idx) => `$${idx + 7}`).join(', ');
    const result = await this.pool.query(
      `SELECT p.name as principal, o.name as object_name, f.name as field_name
       FROM nodes p
       JOIN nodes o ON o.type = $1 AND o.name = $2
       JOIN nodes f ON f.type = $3 AND f.name = $4
       WHERE (p.type = $5 OR p.type = $6)
         AND p.name IN (${principalPlaceholders})
         AND EXISTS (
           SELECT 1 FROM edges eo
           WHERE eo.src_id = p.id AND eo.dst_id = o.id AND eo.rel = $${principals.length + 7}
         )
         AND EXISTS (
           SELECT 1 FROM edges ef
           WHERE ef.src_id = p.id AND ef.dst_id = f.id AND ef.rel = $${principals.length + 8}
         )
       ORDER BY p.name ASC`,
      [
        NODE_TYPES.OBJECT,
        objectName,
        NODE_TYPES.FIELD,
        fieldName,
        NODE_TYPES.PROFILE,
        NODE_TYPES.PERMISSION_SET,
        ...principals,
        REL_TYPES.GRANTS_OBJECT,
        REL_TYPES.GRANTS_FIELD
      ]
    );

    return result.rows.map((row) => ({
      principal: row.principal as string,
      object: row.object_name as string,
      path: [
        {
          from: row.principal as string,
          rel: REL_TYPES.GRANTS_OBJECT,
          to: row.object_name as string
        },
        {
          from: row.principal as string,
          rel: REL_TYPES.GRANTS_FIELD,
          to: row.field_name as string
        }
      ]
    }));
  }

  async findAutomationsForObject(objectName: string): Promise<AutomationHit[]> {
    await this.ensureInit();
    const result = await this.pool.query(
      `SELECT n.type as type, n.name as name, e.rel as rel, t.name as target, e.meta as meta
       FROM edges e
       JOIN nodes n ON e.src_id = n.id
       JOIN nodes t ON e.dst_id = t.id
       WHERE e.rel = ANY($1::text[])
         AND n.type = ANY($2::text[])
         AND t.type = $3
         AND t.name = $4
       ORDER BY e.rel ASC, n.name ASC`,
      [
        [REL_TYPES.TRIGGERS_ON, REL_TYPES.REFERENCES, REL_TYPES.QUERIES, REL_TYPES.WRITES],
        [NODE_TYPES.APEX_TRIGGER, NODE_TYPES.FLOW, NODE_TYPES.APEX_CLASS],
        NODE_TYPES.OBJECT,
        objectName
      ]
    );
    return result.rows as AutomationHit[];
  }

  async findImpactForField(fieldName: string): Promise<ImpactHit[]> {
    await this.ensureInit();
    const rels = [REL_TYPES.REFERENCES, REL_TYPES.QUERIES, REL_TYPES.WRITES];
    const srcTypes = [NODE_TYPES.APEX_TRIGGER, NODE_TYPES.FLOW, NODE_TYPES.APEX_CLASS];
    const output = new Map<string, ImpactHit>();

    const fieldRows = await this.pool.query(
      `SELECT n.type as type, n.name as name, e.rel as rel, t.name as target, e.meta as meta
       FROM edges e
       JOIN nodes n ON e.src_id = n.id
       JOIN nodes t ON e.dst_id = t.id
       WHERE e.rel = ANY($1::text[])
         AND n.type = ANY($2::text[])
         AND t.type = $3
         AND t.name = $4
       ORDER BY e.rel ASC, n.name ASC`,
      [rels, srcTypes, NODE_TYPES.FIELD, fieldName]
    );
    for (const row of fieldRows.rows as ImpactHit[]) {
      output.set(`${row.type}|${row.name}|${row.rel}|${row.target}`, row);
    }

    const objectName = fieldName.split('.')[0];
    const objectRows = await this.pool.query(
      `SELECT n.type as type, n.name as name, e.rel as rel, t.name as target, e.meta as meta
       FROM edges e
       JOIN nodes n ON e.src_id = n.id
       JOIN nodes t ON e.dst_id = t.id
       WHERE e.rel = ANY($1::text[])
         AND n.type = ANY($2::text[])
         AND t.type = $3
         AND t.name = $4
       ORDER BY e.rel ASC, n.name ASC`,
      [rels, srcTypes, NODE_TYPES.OBJECT, objectName]
    );
    for (const row of objectRows.rows as ImpactHit[]) {
      output.set(`${row.type}|${row.name}|${row.rel}|${row.target}`, row);
    }

    return [...output.values()].sort(
      (a, b) =>
        a.rel.localeCompare(b.rel) || a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
    );
  }

  private async ensureInit(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initSchema();
    }
    await this.initPromise;
  }

  private createPool(databaseUrl: string): PgPoolLike {
    if (databaseUrl.startsWith('pgmem:')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { newDb } = require('pg-mem');
      const db = newDb();
      const adapter = db.adapters.createPg();
      return new adapter.Pool();
    }

    return new Pool({
      connectionString: databaseUrl
    });
  }

  private async initSchema(): Promise<void> {
    await this.pool.query(`
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
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
      CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);
      CREATE INDEX IF NOT EXISTS idx_edges_src_rel ON edges(src_id, rel);
      CREATE INDEX IF NOT EXISTS idx_edges_dst_rel ON edges(dst_id, rel);
    `);
  }
}
