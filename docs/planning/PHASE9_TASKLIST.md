# OrgGraph Phase 9 Task List (Postgres Migration + Reliability)

Goal: migrate the graph backend from SQLite to Postgres with zero functional regressions, measurable performance gains, and safe rollback.

## Entry Criteria
- [x] Phase 8 quality gates passed (ontology constraints + parser precision + confidence consistency)
- [x] Baseline benchmarks captured on SQLite (ingest time, query latency, DB size)
- [x] Promotion safety flow validated in sandbox

## Exit Criteria
- [x] Postgres backend is default in non-local environments
- [x] `/perms`, `/automation`, `/impact`, and `/ask` parity validated against SQLite baseline
- [x] Refresh and query SLOs meet or exceed SQLite baseline on representative org snapshot
- [x] Rollback to SQLite remains documented and tested

## Scope
- Introduce Postgres graph backend behind existing graph service interface
- Preserve deterministic behavior and response shape compatibility
- Add migration, benchmark, and rollback tooling
- Keep LLM expansion minimal and optional

## Not In Phase 9
- Chroma/vector store rollout by default
- Major planner/agent redesign
- Full natural-language feature expansion beyond reliability support

## 1. Architecture & Data Model

- [x] Define Postgres schema equivalent to current `nodes`/`edges` model
- [x] Add required indexes for primary query patterns (`dst+rel`, `src+rel`, `type+name`)
- [x] Add migration scripts/versioning for schema lifecycle
- [x] Validate ontology type/rel constraints at database layer where practical

## 2. Backend Implementation

- [x] Add Postgres graph service implementation behind current service contract
- [x] Keep SQLite implementation available as fallback backend
- [x] Add config switch for backend selection (`GRAPH_BACKEND=sqlite|postgres`)
- [x] Ensure all endpoints preserve response shape and semantics

## 3. Migration & Cutover

- [x] Build one-shot export/import tool from SQLite -> Postgres
- [x] Add clean rebuild path directly into Postgres from refresh pipeline
- [x] Implement staged cutover playbook (sandbox -> pre-prod -> prod)
- [x] Add rollback playbook and test restore procedure

## 4. Performance & Reliability

- [x] Create benchmark suite for ingest + query latency + concurrency
- [x] Compare SQLite vs Postgres on same org snapshot and publish results
- [x] Tune connection pooling and statement patterns
- [x] Add health/readiness checks for Postgres dependency and degraded mode handling

## 5. Testing & Validation

- [x] Add backend parity integration tests for core endpoints
- [x] Add regression tests for path ordering/determinism
- [x] Add failure-path tests (DB unavailable, timeout, partial refresh failure)
- [x] Run live sandbox smoke/regression with Postgres backend enabled

## 6. Operations & Observability

- [x] Extend metrics with DB backend, query timings, and error rates
- [x] Add dashboards/alerts for connection failures and latency regressions
- [x] Define backup/retention strategy for Postgres volumes
- [x] Document routine DB maintenance (vacuum/analyze equivalent tasks)

## Completion Notes

- Parity covered by automated `backend-parity` integration test (`sqlite` vs `postgres` via `pg-mem`).
- Docker compose now defaults API service to Postgres backend.
- Migration and rollback procedures documented in `POSTGRES_MIGRATION.md`.
