# Orgumented Phase 17 Task List (Specialized Storage/Runtime Decision + Execution)

Goal: decide and execute whether a specialized semantic store/runtime is warranted, based on measured lift and cost.

## Entry Criteria
- [x] Phase 16 complete
- [ ] Program-level lift targets met on current stack

## Exit Criteria
- [x] Formal go/no-go decision documented with benchmark evidence
- [ ] If go: specialized runtime integrated behind stable interfaces
- [x] If no-go: optimization roadmap on existing stack committed

## Scope
- Storage/runtime decision matrix
- Prototype implementation (if approved)
- Compatibility layer to preserve API and proof contracts
- Migration and rollback plan

## Deliverables
- [x] Decision report: Postgres-first vs specialized semantic runtime
- [ ] Prototype: content-addressed SCU persistence and compressed relation index
- [x] Benchmark suite: ingest throughput, query latency, replay latency, memory footprint
- [x] Feature-flagged backend switch with parity tests
- [x] Rollback and disaster recovery runbook

## Test Gates
- [x] Behavioral parity tests pass against baseline backend
- [x] Replay parity: zero mismatches on benchmark corpus
- [ ] Performance gain threshold met before production rollout
- [ ] Data migration dry-run validated on sandbox-scale dataset

## Risks and Controls
- Risk: engine rewrite with no user-value lift
  - [x] Require benchmark superiority and operational simplicity threshold
- Risk: operational complexity
  - [x] Keep dual-run mode until parity and reliability criteria are met

## Definition of Done
- [x] Storage/runtime direction is evidence-based and does not break semantic contracts

## Phase 17 Implementation Notes
- Phase result: **No-Go** for specialized runtime promotion in this cycle
- Decision report added: `docs/runbooks/STORAGE_RUNTIME_DECISION.md`
- DR runbook added: `docs/runbooks/STORAGE_ROLLBACK_DR.md`
- Benchmark harness added: `scripts/phase17-benchmark.sh`
- Existing backend parity + replay gates retained as release requirements
