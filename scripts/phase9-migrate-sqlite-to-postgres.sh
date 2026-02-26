#!/bin/sh
set -eu

ROOT="${ORGUMENTED_ROOT:-$(pwd)}"
SQLITE_PATH="${ORGUMENTED_SQLITE_PATH:-$ROOT/data/orgumented.db}"
POSTGRES_URL="${ORGUMENTED_POSTGRES_URL:-${DATABASE_URL:-}}"

if [ "$POSTGRES_URL" = "" ]; then
  echo "ORGUMENTED_POSTGRES_URL or DATABASE_URL must be set"
  exit 1
fi

node - <<'NODE' "$SQLITE_PATH" "$POSTGRES_URL"
const Database = require('better-sqlite3');
const { Pool } = require('pg');

const [sqlitePath, postgresUrl] = process.argv.slice(2);
const sqlite = new Database(sqlitePath, { readonly: true });
const pool = new Pool({ connectionString: postgresUrl });

async function run() {
  const nodes = sqlite.prepare('SELECT id, type, name, meta, created_at FROM nodes ORDER BY id').all();
  const edges = sqlite.prepare('SELECT id, src_id, dst_id, rel, meta, created_at FROM edges ORDER BY id').all();

  await pool.query('BEGIN');
  try {
    await pool.query(`
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

    await pool.query('DELETE FROM edges');
    await pool.query('DELETE FROM nodes');

    for (const node of nodes) {
      await pool.query(
        `INSERT INTO nodes (id, type, name, meta, created_at) VALUES ($1,$2,$3,$4,$5)`,
        [node.id, node.type, node.name, node.meta, node.created_at]
      );
    }
    for (const edge of edges) {
      await pool.query(
        `INSERT INTO edges (id, src_id, dst_id, rel, meta, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [edge.id, edge.src_id, edge.dst_id, edge.rel, edge.meta, edge.created_at]
      );
    }

    await pool.query('COMMIT');
    console.log(
      JSON.stringify(
        {
          status: 'ok',
          sqlitePath,
          postgresUrl,
          nodeCount: nodes.length,
          edgeCount: edges.length
        },
        null,
        2
      )
    );
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
    sqlite.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE

