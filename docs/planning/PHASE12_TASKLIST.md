# Orgumented Phase 12 Task List (Proof Artifacts + Replay Runtime)

Goal: make every `/ask` answer replayable and auditable as a first-class proof artifact.

## Entry Criteria
- [x] Phase 11 complete
- [x] SCU and operator contracts are stable

## Exit Criteria
- [x] Proof artifacts persisted for all `/ask` executions
- [x] Replay API can reproduce results from stored trace + snapshot + policy
- [x] Rejected branches are captured and queryable

## Scope
- Proof artifact schema and persistence
- Replay token issuance and verification
- Execution trace capture (operator steps + branch rejections)
- Deterministic replay endpoint and tooling

## Deliverables
- [x] `proof_*` IDs and schema in storage backend
- [x] API: `GET /ask/proof/:proofId`
- [x] API: `POST /ask/replay` with `replayToken`
- [x] Trace persistence for selected plan, operators, constraints, evidence IDs
- [x] CLI or script for replay regression runs

## Test Gates
- [x] Replay of benchmark corpus returns byte-equivalent core result payload
- [x] 100% claims in proof artifact map to derivation/evidence IDs
- [x] Rejected branches include explicit rejection reason codes
- [x] Load test for replay path under concurrent requests

## Risks and Controls
- Risk: trace payload size explosion
  - [x] Add bounded trace levels (`compact`, `standard`, `full`)
- Risk: hidden non-determinism in planner
  - [x] Add seed/control and deterministic plan ordering checks

## Definition of Done
- [x] `/ask` is no longer a black box; each result has replayable proof

## Verification Snapshot (2026-02-26)

- API suite in container passed:
  - `docker exec orgumented-api sh -lc 'cd /app && pnpm --filter api test'`
- Replay regression script passed:
  - `./scripts/phase12-replay-regression.sh`
- Replay load/concurrency check passed:
  - `PHASE12_REPLAY_REQUESTS=24 PHASE12_REPLAY_CONCURRENCY=6 ./scripts/phase12-replay-load.sh`
- Web smoke passed against deterministic fixture scope:
  - `WEB_SMOKE_FIXTURES_PATH=fixtures/permissions WEB_SMOKE_REFRESH_MODE=full ./scripts/web-smoke.sh`
