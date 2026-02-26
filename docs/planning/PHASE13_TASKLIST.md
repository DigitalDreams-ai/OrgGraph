# OrgGraph Phase 13 Task List (Meaning Metrics + Trust Gates)

Goal: quantify meaning quality and enforce trust policy gates deterministically.

## Entry Criteria
- [x] Phase 12 complete
- [x] Proof artifacts and replay are stable

## Exit Criteria
- [x] All responses have metric envelope attached
- [x] Trust level (`trusted`, `conditional`, `refused`) enforced by policy
- [x] Unsafe low-grounding outputs are blocked by default

## Scope
- Deterministic metric engine
- Policy envelopes and threshold enforcement
- Trust-level response model
- Metric trend recording by snapshot

## Deliverables
- [x] Metric computation: `grounding_score`, `constraint_satisfaction`, `ambiguity_score`, `stability_score`, `delta_novelty`, `risk_surface_score`
- [x] Policy envelope objects (`policy_*`) and runtime binding
- [x] API response includes `trustLevel`, `policyId`, metric fields
- [x] Refusal mode with actionable failure reasons
- [x] Metric audit log and dashboard-ready export

## Test Gates
- [x] Threshold tests for each metric (pass/fail boundaries)
- [x] No trusted output when hard constraints fail
- [x] Snapshot-to-snapshot metric consistency on static data
- [x] Replay maintains identical metrics under same inputs

## Risks and Controls
- Risk: noisy metrics
  - [x] Define deterministic normalization rules
- Risk: policy misconfiguration
  - [x] Add policy validation and dry-run mode

## Definition of Done
- [x] Trust is an enforced runtime property, not a UI suggestion

## Verification Snapshot (2026-02-26)

- API suite in container passed:
  - `docker exec orggraph-api sh -lc 'cd /app && pnpm --filter api test'`
- Replay deterministic validation passed:
  - `./scripts/phase12-replay-regression.sh`
  - `PHASE12_REPLAY_REQUESTS=24 PHASE12_REPLAY_CONCURRENCY=6 ./scripts/phase12-replay-load.sh`
- Phase 13 metrics export passed:
  - `./scripts/phase13-metrics-export.sh`
  - Artifact: `artifacts/phase13-metrics-export.json`
- Web smoke passed:
  - `WEB_SMOKE_FIXTURES_PATH=fixtures/permissions WEB_SMOKE_REFRESH_MODE=full ./scripts/web-smoke.sh`
