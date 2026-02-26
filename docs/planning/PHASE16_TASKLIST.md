# OrgGraph Phase 16 Task List (Meta-Context Adaptation Under Deterministic Bounds)

Goal: add bounded adaptation ("learning") without sacrificing replayability or trust guarantees.

## Entry Criteria
- [ ] Phase 15 complete
- [ ] Lift criteria achieved on flagship decision engines

## Exit Criteria
- [ ] Meta-context layer updates relation weights/rank priors deterministically
- [ ] Adaptation improves ranking quality without reducing stability
- [ ] All adaptation changes are replayable and diffable

## Scope
- Deterministic adaptation rules (bounded plasticity)
- Meta-context graph for ranking priors and conflict suppression
- Inhibition/excitation policies for contradiction handling
- Consolidation cycle for promoting stable derivations

## Deliverables
- [ ] Meta-context schema (`meta_*` SCUs and relations)
- [ ] Deterministic adaptation runner (scheduled and on-demand)
- [ ] Ranked derivation path improvements with before/after proof comparison
- [ ] Adaptation audit artifact (what changed, why, under which policy)

## Test Gates
- [ ] Same input snapshot before adaptation replayable via historical policy/version
- [ ] Adaptation improvements verified on benchmark ranking quality metrics
- [ ] No trust-level regressions caused by adaptation
- [ ] Drift checks include meta-layer deltas

## Risks and Controls
- Risk: hidden non-determinism in adaptation
  - [ ] All updates generated from explicit deterministic formulas
- Risk: overfitting to one org
  - [ ] Cross-snapshot and cross-scenario validation set required

## Definition of Done
- [ ] OrgGraph adapts ranking quality while preserving deterministic guarantees
