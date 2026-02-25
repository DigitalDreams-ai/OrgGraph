# OrgGraph Phase 9 Task List (Postgres Migration + Reliability)

Goal: migrate the graph backend from SQLite to Postgres with zero functional regressions, measurable performance gains, and safe rollback.

## Entry Criteria
- [ ] Phase 8 quality gates passed (ontology constraints + parser precision + confidence consistency)
- [ ] Baseline benchmarks captured on SQLite (ingest time, query latency, DB size)
- [ ] Promotion safety flow validated in sandbox

## Exit Criteria
- [ ] Postgres backend is default in non-local environments
- [ ] `/perms`, `/automation`, `/impact`, and `/ask` parity validated against SQLite baseline
- [ ] Refresh and query SLOs meet or exceed SQLite baseline on representative org snapshot
- [ ] Rollback to SQLite remains documented and tested

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

- [ ] Define Postgres schema equivalent to current `nodes`/`edges` model
- [ ] Add required indexes for primary query patterns (`dst+rel`, `src+rel`, `type+name`)
- [ ] Add migration scripts/versioning for schema lifecycle
- [ ] Validate ontology type/rel constraints at database layer where practical

## 2. Backend Implementation

- [ ] Add Postgres graph service implementation behind current service contract
- [ ] Keep SQLite implementation available as fallback backend
- [ ] Add config switch for backend selection (`GRAPH_BACKEND=sqlite|postgres`)
- [ ] Ensure all endpoints preserve response shape and semantics

## 3. Migration & Cutover

- [ ] Build one-shot export/import tool from SQLite -> Postgres
- [ ] Add clean rebuild path directly into Postgres from refresh pipeline
- [ ] Implement staged cutover playbook (sandbox -> pre-prod -> prod)
- [ ] Add rollback playbook and test restore procedure

## 4. Performance & Reliability

- [ ] Create benchmark suite for ingest + query latency + concurrency
- [ ] Compare SQLite vs Postgres on same org snapshot and publish results
- [ ] Tune connection pooling and statement patterns
- [ ] Add health/readiness checks for Postgres dependency and degraded mode handling

## 5. Testing & Validation

- [ ] Add backend parity integration tests for core endpoints
- [ ] Add regression tests for path ordering/determinism
- [ ] Add failure-path tests (DB unavailable, timeout, partial refresh failure)
- [ ] Run live sandbox smoke/regression with Postgres backend enabled

## 6. Operations & Observability

- [ ] Extend metrics with DB backend, query timings, and error rates
- [ ] Add dashboards/alerts for connection failures and latency regressions
- [ ] Define backup/retention strategy for Postgres volumes
- [ ] Document routine DB maintenance (vacuum/analyze equivalent tasks)

## 7. LLM Support (Optional, Controlled)

- [ ] Keep `/ask` deterministic core unchanged (planner -> graph -> evidence)
- [ ] Add optional LLM summarization layer behind feature flag (`ASK_LLM_ENABLED`)
- [ ] Require citation-preserving output and fallback to deterministic response on failure
- [ ] Measure answer quality impact before enabling by default

## Recommendation on LLM in Phase 9

- Include only **limited, feature-flagged LLM support** for response wording/summarization.
- Do **not** combine full LLM expansion with core Postgres migration in the same release train.
- If scope pressure appears, move Section 7 entirely to Phase 10.
