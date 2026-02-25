# OrgGraph Phase 8 Task List (Production Hardening + Scaling)

Goal: move from validated sandbox operation to safe production-grade operation with stronger accuracy, durability, and change management.

## Scope
- Production promotion workflow and rollback automation
- Parser precision upgrades for lower false-positive impact paths
- Data/store scaling decisions (SQLite -> Postgres, optional Chroma)
- Operational monitoring and release discipline

## 1. Promotion Automation

- [ ] Add scripted promotion workflow (`sandbox-validated` -> `prod-ready`)
- [ ] Add dry-run mode for production retrieve/refresh
- [ ] Add automatic snapshot + restore points before production refresh
- [ ] Add promotion run log with operator sign-off metadata

## 2. Parser Precision Upgrades

- [ ] Improve Apex DML object inference (variable lineage + constructor tracking)
- [ ] Improve Flow reference extraction (XML node-aware extraction, fewer generic dotted tokens)
- [ ] Add confidence calibration tests over known-good org examples
- [ ] Add parser warning taxonomy (`noise`, `ambiguous`, `unsupported`)

## 3. Query Quality Controls

- [ ] Add endpoint-level min-confidence filter defaults
- [ ] Add optional explain mode that returns scoring rationale
- [ ] Add deterministic dedupe strategy for repeated evidence snippets
- [ ] Add query consistency checks between `/impact` and `/ask`

## 4. Storage & Scale Readiness

- [ ] Define measurable migration trigger from SQLite to Postgres (size, latency, concurrency)
- [ ] Prototype Postgres graph backend behind the same service interface
- [ ] Add benchmark script comparing SQLite vs Postgres on representative org snapshot
- [ ] Decide Chroma adoption criteria and implement only if retrieval quality demands it

## 5. Operations & Monitoring

- [ ] Add alert hooks for failed retrieve/refresh/smoke/regression checks
- [ ] Add retention policy for refresh audit logs and snapshots
- [ ] Add release checklist for routine upgrades (dependencies, CLI, Docker base images)
- [ ] Add monthly “accuracy review” process for sampled business questions

## Definition of Done (Phase 8)

- [ ] Production promotion is repeatable, reversible, and documented with automation support
- [ ] Parser precision and confidence quality materially improved on sampled production-like scenarios
- [ ] Scale decision (SQLite/Postgres/Chroma) is made using benchmark data, not assumptions
- [ ] Monitoring and operational hygiene are in place for ongoing maintenance

