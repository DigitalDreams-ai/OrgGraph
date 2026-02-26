# OrgGraph Phase 11 Task List (Blue Ocean: Deterministic Semantic Runtime)

Goal: build a true differentiator by making context a deterministic, composable semantic system, not a retrieval stack.

## Non-Negotiables
- [ ] Deterministic first: same input state + same query => same plan + same core result
- [ ] Provenance first: every answer claim maps to typed evidence/derivation
- [ ] Composability first: context units can be combined without semantic ambiguity
- [ ] No fluff: every new concept must produce measurable user value

## Entry Criteria
- [ ] Phase 10 mission-critical LLM guardrails complete
- [ ] `/ask` llm-assist working with deterministic fallback
- [ ] Sandbox-backed graph refresh stable

## Exit Criteria
- [ ] OrgGraph supports semantic composition units (not just endpoint queries)
- [ ] `/ask` returns explicit derivation traces for core claim sets
- [ ] Meaning quality is scored with deterministic metrics
- [ ] At least one workflow demonstrates materially better decision support vs current approach

## Scope
- Semantic Context Units (SCUs) and composition contracts
- Deterministic derivation trace graph (meta-context layer)
- Meaning metrics and acceptance thresholds
- Versioned semantic deltas across refreshes
- Canonical runtime language adoption (`docs/planning/ORGGRAPH_LEXICON.md`)

## Not In Phase 11
- New custom storage engine rewrite
- Generic RAG/vector search expansion
- Autonomous write-back actions

## 1. Define the Semantic Core (No Implementation Drift)

- [x] Adopt and enforce canonical terminology from `ORGGRAPH_LEXICON.md` in API/docs
- [x] Define `SCU` (Semantic Context Unit) schema:
- Identity, type, invariants, dependencies, provenance, confidence policy
- [x] Define composition operators:
- `overlay`, `intersect`, `constrain`, `specialize`, `supersede`
- [ ] Define conflict semantics:
- what happens when two SCUs disagree
- [ ] Define a strict “deterministic result contract” for every operator

## 2. Build Derivation as First-Class Data

- [x] Add typed derivation edges:
- `DERIVED_FROM`, `SUPPORTS`, `CONTRADICTS`, `REQUIRES`, `INVALIDATED_BY`, `SUPERSEDES`
- [x] Add `/ask` trace mode returning:
- selected plan, executed operators, evidence IDs, rejected branches
- [x] Ensure trace can be replayed deterministically from persisted state

## 3. Quantify Meaning (Deterministically)

- [x] Implement baseline metrics:
- `grounding_score`, `constraint_satisfaction`, `ambiguity_score`, `stability_score`, `delta_novelty`
- [x] Add per-answer quality envelope:
- hard fail if grounding/constraints below threshold
- [ ] Track these metrics over time per org snapshot

## 4. Semantic Versioning Across Refreshes

- [ ] Add semantic diff output per refresh:
- added/removed/changed SCUs and relation-level impact
- [ ] Add “meaning change” summary in refresh artifacts
- [ ] Add regression checks for unintended semantic drift

## 5. Blue-Ocean Proof Workflow (Must Be Real)

- [ ] Choose one high-value scenario (example: release-risk + permission impact)
- [ ] Implement end-to-end using SCU composition + derivation traces
- [ ] Compare against current endpoint-only flow:
- accuracy, time-to-answer, auditability, reproducibility
- [ ] Publish result with evidence (not claims)

## 6. Testing (Hard Gates)

- [ ] Operator property tests:
- associativity/commutativity rules where applicable, deterministic replay
- [ ] Trace integrity tests:
- every claim has valid derivation chain
- [ ] Semantic metric tests:
- threshold enforcement behavior
- [ ] Sandbox validation tests on real metadata

## 7. Kill Criteria (Avoid Wasting Time)

- [ ] If SCU composition cannot outperform current flow on the proof workflow, stop and reassess
- [ ] If derivation traces are too costly/complex to maintain, reduce scope before expanding
- [ ] If deterministic replay fails for same snapshot/input, block rollout

## Definition of Done (Phase 11)

- [ ] OrgGraph can compose semantic units deterministically
- [ ] `/ask` can show auditable derivation traces
- [ ] Meaning quality is measured and enforced
- [ ] Blue-ocean proof workflow shows measurable gain over current architecture

## Continuation Roadmap

- Phase 12: `docs/planning/PHASE12_TASKLIST.md`
- Phase 13: `docs/planning/PHASE13_TASKLIST.md`
- Phase 14: `docs/planning/PHASE14_TASKLIST.md`
- Phase 15: `docs/planning/PHASE15_TASKLIST.md`
- Phase 16: `docs/planning/PHASE16_TASKLIST.md`
- Phase 17: `docs/planning/PHASE17_TASKLIST.md`
- Program overview: `docs/planning/BLUE_OCEAN_PHASE_ROADMAP.md`
