# Orgumented Phase 30 Task List (Ask Core: Semantic Query Compilation)

Goal: make Ask the flagship by compiling free-form questions into deterministic operator plans with explicit confidence gates.

## Entry Criteria
- [x] Phase 29 complete

## Exit Criteria
- [ ] Ask handles broad operator phrasing without sacrificing determinism
- [ ] Every Ask result includes deterministic summary, plan, and proof envelope

## Deliverables
- [x] Build semantic query normalizer (intent/entity extraction + canonical query form)
- [ ] Add query-class planner coverage matrix (`perms`, `automation`, `impact`, `risk`, `proof`)
- [ ] Add planner rejection diagnostics with policy-safe explanations
- [ ] Add bounded llm-assist preprocessor mode (optional) with deterministic plan validation
- [ ] Add Ask quality benchmarks and regression corpus
- [ ] Improve Ask response framing in UI: summary first, trace/proof second, elaboration optional

## Test Gates
- [x] planner tests for canonicalization and routing
- [ ] deterministic replay tests for compiled plans
- [ ] Ask benchmark corpus pass rate and drift stability checks

## Definition of Done
- [ ] Ask provides repeatable, high-signal architecture answers beyond quick SOQL utility.
