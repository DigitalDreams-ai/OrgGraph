# OrgGraph Phase 11 Task List (Blue Ocean: Deterministic Semantic Runtime)

Goal: build a true differentiator by making context a deterministic, composable semantic system, not a retrieval stack.

## Non-Negotiables
- [x] Deterministic first: same input state + same query => same plan + same core result
- [x] Provenance first: every answer claim maps to typed evidence/derivation
- [x] Composability first: context units can be combined without semantic ambiguity
- [x] No fluff: every new concept must produce measurable user value

## Entry Criteria
- [x] Phase 10 mission-critical LLM guardrails complete
- [x] `/ask` llm-assist working with deterministic fallback
- [x] Sandbox-backed graph refresh stable

## Exit Criteria
- [x] OrgGraph supports semantic composition units (not just endpoint queries)
- [x] `/ask` returns explicit derivation traces for core claim sets
- [x] Meaning quality is scored with deterministic metrics
- [x] At least one workflow demonstrates materially better decision support vs current approach

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
- [x] Define conflict semantics:
- what happens when two SCUs disagree
- [x] Define a strict “deterministic result contract” for every operator

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
- [x] Track these metrics over time per org snapshot

## 4. Semantic Versioning Across Refreshes

- [x] Add semantic diff output per refresh:
- added/removed/changed SCUs and relation-level impact
- [x] Add “meaning change” summary in refresh artifacts
- [x] Add regression checks for unintended semantic drift

## 5. Blue-Ocean Proof Workflow (Must Be Real)

- [x] Choose one high-value scenario (example: release-risk + permission impact)
- [x] Implement end-to-end using SCU composition + derivation traces
- [x] Compare against current endpoint-only flow:
- accuracy, time-to-answer, auditability, reproducibility
- [x] Publish result with evidence (not claims)

## 6. Testing (Hard Gates)

- [x] Operator property tests:
- associativity/commutativity rules where applicable, deterministic replay
- [x] Trace integrity tests:
- every claim has valid derivation chain
- [x] Semantic metric tests:
- threshold enforcement behavior
- [x] Sandbox validation tests on real metadata

## 7. Kill Criteria (Avoid Wasting Time)

- [x] If SCU composition cannot outperform current flow on the proof workflow, stop and reassess
- [x] If derivation traces are too costly/complex to maintain, reduce scope before expanding
- [x] If deterministic replay fails for same snapshot/input, block rollout

## Definition of Done (Phase 11)

- [x] OrgGraph can compose semantic units deterministically
- [x] `/ask` can show auditable derivation traces
- [x] Meaning quality is measured and enforced
- [x] Blue-ocean proof workflow shows measurable gain over current architecture

## Continuation Roadmap

- Phase 12: `docs/planning/PHASE12_TASKLIST.md`
- Phase 13: `docs/planning/PHASE13_TASKLIST.md`
- Phase 14: `docs/planning/PHASE14_TASKLIST.md`
- Phase 15: `docs/planning/PHASE15_TASKLIST.md`
- Phase 16: `docs/planning/PHASE16_TASKLIST.md`
- Phase 17: `docs/planning/PHASE17_TASKLIST.md`
- Program overview: `docs/planning/BLUE_OCEAN_PHASE_ROADMAP.md`

## Phase 11 Artifacts

- Proof workflow report: `docs/releases/PHASE11_PROOF_WORKFLOW_REPORT.md`
- Proof workflow artifact: `artifacts/phase11-proof-workflow.json`
- Phase 11 tests:
  - `apps/api/test/semantic-runtime.ts`
  - `apps/api/test/phase11-proof-workflow.ts`
  - `apps/api/test/phase11-sandbox-validation.ts`

## Verification Snapshot (2026-02-26)

- API suite in container: `docker exec orggraph-api sh -lc 'cd /app && pnpm --filter api test'` passed
- Phase 11 focused tests in container passed:
  - `pnpm exec ts-node --transpile-only test/semantic-runtime.ts`
  - `pnpm exec ts-node --transpile-only test/phase11-proof-workflow.ts`
  - `pnpm exec ts-node --transpile-only test/phase11-sandbox-validation.ts`
- Runtime readiness checks passed:
  - `GET /health`
  - `GET /ready`
  - `GET /api/ready` (web)
- Web smoke passed with deterministic fixture scope:
  - `WEB_SMOKE_FIXTURES_PATH=fixtures/permissions WEB_SMOKE_REFRESH_MODE=full ./scripts/web-smoke.sh`
