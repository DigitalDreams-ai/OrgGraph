# Orgumented v2 100% Completion Waves

Date: March 4, 2026  
Status: active execution master plan

## Definition Of 100%

Orgumented is considered 100% complete for the current v2 scope when all of the following are true:

1. Product runtime is desktop-first and converged:
- packaged desktop is the primary operator path
- no runtime-critical dependence on standalone web/dev-server assumptions
- no Docker dependency in runtime/release/operator workflow

2. Deterministic trust contract is intact:
- same snapshot + query + policy returns same answer, proof ID class, and replay integrity
- proof artifacts are persisted, discoverable by label/history, and replay-verifiable
- fail-closed behavior is explicit for all core operator paths

3. Stage 1 workflow parity is product-grade:
- Sessions
- Browser
- Refresh & Build
- Ask
- Explain & Analyze
- Proofs & History
- Settings & Diagnostics

4. UX quality and stability bar is met:
- no clipping/overflow/truncation defects on supported desktop sizes
- predictable action language (no ambiguous add/retrieve semantics)
- critical and high-severity bug backlog for Stage 1 paths is zero

5. Release and operability are proven:
- CI gates are green and cost-controlled
- Windows packaging and smoke checks are stable
- runbooks are explicit, operator-readable, and validated on real org flow

## Wave Cadence Rules

- One coherent branch per wave.
- One PR per wave.
- No mixed-purpose scope creep.
- Every wave has explicit acceptance gates.
- If deterministic replay parity regresses, stop and fix before continuing.
- After each merge: update docs and project-memory before starting the next wave.

## Wave1 - Baseline Lock And Backlog Triage

Goal:
- freeze current v2 baseline and create one prioritized execution backlog for all remaining v2 work

Scope:
- confirm canonical planning files and link this wave plan from control surfaces
- create a single defect list grouped by severity and workspace
- create a single feature gap list grouped by workflow

Acceptance Gates:
- backlog files are deduplicated, prioritized, and linked from v2 README
- each open item has owner wave target and pass/fail criteria
- no unresolved planning drift across v2 core docs

## Wave2 - Runtime Convergence Finalization

Goal:
- remove remaining runtime divergence between packaged desktop and local dev verification paths

Scope:
- startup/bootstrap parity
- runtime readiness and fail-closed health signaling
- deterministic fixture/real-org startup behavior contract

