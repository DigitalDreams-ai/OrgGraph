# Orgumented v2 Execution

Date: March 4, 2026

Execution master plan:
- `docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md`

## Wave Sequence

Execution order to reach 100% is fixed to:
- wave1 baseline lock
- wave2 runtime convergence
- wave3 sessions and toolchain reliability
- wave4 org browser explorer completion
- wave5 refresh and build handoff completion
- wave6 ask planner/compiler depth
- wave7 decision-packet quality
- wave8 explain/analyze workflow depth
- wave9 proofs/history productization
- wave10 design/layout/accessibility hardening
- wave11 bug burn-down and quality lock
- wave12 release readiness and operator proof
- wave13 stabilization window before Stage 2 decisions

## Current Objective

The current execution objective is:
- converge the desktop runtime
- preserve deterministic proof/replay behavior
- improve the planner/compiler and decision-packet quality
- prepare the product for real workflow adoption

This is not a feature-sprawl phase.

Execution branches should now follow:
- `dna-wave<N>-<short-slice-name>`

## Current State Summary

Materially true now:
- the desktop runtime is Windows-native
- Tauri + Next + Nest is the active product shape
- Docker is out of the product path
- core Ask/proof/replay flows are materially stronger than before
- desktop runtime smoke is the primary verification contract

Still unresolved:
- planner depth remains too shallow
- some runtime composition still reflects standalone Next-server assumptions
- decision-packet adoption in real workflows is not yet proven

Current concrete checkpoint:
- packaged desktop already uses the direct engine boundary
- browser-era route adapters are retired from the desktop runtime path
- the selected high-risk change review packet now compiles through a typed Ask planner path
- the selected review-query family now compiles through explicit change-action rules with stable compiler rule IDs instead of relying only on broad regex review signals
- the desktop Ask workspace now renders the review packet as the primary artifact, including risk drivers, permission impact, automation impact, change impact, and next actions
- the Explain and Analyze workspace now renders structured operator summaries for permissions, user-map diagnosis, automation, impact, and system-permission flows instead of depending on raw JSON inspection
- the Org Sessions workspace now exposes recent auth/session history and an explicit restore-last-session action instead of relying only on manual alias re-selection
- the Org Browser workspace now builds selective-retrieve payloads through a structured cart with visible-type bulk add and only exposes JSON as an advanced read-only preview
- the Refresh and Build workspace now keeps the Browser retrieve handoff visible, carries auto-refresh intent into rebuild defaults, and shows the staged retrieve -> refresh -> diff -> org-retrieve chain instead of isolated backend summaries
- the Settings and Diagnostics workspace now renders runtime health, org tooling/session state, meta-context weights, and meta-adapt before/after summaries instead of acting as a button-only debug surface
- the Proofs and History workspace now reopens recent decision artifacts through labeled history entries before exposing raw proof tokens
- desktop-managed API startup now bootstraps a deterministic fixture baseline when graph/evidence state is empty
- packaged runtime now bundles the fixture baseline and seeds the user principal map used by the benchmark workflow
- `/ready` now fails closed until the runtime has grounded graph and evidence state
- automated proxy benchmark evidence now shows both workflow-friction reduction and `trustLevel=trusted` for the selected review workflow
- desktop smoke already proves:
  - deterministic Ask identity
  - replay parity
  - proof provenance lookup
  - live org attach and restore flows

## Execution Principles

- preserve determinism first
- preserve proof and replay first
- prefer the smallest coherent slice
- do not widen scope while runtime convergence is still active
- use build-vs-borrow discipline before inventing new substrate

## Current Workstreams

### 1. Runtime convergence
- one desktop UI-to-engine boundary
- minimal browser-era seams
- no resurrection of route-adapter architecture

### 2. Planner/compiler improvement
- move beyond regex-heavy routing
- evaluate whether to stay custom in implementation or borrow grammar/reasoning tooling

### 3. Workflow adoption preparation
- decision packets must become easier to use in review and approval contexts
- proof/history and org-session flows should serve real operator decisions, not raw debugging only
- Stage 1 desktop workflows must reach parity without depending on raw JSON or token bookkeeping

### 4. Benchmark and lift discipline
- benchmark scenarios must be explicit before larger strategic claims
- measurable workflow lift must be captured on real Stage 1 scenarios
- `HIGH_RISK_REVIEW_BENCHMARK.md` is the active benchmark for the selected review-packet slice

## Recommended Immediate Sequence

