# Orgumented Blue Ocean Phase Roadmap

This roadmap consolidates overlapping phases into dependency-ordered waves with explicit entry/exit gates.

## Program Goal
Turn Orgumented into a replayable semantic decision runtime for Salesforce architecture work, where every answer is provable under a snapshot + policy envelope.

## Roadmap Model
- Historical phase files remain as delivery history.
- Active execution follows wave gates below.
- No wave starts until all predecessor wave exit gates pass.

## Wave A - Operator Baseline (Foundation)
Scope:
- remove legacy auth paths and duplicate session logic
- make Salesforce CLI keychain (`sf` + `cci`) the operator auth baseline
- remove manifest-first retrieve dependency from standard workflows
- stabilize connect -> retrieve -> refresh on real sandbox metadata

Entry prerequisites:
- canonical runtime config paths agreed
- preflight checks defined with remediation text
- test environment able to run real org smoke commands

Exit gates:
- WebUI connect success rate >= 95% on benchmark runs
- selective metadata retrieve works without package.xml requirement
- refresh uses non-fixture source path and succeeds
- actionable errors for auth/session/retrieve failure classes

## Wave B - Ask Deterministic Core
Scope:
- ontology-authoritative query compilation
- remove keyword-triggered core dispatch
- fail-closed clarify/refuse behavior for ambiguous asks
- deterministic planner contract with replay-safe execution

Entry prerequisites:
- Wave A exit gates passed
- ontology contract for intents/entities/operators versioned
- benchmark prompt corpus defined

Exit gates:
- replay match rate = 100% on deterministic benchmark set
- intent compilation pass rate meets target on benchmark corpus
- no hidden fallback from constrained mode to unconstrained mode

## Wave C - Proof Productization
Scope:
- decision packet output model as default Ask response shape
- proof lookup, replay, and metrics contexts in primary UX
- trust/policy envelope visible per answer
- query-history-first proof UX (IDs/tokens are implementation details, not primary operator workflow)

Entry prerequisites:
- Wave B exit gates passed
- proof schema and replay contract frozen

Exit gates:
- proof coverage = 100% for production Ask responses
- replay token verification succeeds for benchmark packet set
- operator can inspect why-path, rejected branches, and policy status
- operator can retrieve/replay prior decisions via labeled history without manual token bookkeeping

## Wave D - Fresh Next.js Ask-First UX
Scope:
- fresh workflow-native Next.js UI baseline (not endpoint-console derivative)
- Ask as flagship primary pane
- raw JSON as secondary operator view only
- route-grouped workflows: Ask, Connect, Retrieve, Refresh, Analyze, Proofs, System

Entry prerequisites:
- Wave C exit gates passed
- design system primitives and IA contract approved

Exit gates:
- workflow parity smoke pass on new UI
- operator task completion target achieved vs baseline UI
- no legacy UI route required for core workflows

## Wave E - Simulation, Risk, and Commercialization
Scope:
- what-if simulation engine
- permission/automation/release-risk decision guidance
- production trust dashboard and commercialization readiness assets

Entry prerequisites:
- Wave D exit gates passed
- simulation scenario corpus and scoring policy approved

Exit gates:
- measurable lift against baseline on decision precision and time-to-trusted-answer
- production readiness checklist fully green
- adoption package complete (docs, runbooks, proof examples, role workflows)

## Dependency Matrix
1. Wave A -> required by B, C, D, E
2. Wave B -> required by C, D, E
3. Wave C -> required by D, E
4. Wave D -> required by E

## Program-Level Lift Targets
- `Replay pass rate`: 100% for benchmark corpus.
- `Proof coverage`: 100% claims linked to derivation/evidence IDs.
- `False-positive risk alerts`: reduce by at least 30% vs baseline.
- `Time-to-trusted-answer`: reduce by at least 40% on benchmark workflows.
- `Deterministic stability`: no output drift across repeated runs on same snapshot/policy.

## Governance Rules
- No wave closes without entry/exit evidence attached to PR summary.
- If lift criteria fail for two consecutive waves, pause expansion and reduce scope.
- Every custom subsystem must include rollback path and measurable lift hypothesis.

## Primary References
- `docs/planning/BLUE_OCEAN_EXECUTION_PLAN.md`
- `docs/planning/OPERATOR_GRADE_EXECUTION_PLAN.md`
- `docs/planning/ORGUMENTED_LEXICON.md`
- `docs/planning/SUCCESS_GATES_CHECKLIST.md`
- `docs/planning/WAVE_A_TASKLIST.md` through `docs/planning/WAVE_E_TASKLIST.md`
- `docs/planning/PHASE_TO_WAVE_MAPPING.md`
