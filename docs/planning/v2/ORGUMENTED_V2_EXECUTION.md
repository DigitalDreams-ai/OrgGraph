# Orgumented v2 Execution

Date: March 5, 2026

Execution master:
- `docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md`

## Wave Sequence

Execution order to reach 100% remains fixed:
- wave1 baseline lock
- wave2 runtime convergence
- wave3 sessions/toolchain reliability
- wave4 org browser explorer completion
- wave5 retrieve -> refresh handoff completion
- wave6 ask planner/compiler depth
- wave7 decision-packet quality
- wave8 explain/analyze depth
- wave9 proofs/history productization
- wave10 design/layout/accessibility hardening
- wave11 bug burn-down and CI quality lock
- wave12 release readiness and operator proof
- wave13 stabilization window

## Current Position

Materially true now:
- desktop runtime is Windows-native Tauri + Next + Nest
- Docker is out of runtime/release/operator flow
- `/ready` remains fail-closed when bootstrap grounding fails
- real-org session attach/switch and selective retrieve path is materially functional
- org browser supports name-first search and grouped explorer/tree selection
- org browser now uses explicit cart language (`checked row = in cart`) with simpler explorer/retrieve actions
- org browser action row now separates `Search Names` from `Refresh Explorer`, and a quick workflow block clarifies checkbox-first selection from search/browse into retrieve cart
- org browser metadata search now matches normalized naming patterns (for example, spaced query text against compact/underscored metadata names), and discovery warnings are shown directly in workspace cards
- desktop card/grid constraints now use wider auto-fit minima and wrapped preformatted text to reduce clipping in Ask, evidence, and diagnostics surfaces
- wave10 follow-up now enforces larger card-grid minimum widths and path-specific wrapping classes, reducing truncation in decision packets, citations, mapping diagnostics, and diagnostics artifacts
- refresh handoff is staged and fail-closed from browser selections
- flow grounding now prioritizes explicit flow-name asks over weak object-token inference (prevents false `no automation found for the` fallbacks)
- flow grounding now adds deterministic targeted evidence retry for explicit flow-name asks when first-pass evidence ranking misses the named flow
- proof history supports searchable labels and open-first artifact access
- CI heavy Windows jobs are path-gated for minute efficiency
- org-session refresh now only marks runtime unavailable on true runtime failures, so alias/preflight 4xx errors no longer masquerade as missing local tools
- session action labels now distinguish quick top-bar attach from explicit connect/switch controls in Org Sessions

Still unresolved:
- runtime/tooling state clarity still needs parity checks in non-connect workspaces
- planner/compiler still needs deeper typed coverage beyond current query families
- decision packet quality is not yet benchmark-accepted for approval use
- explain/analyze workflows still depend too much on raw JSON in edge cases
- layout/accessibility has remaining card-boundary and density defects
- release runbooks and clean-machine validation are not complete

Operational note:
- desktop smoke should run after desktop build completes; running both in parallel can produce a false process-exit readiness failure

## Regrouped 100% Completion Focus

This execution plan is now anchored to the regrouped scorecard in:
- `docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md`

Short version:
1. close runtime/session clarity debt
2. finish browser/retrieve operator workflow parity
3. deepen Ask grounding and packet quality
4. close layout/accessibility defects
5. burn down P0/P1 and finish release/operator proof

## Immediate Frontier (Next Slices)

1. Wave2 finish slice:
- lock runtime-unavailable vs tool-missing behavior across remaining workspace surfaces
- add explicit regression tests for readiness + org status surfaces

2. Wave10 finish slice:
- close remaining clipping/overflow issues on Ask/Analyze/Diagnostics cards
- lock viewport and long-string rendering tests

3. Wave4 finish slice:
- complete explorer-style browse parity and reduce action ambiguity in empty/partial catalog states

4. Wave6 finish slice:
- add regression coverage for explicit retrieved-flow asks (including real org naming patterns)
- reduce generic automation fallback cases that bypass named-flow grounding

5. Wave5 finish slice:
- close retrieve -> refresh -> diff handoff proof gaps for real-org workflows
- lock staged summaries and fail-closed guidance when handoff is incomplete

6. Wave7 start slice:
- improve decision-packet risk drivers and next actions for real-org review asks
- capture acceptance benchmark evidence with proof/replay IDs

## Remaining Stage 1 Product Gates

These outcomes still need explicit proof:
- Refresh and Build as a full operator workflow, not backend summary output
- Explain and Analyze as structured primary workflows
- Proofs and History without token-bookkeeping dependency
- Settings and Diagnostics with clear actionable triage paths
- packaged desktop shell as primary operator path

## Acceptance Checkpoints

### Checkpoint A
- `pnpm --filter api test`
- deterministic output contract remains green

### Checkpoint B
- `pnpm --filter web build`
- workspace rendering compiles cleanly

### Checkpoint C
- `pnpm desktop:build`
- Windows packaging remains green

### Checkpoint D
- `pnpm desktop:smoke:release`
- packaged shell proves startup, grounding, engine reachability, ask, proof/replay, and org session flow

### Checkpoint E
- selected Stage 1 benchmark workflow runs without raw JSON dependence
- measurable lift is captured
- packet is usable as primary review artifact

### Checkpoint F
- Sessions, Browser, Refresh/Build, Analyze, Proofs/History, and Diagnostics reach parity gates

## Verification Bar

Minimum for runtime or semantic changes:
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`

Required for semantic-runtime changes:
- deterministic replay parity
- proof integrity
- failure-mode clarity
- no hidden unconstrained fallback

## Stop Conditions

Stop and fix before continuing if:
- replay parity regresses
- proof identity/replay token stability regresses
- UI absorbs policy/decision logic
- packaged vs local divergence increases
- benchmark lift cannot be defined for active slice

## 90-Day Focus

- finish runtime/session/browser/refresh hardening
- deepen planner and decision packet quality
- complete workflow parity and operator-proof release readiness