### Slice 1
- prove the real-org flow through the packaged desktop UI, not only through direct API proof
- prove `Org Sessions` connect/switch against a real authenticated alias on the operator machine
- prove `Org Browser` catalog, member load, and selective retrieve flow in the desktop shell
- keep the retrieve handoff into `Refresh & Build`
- tighten one fail-closed real-org operator failure before returning to benchmark work

### Slice 2
- make Refresh and Build product-grade for the common desktop rebuild path
- keep rebuild, diff, and org-retrieve summaries readable without treating them as backend-only capability demos
- preserve the existing direct engine boundary while improving the desktop operator flow

### Slice 3
- preserve the new structured Settings and Diagnostics workflow as the primary operator path for runtime and semantic diagnostics
- keep org status, meta context, and meta adapt readable without regressing direct engine semantics
- protect the desktop boundary so diagnostic presentation does not alter runtime behavior

### Slice 4
- preserve the new structured Analyze workflow as the primary operator path
- keep deterministic replay and proof lookup stable while diagnostics, sessions, and benchmark evidence harden

### Slice 5
- use the selected-slice process in `docs/planning/v2/SLICE_SELECTION.md` and `docs/planning/v2/SLICE_EXECUTION_PLAN.md` before broadening scope again

## Active Branch and Immediate Focus

Active branch:
- `dna-real-org-session-sync`

Immediate execution pressure:
- prove the real-org retrieve handoff through the packaged desktop UI, not just the API path
- prove that `Org Browser` selective retrieve is visibly handed into `Refresh & Build`
- keep alias, parse path, metadata args, and auto-refresh intent readable without raw JSON inspection
- prove one fail-closed desktop path when retrieve state is incomplete or invalid
- preserve runtime convergence and packaged desktop parity while the handoff proof is captured
- keep failure states actionable when local `sf`/`cci` auth prerequisites are missing
- defer more fixture-benchmark iteration until real-org operator proof is materially stronger
- reduce `Org Browser` dependence on metadata-type-first operator knowledge

Current real-org checkpoint after PR #71:
- local alias inventory and preflight succeed against real sandbox aliases on this machine
- `shulman-uat` can be switched into the active session through the org session engine path
- selective retrieve for `CustomObject:Opportunity` completes against the real alias
- `Org Browser` catalog loads from the resulting parse tree
- the CustomObject member indexer now returns object names like `Opportunity` instead of nested field/listview file names
- desktop `Org Sessions` now treats parse-path absence as a browser warning instead of a connect blocker on first contact
- `Org Browser` and `Refresh & Build` now assess retrieve handoff readiness from the latest retrieve result and fail closed in the desktop shell when alias, parse path, or metadata args are missing
- the desktop `Org Sessions` client now preserves top-level `/org/*` payloads so `Refresh Overview` can show live tool, session, and preflight state instead of leaving stale `missing` or `unknown` placeholders after a successful backend response
- the remaining gap is direct desktop-shell operator proof of that retrieve handoff against the packaged UI
- the next real-org browser slice is to make metadata discovery name-first instead of type-first so operators can search for actual items like `Opportunity`, layouts, tabs, fields, and classes without already knowing the metadata type
- packaged startup drift-budget failures are now being addressed in Wave2 by forcing rebaseline during ungrounded runtime bootstrap recovery
- the next real-org session slice is to distinguish engine/runtime unavailability from actual `sf`, `cci`, or session failures so `Refresh Overview` stops presenting fake tool-missing state when the local desktop API cannot be reached
- the current session-status branch now clears stale overview state on failed refreshes and renders `runtime unavailable` in Org Sessions and the Operator Rail instead of implying that `sf` or `cci` are actually missing when the desktop engine is unreachable
- runtime readiness now includes explicit bootstrap-state checks, and `/ready` fails closed with `runtime bootstrap failed` when startup bootstrap cannot ground the runtime
- the next follow-on browser slice is to make those name-first results feel like a grouped explorer instead of a flat metadata API result list
- the current explorer slice now groups name-first matches by metadata family, emphasizes actual item names before metadata type labels, and lets operators add a member or family directly into the retrieve cart from the grouped explorer surface
- the current live-discovery follow-up now loads metadata families from the live org before any local parse tree is seeded, uses checkbox selection instead of mixed add/remove verbs, and keeps long paths/IDs readable inside the desktop cards instead of clipping
- the current tree-selection follow-up now uses one checkbox-first selection model across search and browse, auto-loads nested family members on expand, and stages retrieval through explicit checked-selection actions (`Load Explorer Tree`, `Search Explorer`, `Retrieve Checked`)
- the current wave4 explorer-tree follow-up now renders loaded members as nested folder-style trees (dot/slash segments) and allows checking any node to include all nested members in the retrieve cart
- the current Wave3 connect-hardening slice now scaffolds a CCI-compatible local project context for alias bridging, aligns bridge commands to deterministic `cci org import <sf-alias> <cci-alias>` semantics, and emits explicit remediation commands with the local sf-project path instead of warning-only dead ends
- the current Wave3 restore-hardening follow-up now derives restore targets from the last successful `connect`/`switch` audit event, preventing disconnected fallback aliases from masking the true restorable session after relaunch or failed switch attempts
- the current Wave3 preflight-autoheal follow-up now retries CCI alias bridge import during preflight and alias validation when sf auth is already healthy, reducing persistent `cci alias not connected` warnings after a successful local session
- the current Wave4 browser-search follow-up now keeps zero-member metadata families visible in live catalog/search responses so name-first queries like `layout` or `flow` remain predictable even before those families have retrieved members locally
- the current Wave10 layout-hardening slice now uses more resilient auto-fit card grids and stricter long-text wrapping to prevent clipped packet, diagnostics, and evidence content in constrained desktop work areas
- the current Wave6 flow-grounding slice now treats flow-name asks as first-class metadata questions by accepting spaced/underscored flow names and deriving explicit `reads`/`writes` summaries from retrieved flow evidence instead of falling back to generic automation-not-found phrasing
- the current Wave5 refresh-handoff slice now carries staged Browser selections into `Run Org Retrieve` and fails closed in the UI when retrieve handoff context or staged selections are missing, replacing opaque `400 metadata selections required` backend failures with direct operator guidance

