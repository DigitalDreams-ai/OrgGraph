# Orgumented Phase 27 Task List (LLM Governance Implementation I)

Goal: implement the first executable slice of Phase 26 governance scope: shadow mode, canary guardrails, and deterministic-vs-llm regression scaffolding.

## Entry Criteria
- [x] Phase 26 kickoff planning merged
- [ ] Existing Ask deterministic mode stable on current benchmarks

## Exit Criteria
- [ ] Shadow mode control implemented and tested
- [ ] Canary routing policy implemented for at least one query class
- [ ] CI regression comparison job added (deterministic vs llm_assist)
- [ ] Initial scorecard artifact generated from CI run

## Deliverables
- [ ] Add `ASK_LLM_SHADOW_MODE=true|false`
- [ ] Execute llm_assist path in shadow mode while serving deterministic answer
- [ ] Persist shadow comparison artifact per run (`answer delta`, latency delta, cost delta)
- [ ] Add canary gate by query class (`ask`, `ask/architecture`) and operator alias allowlist
- [ ] Add CI script to compare deterministic vs llm_assist on fixed corpus
- [ ] Export scorecard JSON to `artifacts/phase27-llm-scorecard.json`

## Test Gates
- [ ] `pnpm --filter api test` passes
- [ ] new shadow-mode unit tests pass
- [ ] new canary policy tests pass
- [ ] regression compare script passes in CI

## Definition of Done
- [ ] Shadow and canary controls are live, auditable, and do not alter deterministic served answers when in shadow mode.
