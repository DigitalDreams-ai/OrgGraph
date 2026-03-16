# Orgumented v2 Slice Selection

Date: March 1, 2026
Scoring authority:
- `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`

## Winner

Selected slice:
- `High-Risk Change Review Packet Vertical Slice`

## Why This Slice Wins

It is the highest-scoring slice that:
- scores above the 80 percent threshold
- preserves deterministic integrity
- materially improves planner depth
- materially improves decision-packet workflow fit
- stays inside Stage 1

Weighted result:
- `435.00 / 500.00 = 87.00%`

Why it wins over the others:
- it is the only candidate that attacks the two current product bottlenecks together:
  - shallow planner depth
  - weak decision-packet workflow adoption
- it creates a real artifact for one benchmark high-risk review workflow instead of improving infrastructure in isolation
- it does not require governance expansion, policy-first posture, or broad runtime re-platforming

## Why Other Slices Were Deferred

### Core Ask Compiler v1
- strong planner work
- too weak on workflow-fit improvement
- score stayed below the 80 percent selection bar

### Desktop Dev/Packaged Runtime Single-Boundary Convergence
- very strong runtime slice
- too weak on planner depth and workflow adoption
- remains important support work, but not the best immediate Stage 1 winner

### Stage 1 Benchmark Lift Harness
- strong measurement slice
- too indirect on planner depth and packet usability
- should follow or accompany a product slice, not lead it

## Stage Discipline

Stage strengthened:
- Stage 1: Trusted Change Decision Engine

Why it is not premature:
- it improves a real trusted-decision workflow
- it does not claim approval automation
- it does not claim governance authority
- it does not introduce policy gating or enforcement posture

## Acceptance Gates

The selected slice should only be considered complete if all of the following are true:
- one benchmark high-risk review workflow has a dedicated typed planner path
- the decision packet exposes:
  - decision summary
  - top risk drivers
  - impacted automation summary
  - permission impact summary
  - proof and replay context
  - explicit next actions
- the workflow can be completed in the desktop UI without raw JSON inspection
- repeated identical review asks keep stable proof identity
- replay parity remains green for the selected prompt family
- measurable lift is recorded for the benchmark workflow

## Kill-Switch Criteria

Stop immediately if:
- replay parity regresses
- proof identity diverges on repeated identical review asks
- the implementation drifts into Stage 2 approval automation language
- the UI starts owning policy or decision logic
- the slice broadens into a general workflow redesign instead of one benchmark review path
- runtime convergence regresses between dev and packaged desktop

## Immediate Next Move

Proceed to a narrow execution plan for this slice only.
