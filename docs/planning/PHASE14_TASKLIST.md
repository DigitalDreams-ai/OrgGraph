# OrgGraph Phase 14 Task List (Semantic Diff + Drift Governance)

Goal: control semantic drift across refreshes with deterministic diffs and regression gates.

## Entry Criteria
- [ ] Phase 13 complete
- [ ] Metric engine and trust policy are active

## Exit Criteria
- [ ] Every refresh emits semantic diff artifact
- [ ] Drift thresholds are enforced in CI/runtime
- [ ] Regression root-cause workflow is documented and automated

## Scope
- Semantic snapshot diff engine
- Drift budget policies
- CI checks for semantic regressions
- Drift triage tooling

## Deliverables
- [ ] `semantic-diff` artifact for each refresh
- [ ] Drift policy definitions and thresholds by domain
- [ ] CI gate: fail on out-of-budget semantic drift
- [ ] API: `GET /refresh/diff/:snapshotA/:snapshotB`
- [ ] Drift report template with top changed SCUs and impacted paths

## Test Gates
- [ ] Controlled fixture changes produce expected diff set
- [ ] No-change refresh yields empty diff and stable metrics
- [ ] Drift gate correctly blocks unsafe updates
- [ ] Sandbox run validates drift output at org scale

## Risks and Controls
- Risk: false-positive drift alarms
  - [ ] Add allowlisted benign-change classes
- Risk: diff granularity too coarse
  - [ ] Support object, field, relation, and policy-layer diffs

## Definition of Done
- [ ] Meaning changes are visible, measurable, and governable before release