Acceptance Gates:
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`
- no known runtime-only behavior that differs between packaged and local runtime

## Wave3 - Org Session Reliability And Toolchain Detection

Goal:
- make org connect/switch/refresh deterministic and operator-readable

Scope:
- sf/cci detection and status messaging
- session restore/switch/connect/disconnect consistency
- preflight accuracy and actionable failure states

Acceptance Gates:
- real-org connect flow succeeds end-to-end on packaged desktop
- missing tool, auth, and runtime-unavailable states are clearly distinguished
- no stale or contradictory session/tool status cards after refresh

## Wave4 - Org Browser Explorer Completion

Goal:
- complete name-first explorer retrieval workflow with intuitive selection semantics

Scope:
- searchable explorer by actual metadata item name
- tree/family browsing with consistent checkbox semantics
- cart/retrieve flow clarity and handoff to Refresh & Build

Acceptance Gates:
- operator can search and retrieve by file/metadata name without type-first knowledge
- tree/family selection includes nested members deterministically
- retrieve handoff into Refresh & Build is visible and trusted

## Wave5 - Refresh & Build Production Workflow

Goal:
- make rebuild/diff/org-retrieve workflow production-grade and explainable

Scope:
- staged handoff visibility
- default behavior and guardrails
- fail-closed behavior on invalid or incomplete handoffs

Acceptance Gates:
- common rebuild path completes from Browser handoff without raw JSON dependence
- drift and summary surfaces are readable and bounded
- failure states include direct next actions

## Wave6 - Ask Planner And Compiler Depth

Goal:
- materially reduce fragile regex routing and increase typed semantic planning depth

Scope:
- planner intent/entity extraction hardening
- query family stability for real metadata workflows
- deterministic flow/object/permission intent grounding

Acceptance Gates:
- planner and integration tests cover high-value query families
- replay and proof stability remain green
- measurable reduction in known misroutes and low-value fallback answers

## Wave7 - Decision Packet Quality

Goal:
- make packet outputs consistently useful for architecture decisions

Scope:
- tighten risk drivers, evidence linking, and next-action relevance
- improve confidence/trust explanation quality without relaxing constraints
- preserve citation determinism and proof context integrity

Acceptance Gates:
- selected real-org scenarios produce usable short answers + actionable next steps
- packet sections avoid clipping/overflow and remain readable at supported layouts
- no packet output without provenance-linked evidence

## Wave8 - Explain & Analyze Workflow Depth

Goal:
- ensure explain/analyze surfaces are decision-support tools, not debug-only views

Scope:
- structured cards and summaries for permission, automation, impact, and map diagnostics
- deterministic summary generation contracts
- remove dependency on raw JSON for primary operator tasks

Acceptance Gates:
- key analyze workflows complete using primary UI cards and actions
- raw JSON remains optional secondary inspection only
- deterministic answer equivalence preserved for same input context

## Wave9 - Proofs & History Productization

Goal:
- make proof/replay lookup label-first and audit-ready

Scope:
- labeled history navigation
- proof reopen, replay, and export ergonomics
- trust envelope continuity across session restarts

Acceptance Gates:
- operator can reopen and validate prior packets without manual token bookkeeping
- replay verification remains deterministic
- proof/history actions are stable in packaged desktop runtime

## Wave10 - Design, Layout, And Accessibility Hardening

Goal:
- complete design and layout polish across all workspaces

Scope:
- overflow, clipping, spacing, and responsive desktop breakpoints
- long-path and dense-content rendering rules
- keyboard accessibility and focus behavior for critical actions

Acceptance Gates:
- no known clipping/overflow defects in core workflow cards and rails
- content wraps within bounds on supported viewport sizes
- accessibility checks pass for key forms and controls

## Wave11 - Bug Burn-Down And Quality Lock

Goal:
- drive Stage 1 defects to release bar

Scope:
- critical/high bug burn-down
- flaky test elimination
- regression tests for every fixed high-impact bug

Acceptance Gates:
- zero open critical/high defects in Stage 1 workflows
- test flake rate for core suites at or near zero
- regression suite includes all fixed P0/P1 classes

## Wave12 - Release Readiness And Operator Proof

Goal:
- prove production-readiness with real operator runbooks and evidence

Scope:
- release checklist and rollback procedure
- operator quickstart and troubleshooting runbooks
- final real-org validation sweep

Acceptance Gates:
- release checklist complete with evidence artifacts
- operator runbooks verified on clean machine flow
- CI checks green on release candidate branch

## Wave13 - Post-100% Stabilization Window

Goal:
- protect quality immediately after 100% mark before Stage 2 expansion

Scope:
- short stabilization period for real usage feedback
- hotfix path only, no scope expansion
- Stage 2 entry review against v2 governance rules

Acceptance Gates:
- no unresolved P0/P1 regressions from release usage
- Stage 2 expansion decision documented through v2 decision discipline

## Cross-Wave Non-Negotiable Gates

Run for every wave with runtime or semantic impact:

1. `pnpm --filter api test`
2. `pnpm --filter web build`
3. `pnpm desktop:build`
4. `pnpm desktop:smoke:release`

Additional for semantic changes:
- replay parity assertions
- proof integrity assertions
- fail-closed behavior assertions

## Branch And PR Convention

- Branch format: `dna-wave<N>-<short-slice-name>`
- PR title format: `<type>(wave<N>): <scope outcome>`
- Merge rule: merge only when required checks are green and wave acceptance gates are explicitly met

## Immediate Next Wave

Start with Wave1 and produce:
- a single prioritized backlog
- a defect matrix
- a feature-gap matrix
- explicit wave assignment for every remaining v2 item

After Wave1 merges:
- start Wave2 with `B001`, `B002`, and `B003` as first execution slice candidates
