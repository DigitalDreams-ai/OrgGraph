# OrgGraph Phase 15 Task List (Salesforce Decision Engines)

Goal: deliver flagship Salesforce architecture decisions using semantic runtime primitives.

## Entry Criteria
- [ ] Phase 14 complete
- [ ] Diff and drift governance operating in CI and local runtime

## Exit Criteria
- [ ] Three decision engines are live with proof-backed outputs
- [ ] Lift targets met versus endpoint-only baseline
- [ ] Architect-facing reports are reproducible via replay tokens

## Scope
- Permission exposure engine
- Automation impact collision engine
- Release readiness risk engine
- Composite architectural judgment output

## Deliverables
- [ ] Decision engine: permission blast radius under role/profile/perm-set composition
- [ ] Decision engine: automation conflict and side-effect path ranking
- [ ] Decision engine: release risk from semantic deltas + policy constraints
- [ ] Composite result payload with trust level, replay token, and top risk drivers
- [ ] Runbook for architect review workflow

## Test Gates
- [ ] Benchmark corpus with known outcomes for all three engines
- [ ] Precision/recall improvements versus current endpoint-only baseline
- [ ] Time-to-trusted-answer benchmark improvement
- [ ] Sandbox validation against real org metadata and release scenarios

## Risks and Controls
- Risk: model complexity harms explainability
  - [ ] Enforce max explanation depth + ranked top-k reasons
- Risk: domain edge cases
  - [ ] Add deterministic fallback for unsupported relation patterns

## Definition of Done
- [ ] OrgGraph provides materially better architecture decisions with proof, not just query responses
