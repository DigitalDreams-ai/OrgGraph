# Postgres Migration Guide

## Purpose
Migrate Orgumented graph storage from SQLite to Postgres with parity validation and rollback safety.

## Backend Switch
- SQLite mode:
`GRAPH_BACKEND=sqlite`
`DATABASE_URL=file:./data/orgumented.db`
- Postgres mode:
`GRAPH_BACKEND=postgres`
`DATABASE_URL=postgres://orgumented:orgumented@localhost:5432/orgumented`

## Staged Cutover
1. Baseline snapshot in SQLite mode:
- `npm run phase7:snapshot`
- `npm run phase7:regression`
2. Build Postgres target and migrate data:
- `ORGUMENTED_POSTGRES_URL=postgres://... npm run phase9:migrate-sqlite-to-postgres`
3. Switch backend config to Postgres.
4. Run parity checks:
- `pnpm --filter api test`
- `npm run phase7:smoke-live`
- `npm run phase7:regression`
5. Capture benchmark:
- `npm run phase9:benchmark`

## Rollback
1. Switch config back to SQLite:
- `GRAPH_BACKEND=sqlite`
- `DATABASE_URL=file:./data/orgumented.db`
2. Restart stack:
- start the local runtime and ensure the target Postgres instance is reachable before cutover
3. Validate:
- `curl http://localhost:3100/ready`
- `npm run phase7:smoke-live`

## Backup / Retention
- Postgres storage is external to the standalone desktop app runtime; use your managed/local Postgres backup process
- Before major cutover, archive `data/postgres` and `data/orgumented.db`.
- Keep at least 7 daily restore points and 4 weekly snapshots.
- Use `npm run phase8:retention-prune` for regular cleanup of refresh artifacts.

## Maintenance
- Check DB readiness: `curl http://localhost:3100/ready`
- Run benchmark monthly: `npm run phase9:benchmark`
- Vacuum/analyze cadence:
  - `VACUUM (ANALYZE);` weekly for heavy churn periods
  - `ANALYZE;` after large refresh/import runs
