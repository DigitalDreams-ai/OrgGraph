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

### Priority 3: Decision-packet adoption
- make proof artifacts usable in real review workflows
- measure time-to-trusted-answer and evidence-gathering reduction

### Priority 4: Stage 1 desktop workflow parity
- complete product-grade Sessions, Browser, Refresh/Build, Analyze, Proofs/History, and Settings/Diagnostics flows
- make org-wide selective retrieve a real operator workflow
- remove token-bookkeeping dependence from proof/history access

### Priority 5: Policy-aware approval support
- only after packet quality and workflow adoption improve

## What Not To Do

Do not:
- reintroduce Docker or browser-hosted runtime assumptions
- widen scope into a domain-agnostic platform
- pursue governance or enforcement claims before workflow proof exists
- custom-build substrate for its own sake

## Near-Term Roadmap Sequence

1. stabilize desktop runtime convergence
2. strengthen planner/compiler depth
3. finish Stage 1 desktop workflow parity
4. improve decision-packet quality and workflow fit
5. prove measurable workflow lift
6. begin policy-aware approval support

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
