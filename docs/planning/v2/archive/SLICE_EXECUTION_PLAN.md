# Orgumented v2 Slice Execution Plan

Date: March 1, 2026
Selected slice:
- `High-Risk Change Review Packet Vertical Slice`

## Smallest Coherent Implementation Slice

Implement one benchmark workflow:
- high-risk field or object change review

Working operator question family:
- "What is the real risk of changing `Object.Field`?"
- "What breaks if we change `Object.Field`?"
- "Should we approve this high-risk change to `Object.Field` under the current snapshot and policy?"

Scope boundary:
- one review workflow
- one typed planner path for that workflow family
- one decision-packet presentation model in the desktop Ask flow

Do not include:
- governance automation
- approval-state persistence
- policy engine expansion
- broad UX redesign outside the selected packet workflow

## Likely Files and Modules

Engine:
- `apps/api/src/modules/planner/planner.service.ts`
- `apps/api/src/modules/planner/planner.types.ts`
- `apps/api/src/modules/ask/ask.service.ts`
- `apps/api/src/modules/ask/ask.types.ts`

UI:
- `apps/web/app/workspaces/ask/ask-workspace.tsx`
- `apps/web/app/workspaces/ask/use-ask-workspace.ts`
- `apps/web/app/workspaces/proofs/proofs-workspace.tsx`

Tests:
- `apps/api/test/planner.ts`
- `apps/api/test/integration.ts`
- `apps/api/test/phase12-replay-runtime.ts`

## Acceptance Tests Required

### Planner tests
- typed planner path recognizes the selected review-prompt family
- selected prompt family compiles to the intended engine calls deterministically
- mixed review prompts no longer depend only on regex-triggered routing

### Integration tests
- selected review prompt returns a structured decision packet with:
  - summary
  - top risk drivers
  - permission impact summary
  - automation impact summary
  - proof and replay identifiers
  - explicit next actions
- repeated identical review asks produce the same:
  - `proofId`
  - `replayToken`
  - key packet fields

### Desktop acceptance
- benchmark review workflow is usable without raw JSON inspection
- packet renders correctly in the desktop Ask workspace
- proof handoff into `Proofs & History` remains coherent

## Replay Protection Tests Required

- repeated identical review-prompt assertions in `apps/api/test/phase12-replay-runtime.ts`
- replay parity assertions for the selected review prompt family
- packet-field stability assertions for the selected review prompt family
- no nondeterministic timestamps or order-sensitive packet drift in the selected workflow

## Measurable Lift Validation Plan

Define one benchmark workflow and compare:
- current baseline path
- new review-packet path

Measure at minimum:
- time-to-trusted-answer
- number of manual evidence-gathering steps
- number of workspace/context switches required to complete the review

Optional supporting measure:
- operator confidence or trust rating during the benchmark review

Lift target:
- demonstrate a clear reduction in evidence-gathering friction for the selected scenario

## Stop Conditions

Stop and fix before proceeding if:
- replay parity regresses
- proof identity becomes unstable
- planner changes remain regex-only in practice
- the packet cannot support the review workflow without raw JSON fallback
- the UI starts absorbing business or policy logic
- runtime convergence regresses between dev and packaged desktop

## Completion Definition

This slice is complete only when:
- the selected benchmark review workflow works end-to-end in the desktop product
- deterministic replay protection stays green
- the packet is usable as the primary review artifact for that workflow
- measurable lift is captured and documented
