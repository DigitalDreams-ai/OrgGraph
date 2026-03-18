# Orgumented v2 Roadmap

Date: March 1, 2026

Companion execution master:
- `docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md`

## Roadmap Model

Orgumented v2 uses two layers:

1. Strategic stages
- trusted change decision engine
- policy-aware approval support
- soft deployment gate
- enforcement-backed governance

2. Delivery waves
- capability and platform waves that move the product toward those stages

The strategic stages define what success means.
The waves define how the work is sequenced.

For execution tracking, v2 now also uses numbered delivery waves (`wave1`, `wave2`, ...) in:
- `docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md`

The A-G waves remain strategic capability groupings.
The numbered waves are the tactical completion sequence to reach 100% of current v2 scope.

## Stage-to-Wave Mapping

### Stage 1: Trusted Change Decision Engine

Driven mainly by:
- Wave A: operator baseline
- Wave B: deterministic Ask core
- Wave C: proof productization
- Wave F: desktop foundation and runtime cutover
- Wave G: desktop Ask-first product UX

### Stage 2: Policy-Aware Approval Support

Begins after strong Stage 1 proof and expands through:
- late Wave G
- early Wave E

### Stage 3: Soft Deployment Gate

Later Wave E work after:
- workflow adoption
- policy operability
- acceptable false-positive tolerance

### Stage 4: Enforcement-Backed Governance

Post-Wave E only after:
- decision packets are accepted review artifacts
- governance teams trust the system
- selected policy gates are accurate enough to enforce

## Wave Summary

### Wave A
- local operator baseline
- CLI-backed auth/session/retrieve sanity

### Wave B
- deterministic Ask core
- ontology-authoritative plan direction
- replay-safe execution

### Wave C
- proof productization
- replay, lookup, history, trust envelope

### Wave D
- capability target for Ask-first UX
- implementation path superseded by Wave G desktop productization

### Wave E
- simulation, risk, commercialization
- approval support and later soft-gate readiness

### Wave F
- desktop foundation
- Tauri shell
- Windows runtime cutover
- Docker removed from product path

### Wave G
- desktop Ask-first product UX
- product-grade workspaces for Ask, Sessions, Browser, Refresh, Analyze, Proofs, and Diagnostics
- labeled proof/history access instead of token tracking
- desktop shell as the primary operator path, with standalone dev-server behavior treated as secondary verification only

## Current Position

As of March 1, 2026:
- Waves B, C, F, and major parts of G are materially advanced
- the current architectural pressure point is runtime convergence and planner depth
- the next product pressure point is turning decision packets into real workflow artifacts

## Current Active Priorities

### Priority 1: Runtime convergence
- keep one desktop runtime story
- reduce dependence on standalone Next-server assumptions
- preserve direct engine boundaries

### Priority 2: Planner/compiler depth
- reduce regex-heavy routing
- improve ontology-aware planning
- evaluate borrowed compiler/reasoning substrate where justified
- introduce a narrow semantic-frame contract before choosing a parser framework, so Ask depth expands through typed intent/grounding/admissibility rather than parser-first churn

### Priority 3: Decision-packet adoption
- make proof artifacts usable in real review workflows
- keep proxy-backed packet publication and provenance verification green
- reduce evidence-gathering and publication friction without depending on human stopwatch timing on test data

### Priority 4: Stage 1 desktop workflow parity
- complete product-grade Sessions, Browser, Refresh/Build, Analyze, Proofs/History, and Settings/Diagnostics flows
- make org-wide selective retrieve a real operator workflow
- remove token-bookkeeping dependence from proof/history access
- simplify bloated workspace surfaces until each workflow has one clear primary artifact, one clear next action, and progressive disclosure for secondary detail

### Priority 5: Borrow GitHub where it removes low-value custom platform work
- use GitHub for raw git history/diff, pull requests, checks, Actions orchestration, releases, and work tracking
- map the first integration slices to wave7, wave11, and wave12
- keep local semantic runtime behavior independent when GitHub is unavailable
- expand `cci` through typed engine-side jobs, not freeform UI shell access
- keep `sf` as the primary Salesforce auth and raw retrieve/query tool while `cci` remains the typed project-aware orchestration layer

Current support-track status:
- planning and ownership policy are complete
- implementation is still early, at roughly 15%
- read-only repo and PR context is not built yet
- PR publication, workflow dispatch/status ingest, and release linkage are not built yet
- current live `cci` support remains the alias bridge / project-support baseline, not the full typed job registry

### Priority 6: Policy-aware approval support
- only after packet quality and workflow adoption improve

### Priority 7: Execution stability over platform churn
- no restart and no architecture re-opening while Stage 1 completion is achievable on current desktop model
- apply module-level rebuild only when objective triggers are met (see `ORGUMENTED_V2_PIVOT_LOCK.md`)

### Priority 7: UI simplification and signal discipline
- reduce information overload across Ask, Analyze, Browser, Refresh, Proofs, and Diagnostics
- eliminate duplicate status summaries, repeated action rows, and card-density that obscures the primary workflow
- keep raw JSON, debug payloads, and low-signal telemetry behind explicit secondary affordances
- treat modern, elegant, calm operator surfaces as a product requirement rather than a post-completion polish pass

## What Not To Do

Do not:
- reintroduce Docker or browser-hosted runtime assumptions
- widen scope into a domain-agnostic platform
- pursue governance or enforcement claims before workflow proof exists
- custom-build substrate for its own sake
- custom-build repo diff, PR review, CI orchestration, or release distribution surfaces that GitHub already provides acceptably

## Near-Term Roadmap Sequence (Locked)

1. close runtime/session reliability (wave2 + wave3)
2. close org browser and retrieve-handoff parity (wave4 + wave5)
3. strengthen Ask grounding and packet quality (wave6 + wave7)
   - semantic-frame v1 defines the preferred wave6 direction for Ask interpretation hardening
4. close structured analyze/proofs workflows (wave8 + wave9)
5. finish layout/accessibility hardening and workspace simplification (wave10)
6. complete defect/CI/release discipline (wave11 + wave12)
7. run stabilization hold (wave13)
8. only then evaluate policy-aware approval support expansion

Cross-cutting support track during waves 7, 11, and 12:
- GitHub replaces repo/review/check/release plumbing
- Orgumented remains the semantic decision engine
- typed `cci` expansion can proceed locally and through GitHub Actions without reopening the core runtime model

## Later Sequence

Only after the above:
1. soft-gate trials
2. audit-ready governance flows
3. selective enforcement-backed governance

## Roadmap Gate Rule

No new stage claim is valid unless:
- the required proof exists
- the workflow adoption evidence exists
- the false-positive cost is understood where policy gating is involved
