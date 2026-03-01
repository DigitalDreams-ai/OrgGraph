# Orgumented Blue Ocean Phase Roadmap

This roadmap consolidates overlapping phases into dependency-ordered waves with explicit entry/exit gates.

## Program Goal
Turn Orgumented into a replayable semantic decision runtime for Salesforce architecture work, where every answer is provable under a snapshot + policy envelope.

## Roadmap Model
- Active execution follows the wave gates below.
- The wave tasklists are the only planning files that should be treated as execution trackers.
- No wave starts until all predecessor wave exit gates pass.

## Wave Interpretation Update
The roadmap now has two layers:

1. Capability waves
- Waves A-E define product capabilities and proof/trust goals.

2. Platform transition waves
- Waves F-G define the desktop-runtime cutover required to deliver the future-state product correctly.

Interpretation rules:
- Waves A-C remain valid capability foundations.
- Wave D remains directionally valid, but its original browser-hosted UX framing is superseded by Wave G.
- Wave E remains valid as later-stage product expansion.
- Wave F is a prerequisite platform wave for the desktop-native future state.
- Wave G is the desktop implementation of the fresh Ask-first UX target.
- Desktop target platform for Waves F-G is Windows only.

Supersession rules:
- Any wave item that assumes Docker as product runtime is obsolete.
- Any wave item that assumes the browser-hosted operator UI is the long-term product surface is superseded by Waves F-G.
- Any auth path outside Salesforce CLI keychain is obsolete and should be treated as removal work under Wave A / Wave F.

## Wave A - Operator Baseline (Foundation)
Scope:
- remove obsolete auth paths and duplicate session logic
- make Salesforce CLI keychain (`sf` + `cci`) the operator auth baseline
- remove manifest-first retrieve dependency from standard workflows
- stabilize connect -> retrieve -> refresh on real sandbox metadata

Entry prerequisites:
- canonical runtime config paths agreed
- preflight checks defined with remediation text
- test environment able to run real org smoke commands

Exit gates:
- operator connect success rate >= 95% on benchmark runs
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
- fresh workflow-native Next.js UI baseline
- Ask as flagship primary pane
- raw JSON as secondary operator view only
- route-grouped workflows: Ask, Connect, Retrieve, Refresh, Analyze, Proofs, System

Status interpretation:
- Original Wave D intent is still valid.
- Original browser-hosted implementation framing is superseded by Wave G.
- Use Wave D as the capability target and Wave G as the desktop product implementation path.

Entry prerequisites:
- Wave C exit gates passed
- design system primitives and IA contract approved

Exit gates:
- workflow parity smoke pass on new UI
- operator task completion target achieved vs baseline UI
- no superseded UI route required for core workflows

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

## Wave F - Desktop Foundation and Runtime Cutover
Scope:
- establish Tauri as the desktop shell
- support Windows only as the desktop platform
- preserve Next.js for the embedded UI and NestJS for the semantic engine
- keep Docker removed from the product runtime
- replace auth/session model with local CLI-backed alias discovery and attach flows
- define local app data, logging, diagnostics, and process lifecycle

Entry prerequisites:
- desktop architecture and transition plan approved
- removal register created and prioritized
- reuse/refactor/delete inventory agreed

Exit gates:
- desktop shell launches local UI and local NestJS engine successfully on Windows
- operator can discover and attach a locally authenticated Salesforce alias on Windows
- no core auth workflow depends on Docker, VNC, browser brokers, or external client app flows
- local runtime paths for graph, evidence, proofs, and logs are defined and functioning

## Wave G - Desktop Ask-First Product UX
Scope:
- build the fresh desktop UX from the blueprint
- make Ask the default workspace and primary flow
- migrate org browser, refresh/build, analyze, proofs/history, and diagnostics into desktop-native UX
- make decision packets the default output shape, with raw JSON secondary

Entry prerequisites:
- Wave F exit gates passed
- desktop UX blueprint approved
- desktop shell and local runtime stable enough for workflow migration

Exit gates:
- Ask-first desktop UX reaches workflow parity for core operator tasks
- proof/history access no longer requires manual token bookkeeping
- org browser supports org-wide selective retrieve in the desktop product
- pre-desktop operator UI is no longer required for primary workflows

## Dependency Matrix
1. Wave A -> required by B, C, D, E, F, G
2. Wave B -> required by C, D, E, G
3. Wave C -> required by D, E, G
4. Wave D -> required by E, G
5. Wave E -> independent commercialization layer after D, may continue in parallel with late G hardening
6. Wave F -> required by G

## Practical Execution Order
For the desktop-native program, the practical order is:
1. close remaining relevant Wave A removal items
2. preserve Wave B deterministic Ask core requirements
3. preserve Wave C proof productization requirements
4. execute Wave F desktop foundation and runtime cutover
5. execute Wave G desktop Ask-first product UX
6. continue Wave E simulation/risk/commercialization on the desktop foundation

Execution note:
- Wave D should no longer be implemented as a browser-hosted UX modernization track.
- Its intended product outcomes should be realized through Wave G.

## Remaining Relevance of Waves A-E
- Wave A: still active where auth simplification, selector-first retrieval, and runtime cleanup are incomplete.
- Wave B: still critical and architecture-defining.
- Wave C: still critical and product-defining.
- Wave D: capability target retained, implementation path moved to Wave G.
- Wave E: still valid, but should build on the desktop runtime rather than the prior web/Docker runtime.

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
- `docs/planning/ORGUMENTED_LEXICON.md`
- `docs/planning/SUCCESS_GATES_CHECKLIST.md`
- `docs/planning/DESKTOP_ARCHITECTURE.md`
- `docs/planning/DESKTOP_TRANSITION_PLAN.md`
- `docs/planning/REMOVAL_REGISTER.md`
- `docs/planning/REUSE_REFACTOR_DELETE_MATRIX.md`
- `docs/planning/DESKTOP_UX_BLUEPRINT.md`
- `docs/planning/WAVE_A_TASKLIST.md` through `docs/planning/WAVE_G_TASKLIST.md`
