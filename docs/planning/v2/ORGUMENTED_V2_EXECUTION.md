# Orgumented v2 Execution

Date: March 1, 2026

## Current Objective

The current execution objective is:
- converge the desktop runtime
- preserve deterministic proof/replay behavior
- improve the planner/compiler and decision-packet quality
- prepare the product for real workflow adoption

This is not a feature-sprawl phase.

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
- capture one human benchmark run for the trusted high-risk review workflow
- record operator timing, confidence, raw-JSON dependence, and workflow friction through `pnpm phase17:benchmark:human`
- keep the benchmark replay-linked to the current proof and replay artifacts
- publish the resulting human benchmark artifact into the canonical results surface through `pnpm phase17:benchmark:human:publish`
- use `pnpm phase17:benchmark:human:finalize` as the normal closeout path so publication and provenance verification stay coupled
- fail closed on synthetic smoke evidence so the canonical benchmark record cannot be updated from placeholder runs

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
- no new feature branch is required until the first real human benchmark run is captured
- `main` is the current benchmark-evidence baseline

Immediate execution pressure:
- execute one real human benchmark run against the prepared capture template
- publish canonical benchmark results from real artifacts rather than handwritten markdown edits
- preserve the capture-template provenance now carried into the canonical results surface
- keep a fail-closed verifier command available so Stage 1 lift claims can be checked from artifacts instead of inspection alone
- keep the one-command finalize path available so publication and verification do not drift apart operationally
- keep the human benchmark capture and publication workflow replay-linked while manual evidence is recorded
- preserve the grounded-start runtime contract that now makes the benchmark query trusted on packaged desktop
- preserve runtime convergence and packaged desktop parity while benchmark evidence is captured
- keep the review packet usable as the primary artifact without raw JSON dependence
- avoid widening into Stage 2 governance or policy automation before the Stage 1 lift proof exists

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
