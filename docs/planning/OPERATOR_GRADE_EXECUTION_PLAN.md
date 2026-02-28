# Orgumented Operator-Grade Execution Plan

## Objective
Move Orgumented from build/test readiness to operator-grade readiness with deterministic, proof-backed architecture decisions.

## 1) Product Wedge
Orgumented’s core differentiator is deterministic, replayable decisioning:
- not only what exists in metadata,
- but why an answer is true,
- with proof path, evidence, and policy outcome in one artifact.

## 2) Operator-Grade Milestones
Orgumented is operator-grade only when all are true:
1. Org connect works first try from WebUI.
2. Retrieve + refresh completes without shell-side workaround.
3. Ask handles varied phrasing for core intents.
4. Answers are presented as usable explanation + proof views.
5. Replay pass rate remains high on real org snapshots.

## 3) Scope to Cut Now
Reduce complexity and failure surface:
- Remove legacy auth paths and duplicate connect logic.
- Remove endpoint-debug-first UX from operator surface.
- Remove silent behavior fallbacks.
- Remove stale docs/phase items that describe superseded flows.
- Remove manifest-first retrieve dependency from operator workflows (`package.xml` not required for normal operation).

Build-vs-borrow scope rule:
- custom-build only differentiating semantic runtime capabilities
- adopt commodity infrastructure for auth, retrieval plumbing, policy/runtime utilities, and observability
- require explicit justification to replace mature external tooling

## 4) Fastest Path to Reliable Connect/Retrieve
Implement a single contract:
1. One auth contract (`/org/session/connect`) with one mechanism per request.
2. One source of truth for session state.
3. One retrieve pipeline path using explicit metadata selectors (not manifest requirement).
4. Mandatory preflight gate before retrieve.
5. Actionable remediation surfaced per failure class.

## 5) Top Root-Cause Risks to Eliminate
1. Keyword-heavy Ask intent parsing.
2. Readiness claims not tied to operator outcomes.
3. Container/runtime boundary friction for keychain/session.
4. JSON-heavy explanation UX.
5. Legacy path overlap causing ambiguous behavior.

## 6) Ask Target Statement
Ask must compile natural language into an ontology-validated deterministic plan, execute it, and return a proof-backed decision packet.

Ask compiler hard requirements:
1. Ontology contract is the authority for intent, entity, and operator validity.
2. Keyword-heavy routing cannot determine final dispatch.
3. Unsupported or ambiguous queries must fail closed with explicit clarification prompts.
4. LLM use is assist-only for phrasing and optional elaboration; never for plan selection or proof generation.

## 7) Deterministic Quality Metrics
Track continuously:
- Replay match rate.
- Clarify/refuse rate (instead of silent unknown behavior).
- Intent parse success on benchmark prompt suite.
- Proof coverage rate (answers with complete derivation/evidence).
- Trust policy pass/fail trend by snapshot.

## 8) Target WebUI Information Architecture
Tabs/panels should be workflow-native:
1. Ask (primary)
2. Connect (session/auth only)
3. Retrieve (catalog/select/retrieve)
4. Refresh (ingest/snapshot/drift)
5. Analyze (perms/automation/impact)
6. Proofs (lookup/replay/metrics)
7. System (health/config diagnostics)

WebUI implementation constraints:
1. Ship a fresh, workflow-native UI baseline (not a modified endpoint-console shell).
2. Ask defaults to decision packet view: answer, why, proof chain, policy status, replay link.
3. Raw JSON remains secondary and explicitly operator-invoked.
4. Proof workflows are history-first: operators should not need to manually manage `proofId`/`replayToken`.

## 9) Impact-First Execution Sequence
1. Wave A: Legacy purge + contract freeze.
2. Wave B: Ask deterministic intent compiler.
3. Wave C: Proof/explanation productization.
4. Wave D: Fresh Ask-first WebUI rollout.
5. Wave E: Simulation/risk/commercialization readiness.

Per-phase reality gate:
1. measurable lift defined before implementation
2. deterministic acceptance criteria tied to operator outcomes
3. rollback path documented for each custom subsystem

Wave dependency rule:
1. B cannot start until A exit criteria are met.
2. C cannot start until B exit criteria are met.
3. D cannot start until C exit criteria are met.
4. E cannot start until D exit criteria are met.

## 10) Mandatory Release Checks
Before any readiness claim:
1. Connect org from WebUI.
2. Retrieve metadata from WebUI.
3. Refresh and confirm non-fixture source path.
4. Run 5 diverse Ask prompts.
5. Verify proof lookup + replay match.
6. Validate one permissions query and one impact query against known truth.

## 11) Definition of Legacy Removed
Legacy is considered removed only when all are true:
1. No standard operator workflow requires `package.xml`.
2. No manifest-first retrieve path is required for `/org/retrieve`.
3. No legacy auth path is exposed in primary WebUI UX.
4. No core workflow requires old endpoint-console UI routes.
5. Deprecated env/config keys are removed or hard-deprecated with migration notes.

## 12) Operator SLOs (Initial)
Use these as minimum operational quality targets:
1. WebUI connect success rate >= 95% on benchmark runs.
2. Retrieve success rate >= 95% on benchmark runs.
3. Refresh success rate >= 98% on benchmark runs.
4. Ask deterministic replay match = 100% on benchmark corpus.
5. P95 Ask response latency within agreed policy budget.

## 13) Benchmark Corpus Ownership
Required operating model:
1. Maintain a versioned benchmark corpus for connect/retrieve/ask/proof flows.
2. Assign explicit owner for corpus updates and baseline recalibration.
3. Any parser/compiler/policy change must run corpus before merge.
4. Corpus changes must include rationale and expected lift/risk notes.

## 14) Readiness Label Enforcement
Process enforcement:
1. Every release/PR readiness claim must include a readiness label from this plan.
2. Claims without supporting gate evidence are invalid.
3. `operator-ready` requires all mandatory checks and SLO minimums.
4. `architecture-ready` requires deterministic replay and proof coverage targets met.

## Readiness Labels (Required)
Use explicit labels only:
- `build-ready`
- `feature-ready`
- `operator-ready`
- `architecture-ready`

Do not use “ready” without qualifying label and passing required gates.

## Active Tracking Files
- `docs/planning/WAVE_A_TASKLIST.md`
- `docs/planning/WAVE_B_TASKLIST.md`
- `docs/planning/WAVE_C_TASKLIST.md`
- `docs/planning/WAVE_D_TASKLIST.md`
- `docs/planning/WAVE_E_TASKLIST.md`
- `docs/planning/PHASE_TO_WAVE_MAPPING.md`
