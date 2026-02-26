# OrgGraph Phase 13 Task List (Meaning Metrics + Trust Gates)

Goal: quantify meaning quality and enforce trust policy gates deterministically.

## Entry Criteria
- [ ] Phase 12 complete
- [ ] Proof artifacts and replay are stable

## Exit Criteria
- [ ] All responses have metric envelope attached
- [ ] Trust level (`trusted`, `conditional`, `refused`) enforced by policy
- [ ] Unsafe low-grounding outputs are blocked by default

## Scope
- Deterministic metric engine
- Policy envelopes and threshold enforcement
- Trust-level response model
- Metric trend recording by snapshot

## Deliverables
- [ ] Metric computation: `grounding_score`, `constraint_satisfaction`, `ambiguity_score`, `stability_score`, `delta_novelty`, `risk_surface_score`
- [ ] Policy envelope objects (`policy_*`) and runtime binding
- [ ] API response includes `trustLevel`, `policyId`, metric fields
- [ ] Refusal mode with actionable failure reasons
- [ ] Metric audit log and dashboard-ready export

## Test Gates
- [ ] Threshold tests for each metric (pass/fail boundaries)
- [ ] No trusted output when hard constraints fail
- [ ] Snapshot-to-snapshot metric consistency on static data
- [ ] Replay maintains identical metrics under same inputs

## Risks and Controls
- Risk: noisy metrics
  - [ ] Define deterministic normalization rules
- Risk: policy misconfiguration
  - [ ] Add policy validation and dry-run mode

## Definition of Done
- [ ] Trust is an enforced runtime property, not a UI suggestion
