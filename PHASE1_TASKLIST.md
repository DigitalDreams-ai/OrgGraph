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

- [ ] Confirm runtime versions on NAS:
  - [ ] `node -v` (target Node 20+)
  - [ ] `pnpm -v` (target pnpm 9+)
  - [ ] `docker --version`
  - [ ] `docker compose version`
- [ ] Decide canonical repo path naming (`OrgGraph` vs `orggraph`) and standardize docs/scripts.
- [ ] Add `.nvmrc` and root `packageManager` field in `package.json`.

## 2. Monorepo Bootstrap

- [ ] Create workspace files:
  - [ ] root `package.json`
  - [ ] `pnpm-workspace.yaml`
  - [ ] `.editorconfig`
  - [ ] `.env.example`
- [ ] Create app/package structure:
  - [ ] `apps/api` (NestJS)
  - [ ] `packages/ontology` (shared constants/types)
  - [ ] `fixtures/permissions/{profiles,permission-sets}`
- [ ] Add scripts:
  - [ ] root: `build`, `test`, `lint`, `dev`, `typecheck`
  - [ ] api: `start:dev`, `test`, `test:validation`

## 3. Ontology Package (`packages/ontology`)

- [ ] Add `node-types.ts` with enum/const for phase-1 node types.
- [ ] Add `rel-types.ts` with enum/const for phase-1 relationship types.
- [ ] Export from `src/index.ts`.
- [ ] Add unit test to guard accidental type drift.

## 4. API Skeleton (`apps/api`)

- [ ] Initialize NestJS app and module boundaries:
  - [ ] `graph` (nodes/edges persistence + traversal)
  - [ ] `ingestion` (metadata parsing)
  - [ ] `queries` (`/perms`)
- [ ] Add config module for env loading and DB path.
- [ ] Add health endpoint (`GET /health`) for smoke checks.

## 5. Persistence Layer (SQLite)

- [ ] Create schema for `nodes` and `edges` tables.
- [ ] Add indices for traversal (`src_id,rel` and `dst_id,rel`).
- [ ] Implement full-rebuild transaction flow:
  - [ ] truncate/drop existing graph state
  - [ ] upsert all parsed nodes/edges
- [ ] Ensure deterministic IDs and unique constraints prevent duplicates.

## 6. Permissions Parser

- [ ] Parse Profile XML:
  - [ ] object permissions -> `GRANTS_OBJECT`
  - [ ] field permissions -> `GRANTS_FIELD`
- [ ] Parse Permission Set XML with same mapping.
- [ ] Normalize names (`Object.Field` canonicalization).
- [ ] Emit parser output contract: `{ nodes[], edges[] }`.
- [ ] Add robust handling for missing/partial XML elements.

## 7. Refresh Endpoint (`POST /refresh`)

- [ ] Implement full refresh pipeline:
  - [ ] load metadata files (fixtures first)
  - [ ] parse into graph payload
  - [ ] write graph inside single transaction
- [ ] Return refresh summary:
  - [ ] node count
  - [ ] edge count
  - [ ] elapsed time
  - [ ] source path

## 8. Permissions Query Endpoint (`GET /perms`)

- [ ] Request params: `user`, `object` (Phase 1 may map user->profile statically).
- [ ] Implement graph traversal path logic:
  - [ ] find matching grants from Profile/PermSet to target object/fields
  - [ ] return deterministic explanation path(s)
  - [ ] explicit "no path found" result shape
- [ ] Response includes machine-readable path and concise explanation text.

## 9. Validation + Tests

- [ ] Add minimal fixture metadata under `fixtures/permissions`.
- [ ] Add validation test:
  - [ ] run parser on fixtures
  - [ ] assert expected nodes/edges exist
  - [ ] assert one negative case (no unintended grant)
- [ ] Add API integration tests for `/refresh` and `/perms`.

## 10. Docker (NAS)

- [ ] Add `docker/Dockerfile` for API.
- [ ] Add `docker/docker-compose.yml` with project name `OrgGraphServices`.
- [ ] Mount persistent volume for SQLite DB file.
- [ ] Validate startup and endpoint reachability on NAS.

## Definition of Done (Phase 1)

- [ ] `pnpm --filter api test:validation` passes.
- [ ] `POST /refresh` ingests fixture and reports counts.
- [ ] `GET /perms` returns deterministic path for known case.
- [ ] Docker compose runs successfully on Synology under `OrgGraphServices`.
- [ ] README updated with exact Phase 1 run commands.

## Immediate Next Action

- [ ] Bootstrap monorepo skeleton (Section 2) and commit as `chore: scaffold phase1 monorepo`.
