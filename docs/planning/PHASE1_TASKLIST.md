# OrgGraph Phase 1 Task List (Execution Order)

Goal: deliver a deterministic permissions graph PoC that answers:
"Why can't user X edit Object Y?"

Scope lock (Phase 1 only):
- Node types: `Object`, `Field`, `Profile`, `PermissionSet`
- Relationship types: `GRANTS_OBJECT`, `GRANTS_FIELD`
- Inputs: Profile + Permission Set metadata
- DB: SQLite
- Interface: API only (`POST /refresh`, `GET /perms`)
- Refresh mode: full rebuild only

## 1. Environment Baseline

- [x] Confirm runtime versions on NAS:
  - [x] `node -v` (target Node 20+)
  - [x] `pnpm -v` (target pnpm 9+) - available via `npm exec --yes pnpm@9.12.3 -- ...`
  - [x] `docker --version`
  - [x] `docker compose version`
- [x] Decide canonical repo path naming (`OrgGraph` vs `orggraph`) and standardize docs/scripts.
- [x] Add `.nvmrc` and root `packageManager` field in `package.json`.

## 2. Monorepo Bootstrap

- [x] Create workspace files:
  - [x] root `package.json`
  - [x] `pnpm-workspace.yaml`
  - [x] `.editorconfig`
  - [x] `.env.example`
- [x] Create app/package structure:
  - [x] `apps/api` (NestJS)
  - [x] `packages/ontology` (shared constants/types)
  - [x] `fixtures/permissions/{profiles,permission-sets}`
- [x] Add scripts:
  - [x] root: `build`, `test`, `lint`, `dev`, `typecheck`
  - [x] api: `start:dev`, `test`, `test:validation`

## 3. Ontology Package (`packages/ontology`)

- [x] Add `node-types.ts` with enum/const for phase-1 node types.
- [x] Add `rel-types.ts` with enum/const for phase-1 relationship types.
- [x] Export from `src/index.ts`.
- [x] Add unit test to guard accidental type drift.

## 4. API Skeleton (`apps/api`)

- [x] Initialize NestJS app and module boundaries:
  - [x] `graph` (nodes/edges persistence + traversal)
  - [x] `ingestion` (metadata parsing)
  - [x] `queries` (`/perms`)
- [x] Add config module for env loading and DB path.
- [x] Add health endpoint (`GET /health`) for smoke checks.

## 5. Persistence Layer (SQLite)

- [x] Create schema for `nodes` and `edges` tables.
- [x] Add indices for traversal (`src_id,rel` and `dst_id,rel`).
- [x] Implement full-rebuild transaction flow:
  - [x] truncate/drop existing graph state
  - [x] upsert all parsed nodes/edges
- [x] Ensure deterministic IDs and unique constraints prevent duplicates.

## 6. Permissions Parser

- [x] Parse Profile XML:
  - [x] object permissions -> `GRANTS_OBJECT`
  - [x] field permissions -> `GRANTS_FIELD`
- [x] Parse Permission Set XML with same mapping.
- [x] Normalize names (`Object.Field` canonicalization).
- [x] Emit parser output contract: `{ nodes[], edges[] }`.
- [x] Add robust handling for missing/partial XML elements.

## 7. Refresh Endpoint (`POST /refresh`)

- [x] Implement full refresh pipeline:
  - [x] load metadata files (fixtures first)
  - [x] parse into graph payload
  - [x] write graph inside single transaction
- [x] Return refresh summary:
  - [x] node count
  - [x] edge count
  - [x] elapsed time
  - [x] source path

## 8. Permissions Query Endpoint (`GET /perms`)

- [x] Request params: `user`, `object`.
- [x] Implement graph traversal path logic:
  - [x] find matching grants from Profile/PermSet to target object/fields
  - [x] return deterministic explanation path(s)
  - [x] explicit "no path found" result shape
- [x] Response includes machine-readable path and concise explanation text.
- [x] Extended: optional `field` param with object-vs-field grant reasoning.

## 9. Validation + Tests

- [x] Add minimal fixture metadata under `fixtures/permissions`.
- [x] Add validation test:
  - [x] run parser on fixtures
  - [x] assert expected nodes/edges exist
  - [x] assert one negative case (no unintended grant)
- [x] Add API integration tests for `/refresh` and `/perms`.

## 10. Docker (NAS)

- [x] Add `docker/Dockerfile` for API.
- [x] Add `docker/docker-compose.yml`.
- [x] Mount persistent volume for SQLite DB file.
- [x] Validate startup and endpoint reachability on NAS.

## Definition of Done (Phase 1)

- [x] `pnpm --filter api test:validation` passes.
- [x] `POST /refresh` ingests fixture and reports counts.
- [x] `GET /perms` returns deterministic path for known case.
- [x] Docker compose runs successfully on Synology under project `orggraph`.
- [x] README updated with exact Phase 1 run commands.

## Status

- [x] **Phase 1 complete**
- [x] Phase 2 work moved to branch `phase2`
