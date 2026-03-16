# Orgumented v2 Slice Candidates

Date: March 1, 2026
Scoring authority:
- `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`

Purpose:
- replace the abandoned broad semantic-stack initiative with focused, executable Stage 1 slices

## Slice 1 — Core Ask Compiler v1

### Problem it solves
- the current planner is still regex-heavy and too shallow to support stronger Stage 1 claims
- intent routing in `apps/api/src/modules/planner/planner.service.ts` is still based on string heuristics rather than a more explicit compiler path

### Likely files/modules touched
- `apps/api/src/modules/planner/planner.service.ts`
- `apps/api/src/modules/planner/planner.types.ts`
- `apps/api/test/planner.ts`
- `apps/api/test/integration.ts`
- `apps/api/test/phase12-replay-runtime.ts`

### Why this directly improves Stage 1
- Stage 1 requires a trusted change decision engine
- a stronger compiler path improves deterministic query interpretation without expanding into governance or policy claims

### Acceptance gates
- no core Ask intent for `perms`, `automation`, `impact`, or `mixed` relies only on regex matching
- replay parity remains green for repeated identical asks
- planner outputs are benchmarked for stable routing on the existing benchmark corpus
- no runtime divergence between dev and packaged desktop

### Replay parity protection
- repeated-identical-ask tests remain mandatory
- replay parity tests must cover the migrated compiler path

### Measurable lift hypothesis
- improved intent compilation accuracy and lower misrouting on benchmark Ask scenarios
- clearer blast-radius and mixed-risk routing for high-risk questions

### Risk of overreach
- could drift into a broad DSL rewrite if not tightly scoped
- could become compiler-for-compiler’s-sake if not tied to specific Ask benchmark outcomes

## Slice 2 — High-Risk Change Review Packet Vertical Slice

### Problem it solves
- current decision packets are structurally strong but not yet the obvious artifact for a real review workflow
- the planner is also too shallow for high-risk change review prompts, especially mixed questions that combine impact, permissions, and automation

### Likely files/modules touched
- `apps/api/src/modules/planner/planner.service.ts`
- `apps/api/src/modules/planner/planner.types.ts`
- `apps/api/src/modules/ask/ask.service.ts`
- `apps/api/src/modules/ask/ask.types.ts`
- `apps/api/test/planner.ts`
- `apps/api/test/integration.ts`
- `apps/api/test/phase12-replay-runtime.ts`
- `apps/web/app/workspaces/ask/ask-workspace.tsx`
- `apps/web/app/workspaces/ask/use-ask-workspace.ts`
- `apps/web/app/workspaces/proofs/proofs-workspace.tsx`

### Why this directly improves Stage 1
- it strengthens the trusted change-decision engine on one real high-risk workflow
- it improves planner depth and packet usability together instead of improving one while leaving the other weak
- it creates a real Stage 1 artifact for architectural review without making governance claims

### Acceptance gates
- one benchmark workflow for high-risk field/object change review has a dedicated typed planner path
- the Ask packet surfaces:
  - decision summary
  - top risk drivers
  - impacted automation summary
  - permission impact summary
  - proof and replay references
  - explicit next actions
- repeated identical review asks keep stable proof identity and replay parity
- operator can complete the benchmark review workflow without raw JSON inspection

### Replay parity protection
- replay tests for the review prompt family
- stable proof identity assertions for repeated identical review asks
- packet-field stability assertions for repeated identical review asks

### Measurable lift hypothesis
- reduce time-to-trusted-answer for one benchmark release-review scenario
- reduce manual evidence-gathering steps by consolidating proof, automation, and permission drivers into one packet
- improve operator trust because the packet becomes a usable review artifact

### Risk of overreach
- could drift into Stage 2 approval-support language if framed as “approval automation”
- could expand into broad UI redesign if not kept to one review workflow

## Slice 3 — Desktop Dev/Packaged Runtime Single-Boundary Convergence

### Problem it solves
- the desktop runtime is much better, but development still depends on a standalone Next server in `apps/desktop/scripts/dev-runtime.mjs`
- the current runtime convergence pressure remains active in the v2 execution plan

### Likely files/modules touched
- `apps/desktop/scripts/dev-runtime.mjs`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/tauri.conf.json`
- `scripts/desktop-release-smoke.ps1`
- `docs/runbooks/DESKTOP_DEV_RUNTIME.md`

### Why this directly improves Stage 1
- Stage 1 trust is weakened if the runtime story differs between dev and packaged desktop
- stronger runtime convergence increases confidence that Ask, proof, and replay behavior are truly product-level

### Acceptance gates
- dev and packaged desktop hit the same explicit engine boundary for core flows
- desktop smoke remains green
- no new browser-era seams or route adapters appear
- startup reliability improves without weakening replay protection

### Replay parity protection
- desktop smoke must continue to assert deterministic Ask proof identity and replay parity
- any dev-runtime change must not change Ask outputs for the same snapshot and query

### Measurable lift hypothesis
- lower startup/debug friction for local development
- fewer parity defects found late in packaged verification

### Risk of overreach
- could become packaging churn with low operator-visible lift
- does not materially improve planner depth or packet workflow fit on its own

## Slice 4 — Stage 1 Benchmark Lift Harness

### Problem it solves
- Orgumented still lacks strong workflow-level evidence for time-to-trusted-answer and evidence-gathering reduction
- current strategy and governance docs require measurable lift, but the benchmark harness is still weak

### Likely files/modules touched
- `apps/api/test/integration.ts`
- `apps/api/test/phase12-replay-runtime.ts`
- `scripts/desktop-release-smoke.ps1`
- `docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md`
- `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`

### Why this directly improves Stage 1
- Stage 1 requires proof that the trusted decision engine creates real lift, not just elegant architecture
- a benchmark harness is the fastest way to make lift measurable without jumping to governance claims

### Acceptance gates
- benchmark scenarios are explicit and repeatable
- baseline and post-change packet results are comparable
- replay parity remains part of the benchmark harness
- at least one workflow-level lift metric is captured

### Replay parity protection
- replay parity is part of the benchmark harness, not a separate afterthought
- every benchmark scenario must include proof/replay verification

### Measurable lift hypothesis
- Orgumented can quantify improvement in time-to-trusted-answer and evidence assembly for at least one benchmark scenario

### Risk of overreach
- can devolve into measurement work without product improvement
- does not directly deepen the planner or improve packet usability unless paired with another slice
