# OrgGraph Phase 15 Task List (Salesforce Decision Engines)

Goal: deliver flagship Salesforce architecture decisions using semantic runtime primitives.

## Entry Criteria
- [x] Phase 14 complete
- [x] Diff and drift governance operating in CI and local runtime

## Exit Criteria
- [ ] Three decision engines are live with proof-backed outputs
- [ ] Lift targets met versus endpoint-only baseline
- [ ] Architect-facing reports are reproducible via replay tokens

## Scope
- [x] Permission exposure engine
- [x] Automation impact collision engine
- [x] Release readiness risk engine
- [x] Composite architectural judgment output

## Deliverables
- [x] Decision engine: permission blast radius under role/profile/perm-set composition
- [x] Decision engine: automation conflict and side-effect path ranking
- [x] Decision engine: release risk from semantic deltas + policy constraints
- [x] Composite result payload with trust level, replay token, and top risk drivers
- [x] Runbook for architect review workflow

## Test Gates
- [ ] Benchmark corpus with known outcomes for all three engines
- [ ] Precision/recall improvements versus current endpoint-only baseline
- [ ] Time-to-trusted-answer benchmark improvement
- [ ] Sandbox validation against real org metadata and release scenarios

## Risks and Controls
- Risk: model complexity harms explainability
  - [x] Enforce max explanation depth + ranked top-k reasons
- Risk: domain edge cases
  - [x] Add deterministic fallback for unsupported relation patterns

## Definition of Done
- [ ] OrgGraph provides materially better architecture decisions with proof, not just query responses

## Phase 15 Implementation Notes
- Added deterministic endpoint: `POST /ask/architecture`
- Engine payload includes proof paths, collision ranking, release-risk score, and replay token
- Integration coverage added in `apps/api/test/integration.ts`
- Benchmark/lift gates remain open for Phase 16+ measurement cycle
