# Orgumented Phase 9 Task List (Postgres Migration + Reliability + Metadata Expansion)

Goal: migrate the graph backend from SQLite to Postgres with zero functional regressions, measurable performance gains, safe rollback, and expanded ontology/parser support for additional Salesforce metadata.

## Entry Criteria
- [x] Phase 8 quality gates passed (ontology constraints + parser precision + confidence consistency)
- [x] Baseline benchmarks captured on SQLite (ingest time, query latency, DB size)
- [x] Promotion safety flow validated in sandbox

## Exit Criteria
- [x] Postgres backend is default in non-local environments
- [x] `/perms`, `/automation`, `/impact`, and `/ask` parity validated against SQLite baseline
- [x] Refresh and query SLOs meet or exceed SQLite baseline on representative org snapshot
- [x] Rollback to SQLite remains documented and tested
- [x] Ontology supports additional metadata as first-class node/relationship types where needed
- [x] Parsers ingest selected additional metadata into deterministic graph payloads
- [x] Query behavior remains deterministic with expanded metadata coverage

## Scope
- Introduce Postgres graph backend behind existing graph service interface
- Preserve deterministic behavior and response shape compatibility
- Add migration, benchmark, and rollback tooling
- Keep LLM expansion minimal and optional
- Expand metadata/ontology coverage for richer org analysis:
  - `CustomObject` (object/field semantics)
  - `PermissionSetGroup`
  - `CustomPermission`
  - `ConnectedApp` (or equivalent external client app metadata)
  - Optional UI/automation metadata staging set: `ApexPage`, `LightningComponentBundle`, `AuraDefinitionBundle`, `QuickAction`, `Layout`

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

## 7. Ontology & Parser Expansion

- [x] Add new ontology node/relationship types for selected metadata expansion targets
- [x] Update ontology constraints for all new relationship patterns
- [x] Implement ingestion parsers for:
  - `CustomObject` (object/field metadata projection)
  - `PermissionSetGroup`
  - `CustomPermission`
  - `ConnectedApp` / external client app metadata
- [x] Add staged parsers (feature-flagged or gated) for:
  - `ApexPage`, `LightningComponentBundle`, `AuraDefinitionBundle`, `QuickAction`, `Layout`
- [x] Ensure confidence scoring + consistency checks apply to new parser outputs
- [x] Preserve deterministic node/edge ordering with expanded metadata set

## 8. Validation for Expanded Coverage

- [x] Add parser tests for each new metadata type
- [x] Add ontology constraint tests for new nodes/relationships
- [x] Add integration tests showing endpoint behavior with expanded graph coverage
- [x] Run sandbox retrieval + refresh + smoke queries and capture before/after result deltas
- [x] Confirm no regression in refresh runtime and query latency beyond agreed budget

## Completion Notes

- Parity covered by automated `backend-parity` integration test (`sqlite` vs `postgres` via `pg-mem`).
- Docker compose now defaults API service to Postgres backend.
- Migration and rollback procedures documented in `docs/runbooks/POSTGRES_MIGRATION.md`.
- Metadata expansion added for `CustomObject`, `PermissionSetGroup`, `CustomPermission`, `ConnectedApp`, plus gated staged UI parsers (`INGEST_UI_METADATA_ENABLED=true`) for `ApexPage`, `LightningComponentBundle`, `AuraDefinitionBundle`, `QuickAction`, and `Layout`.
- Validation coverage extended with dedicated parser tests and ontology constraint checks for new node/relationship patterns.
