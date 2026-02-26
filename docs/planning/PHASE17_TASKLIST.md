# OrgGraph Phase 17 Task List (Specialized Storage/Runtime Decision + Execution)

Goal: decide and execute whether a specialized semantic store/runtime is warranted, based on measured lift and cost.

## Entry Criteria
- [ ] Phase 16 complete
- [ ] Program-level lift targets met on current stack

## Exit Criteria
- [ ] Formal go/no-go decision documented with benchmark evidence
- [ ] If go: specialized runtime integrated behind stable interfaces
- [ ] If no-go: optimization roadmap on existing stack committed

## Scope
- Storage/runtime decision matrix
- Prototype implementation (if approved)
- Compatibility layer to preserve API and proof contracts
- Migration and rollback plan

## Deliverables
- [ ] Decision report: Postgres-first vs specialized semantic runtime
- [ ] Prototype: content-addressed SCU persistence and compressed relation index
- [ ] Benchmark suite: ingest throughput, query latency, replay latency, memory footprint
- [ ] Feature-flagged backend switch with parity tests
- [ ] Rollback and disaster recovery runbook

## Test Gates
- [ ] Behavioral parity tests pass against baseline backend
- [ ] Replay parity: zero mismatches on benchmark corpus
- [ ] Performance gain threshold met before production rollout
- [ ] Data migration dry-run validated on sandbox-scale dataset

## Risks and Controls
- Risk: engine rewrite with no user-value lift
  - [ ] Require benchmark superiority and operational simplicity threshold
- Risk: operational complexity
  - [ ] Keep dual-run mode until parity and reliability criteria are met

## Definition of Done
- [ ] Storage/runtime direction is evidence-based and does not break semantic contracts
