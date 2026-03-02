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
- the desktop Ask workspace now renders the review packet as the primary artifact, including risk drivers, permission impact, automation impact, change impact, and next actions
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
- capture human benchmark evidence for the same workflow now that the packaged runtime clears the policy envelope
- use `pnpm phase17:benchmark:human` so the human benchmark output is a repeatable artifact rather than a free-form note
- run the benchmark against an already grounded desktop runtime instead of depending on implicit shell auto-launch

### Slice 2
- strengthen planner/compiler depth beyond the regex-heavy baseline only where the selected workflow still needs it

### Slice 3
- keep runtime convergence green while human benchmark capture and planner depth work proceed

### Slice 4
- use the selected-slice process in `docs/planning/v2/SLICE_SELECTION.md` and `docs/planning/v2/SLICE_EXECUTION_PLAN.md` before broadening scope again

## Active Branch and Immediate Focus

Active branch:
- `dna-high-risk-review-grounding`

Immediate execution pressure:
- preserve the grounded-start runtime contract that now makes the benchmark query trusted on packaged desktop
- capture human benchmark evidence for the same review workflow
- keep the human benchmark capture structured and replay-linked
- preserve runtime convergence and packaged desktop parity while the new grounding path is added
- keep the review packet usable as the primary artifact without raw JSON dependence
- avoid widening into Stage 2 governance or policy automation before the Stage 1 lift proof exists

## Remaining Stage 1 Product Gates

The following product outcomes still need to be explicit in execution, not just implied:
- Org Sessions must feel product-grade for attach, switch, disconnect, and restore
- Org Browser must support org-wide selective retrieve
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
