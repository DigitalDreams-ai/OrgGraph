# OrgGraph Phase 16 Task List (Meta-Context Adaptation Under Deterministic Bounds)

Goal: add bounded adaptation ("learning") without sacrificing replayability or trust guarantees.

## Entry Criteria
- [x] Phase 15 complete
- [ ] Lift criteria achieved on flagship decision engines

## Exit Criteria
- [x] Meta-context layer updates relation weights/rank priors deterministically
- [ ] Adaptation improves ranking quality without reducing stability
- [x] All adaptation changes are replayable and diffable

## Scope
- Deterministic adaptation rules (bounded plasticity)
- Meta-context graph for ranking priors and conflict suppression
- Inhibition/excitation policies for contradiction handling
- Consolidation cycle for promoting stable derivations

## Deliverables
- [x] Meta-context schema (`meta_*` SCUs and relations)
- [x] Deterministic adaptation runner (scheduled and on-demand)
- [x] Ranked derivation path improvements with before/after proof comparison
- [x] Adaptation audit artifact (what changed, why, under which policy)

## Test Gates
- [x] Same input snapshot before adaptation replayable via historical policy/version
- [ ] Adaptation improvements verified on benchmark ranking quality metrics
- [x] No trust-level regressions caused by adaptation
- [ ] Drift checks include meta-layer deltas

## Risks and Controls
- Risk: hidden non-determinism in adaptation
  - [x] All updates generated from explicit deterministic formulas
- Risk: overfitting to one org
  - [ ] Cross-snapshot and cross-scenario validation set required

## Definition of Done
- [ ] OrgGraph adapts ranking quality while preserving deterministic guarantees

## Phase 16 Implementation Notes
- Added `MetaContextService` with bounded deterministic formulas (`phase16-v1`)
- Added endpoints: `GET /meta/context`, `POST /meta/adapt`
- Analysis scoring now applies relation multipliers from meta context
- Adaptation runs emit audit artifacts in `data/meta/audit/`