## Remaining Stage 1 Product Gates

The following product outcomes still need to be explicit in execution, not just implied:
- Refresh and Build must be first-class desktop workflows
- Explain and Analyze must work as operator workflows rather than backend capability demos
- Proofs and History must be accessible through labeled history instead of manual ID/token tracking
- Settings and Diagnostics must expose runtime and tool health clearly
- the packaged desktop shell must remain the primary operator path, with standalone dev-server behavior treated as secondary verification only

## Acceptance Checkpoints

### Checkpoint A
- `pnpm --filter api test`
- deterministic output contract remains green

### Checkpoint B
- `pnpm --filter web build`
- desktop Ask workflow and packet rendering compile cleanly

### Checkpoint C
- `pnpm desktop:build`
- Windows packaging remains green

### Checkpoint D
- `pnpm desktop:smoke:release`
- packaged shell still proves:
  - startup
  - grounded runtime bootstrap
  - engine reachability
  - Ask
  - proof and replay
  - org-session flow

### Checkpoint E
- selected Stage 1 benchmark workflow completes without raw JSON dependence
- measurable lift is captured
- the high-risk change review packet is usable as the primary review artifact

### Checkpoint F
- core desktop workflows reach parity:
  - Sessions
  - Browser selective retrieve
  - Refresh/Build
  - Analyze
  - Proofs/History
  - Settings/Diagnostics

### Checkpoint G
- proof/history access works through labeled history rather than manual opaque token tracking
- desktop shell remains the primary operator path in both messaging and verification

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
- no hidden fallback from constrained to unconstrained logic

Harnesses to preserve and extend:
- `apps/api/test/phase12-replay-runtime.ts`
- `apps/api/test/integration.ts`
- `apps/api/test/planner.ts`
- `apps/api/test/semantic-runtime.ts`

Harness upgrades still expected:
1. repeated identical ask assertions
2. stable proof identity assertions
3. stable replay-token assertions
4. benchmark workflow packet-stability assertions
5. boundary tests proving UI transport changes do not alter engine outputs
6. labeled-history access tests for proof/replay lookup
7. selective-retrieve workflow tests

## 90-Day Focus

### Focus A
- runtime convergence and shell-owned desktop verification

### Focus B
- planner/compiler strengthening

### Focus C
- decision-packet adoption proof on benchmark workflows plus workflow parity for Sessions, Browser, Refresh/Build, Analyze, Proofs/History, and Diagnostics

### Focus D
- policy-aware approval support only if A-C are materially strong

## Stop Conditions

Stop and fix before proceeding if:
- replay parity regresses
- deterministic proof identity regresses
- UI logic starts absorbing policy or decision logic
- runtime divergence between dev and packaged desktop increases
- new work expands browser-era seams instead of reducing them
- benchmark lift cannot be defined for the active Stage 1 slice
- planner claims improve on paper but remain regex-heavy in practice

## Execution Outcome Target

At the end of the current v2 execution phase, Orgumented should be easy to describe:
- one desktop product runtime
- one explicit semantic engine boundary
- strong replayable decision packets
- a clearer path from trusted decisions to approval support
