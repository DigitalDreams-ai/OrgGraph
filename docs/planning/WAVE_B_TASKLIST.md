# Wave B Tasklist - Ask Deterministic Core

Objective: make Ask deterministic, ontology-authoritative, and robust to phrasing variation without keyword-dispatch brittleness.

## Scope
- Ontology-authoritative query compilation.
- Remove keyword-triggered core routing.
- Deterministic plan compilation with fail-closed clarify/refuse behavior.

## Tasks
- [x] Add an operator-only coordination-memory MCP for handoff, verification, and subsystem mapping without feeding Ask execution or proof truth paths.
- [ ] Define typed Ask compiler contract: intent, entities, constraints, operator plan.
- [ ] Implement ontology validation as required gate before execution.
- [ ] Remove keyword-heavy final dispatch from core Ask planning path.
- [ ] Add clarify/refuse policy for ambiguous or unsupported asks.
- [ ] Add deterministic replay tests for compiled plan equivalence.
- [ ] Add benchmark prompt corpus and intent-compile regression tests.
- [ ] Keep LLM role constrained to assist/elaboration only.

## Exit Gates
- [ ] Replay match rate is 100% on deterministic benchmark set.
- [ ] Intent compile pass rate meets target benchmark threshold.
- [ ] No hidden fallback from constrained to unconstrained execution.
- [ ] Clarify/refuse outcomes are explicit and traceable.
