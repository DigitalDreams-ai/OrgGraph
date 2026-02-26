# OrgGraph Phase 12 Task List (Proof Artifacts + Replay Runtime)

Goal: make every `/ask` answer replayable and auditable as a first-class proof artifact.

## Entry Criteria
- [ ] Phase 11 complete
- [ ] SCU and operator contracts are stable

## Exit Criteria
- [ ] Proof artifacts persisted for all `/ask` executions
- [ ] Replay API can reproduce results from stored trace + snapshot + policy
- [ ] Rejected branches are captured and queryable

## Scope
- Proof artifact schema and persistence
- Replay token issuance and verification
- Execution trace capture (operator steps + branch rejections)
- Deterministic replay endpoint and tooling

## Deliverables
- [ ] `proof_*` IDs and schema in storage backend
- [ ] API: `GET /ask/proof/:proofId`
- [ ] API: `POST /ask/replay` with `replayToken`
- [ ] Trace persistence for selected plan, operators, constraints, evidence IDs
- [ ] CLI or script for replay regression runs

## Test Gates
- [ ] Replay of benchmark corpus returns byte-equivalent core result payload
- [ ] 100% claims in proof artifact map to derivation/evidence IDs
- [ ] Rejected branches include explicit rejection reason codes
- [ ] Load test for replay path under concurrent requests

## Risks and Controls
- Risk: trace payload size explosion
  - [ ] Add bounded trace levels (`compact`, `standard`, `full`)
- Risk: hidden non-determinism in planner
  - [ ] Add seed/control and deterministic plan ordering checks

## Definition of Done
- [ ] `/ask` is no longer a black box; each result has replayable proof
