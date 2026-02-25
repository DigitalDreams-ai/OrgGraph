# OrgGraph Phase 8 Task List (Ontology + Precision + Consistency)

Goal: strengthen reasoning quality by improving ontology constraints, parser precision, and confidence/consistency controls before introducing heavier retrieval infrastructure.

## Entry Criteria
- [x] Phase 7 merged to `main` with live-org smoke/regression checks passing
- [x] Sandbox retrieve + refresh workflow operational
- [x] Baseline known-query snapshots available for comparison

## Exit Criteria
- [x] Ontology constraints validated in refresh and reported per ingest
- [x] Parser precision and confidence materially improved on sampled live-org cases
- [x] `/impact` and `/ask` consistency checks pass for approved validation set
- [x] Promotion safety flow (dry-run + snapshot/restore + log) documented and usable

## Scope
- Richer ontology constraints and explicit reasoning invariants
- Parser precision upgrades for lower false-positive impact paths
- Stricter confidence thresholds and cross-endpoint consistency checks
- Operational monitoring and release discipline
- Retrieval/storage expansion only after quality gates are met

## 1. Ontology Constraint Expansion

- [x] Define and encode domain invariants (object/field ownership, grant preconditions)
- [x] Add explicit relationship constraints (allowed source/target type matrix)
- [x] Add constraint validation pass during refresh (fail or warn on violations)
- [x] Add ontology integrity report endpoint/artifact per ingest

## 2. Parser Precision Upgrades

- [x] Improve Apex DML object inference (variable lineage + constructor tracking)
- [x] Improve Flow reference extraction (XML node-aware extraction, fewer generic dotted tokens)
- [x] Add confidence calibration tests over known-good org examples
- [x] Add parser warning taxonomy (`noise`, `ambiguous`, `unsupported`)
- [x] Add parser precision regression suite using sandbox-derived fixtures

## 3. Confidence & Consistency Controls

- [x] Add endpoint-level min-confidence defaults for `/automation`, `/impact`, and `/ask`
- [x] Add optional explain mode that returns scoring rationale
- [x] Add deterministic dedupe strategy for repeated graph paths and evidence snippets
- [x] Add consistency checks between `/impact` and `/ask` outputs (same query, same core answer)
- [x] Add confidence floor policy for production mode with explicit override flag

## 4. Promotion Automation & Safety

- [x] Add scripted promotion workflow (`sandbox-validated` -> `prod-ready`)
- [x] Add dry-run mode for production retrieve/refresh
- [x] Add automatic snapshot + restore points before production refresh
- [x] Add promotion run log with operator sign-off metadata

## 5. Operations & Monitoring

- [x] Add alert hooks for failed retrieve/refresh/smoke/regression checks
- [x] Add retention policy for refresh audit logs and snapshots
- [x] Add release checklist for routine upgrades (dependencies, CLI, Docker base images)
- [x] Add monthly “accuracy review” process for sampled business questions

## 6. Deferred Retrieval/Scale (Phase 9 Candidate; only after Phase 8 quality gates)

- [ ] Define measurable trigger for SQLite -> Postgres migration (size, latency, concurrency)
- [ ] Prototype Postgres graph backend behind existing graph service interface
- [ ] Add benchmark script comparing SQLite vs Postgres on representative org snapshot
- [ ] Define Chroma adoption criteria and only implement if retrieval quality requires it

## Definition of Done (Phase 8)

- [x] Ontology constraints are explicit, validated, and enforced during ingest
- [x] Parser precision and confidence quality materially improved on sampled production-like scenarios
- [x] `/impact` and `/ask` are consistent for validated test questions under defined confidence policy
- [x] Production promotion is repeatable, reversible, and documented with automation support
- [x] Retrieval/storage expansion decisions are deferred until quality gates are met and measured
