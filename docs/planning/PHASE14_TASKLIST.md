# OrgGraph Phase 14 Task List (Semantic Diff + Drift Governance)

Goal: control semantic drift across refreshes with deterministic diffs and regression gates.

## Entry Criteria
- [x] Phase 13 complete
- [x] Metric engine and trust policy are active

## Exit Criteria
- [x] Every refresh emits semantic diff artifact
- [x] Drift thresholds are enforced in CI/runtime
- [x] Regression root-cause workflow is documented and automated

## Scope
- Semantic snapshot diff engine
- Drift budget policies
- CI checks for semantic regressions
- Drift triage tooling

## Deliverables
- [x] `semantic-diff` artifact for each refresh
- [x] Drift policy definitions and thresholds by domain
- [x] CI gate: fail on out-of-budget semantic drift
- [x] API: `GET /refresh/diff/:snapshotA/:snapshotB`
- [x] Drift report template with top changed SCUs and impacted paths

## Test Gates
- [x] Controlled fixture changes produce expected diff set
- [x] No-change refresh yields empty diff and stable metrics
- [x] Drift gate correctly blocks unsafe updates
- [x] Sandbox run validates drift output at org scale

## Risks and Controls
- Risk: false-positive drift alarms
  - [x] Add allowlisted benign-change classes
- Risk: diff granularity too coarse
  - [x] Support object, field, relation, and policy-layer diffs

## Definition of Done
- [x] Meaning changes are visible, measurable, and governable before release
