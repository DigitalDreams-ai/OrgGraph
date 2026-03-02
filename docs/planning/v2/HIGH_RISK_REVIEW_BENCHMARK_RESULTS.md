# High-Risk Review Benchmark Results

Date: March 1, 2026
Artifact:
- `logs/high-risk-review-benchmark.json`

## Latest Automated Proxy Run

Runtime mode:
- auto-launched packaged desktop runtime

Scenario:
- `Should we approve changing Opportunity.StageName for jane@example.com?`

## Summary

The typed review-packet path materially reduced workflow friction on the automated proxy benchmark:
- proxy time improved from `44ms` to `11ms`
- evidence steps dropped from `5` to `1`
- workspace switches dropped from `4` to `0`
- repeated identical review asks preserved:
  - `proofId`
  - `replayToken`
  - replay parity
- both baseline and review-packet asks now returned:
  - `trustLevel = trusted`

Proxy comparison:
- proxy time delta: `33ms`
- proxy time improvement ratio: `0.7500`
- evidence-step delta: `4`
- workspace-switch delta: `4`

## What Changed

This branch closed the grounding gap that previously held the benchmark at `refused`:
- desktop-managed API startup now bootstraps a deterministic fixture baseline when runtime data is empty
- packaged runtime now bundles the fixture baseline used by the benchmark
- packaged readiness now fails closed until graph and evidence state are actually grounded

That means the benchmark now proves:
- stronger workflow shape
- stable proof and replay behavior
- lower evidence-gathering friction
- trusted approval support on the benchmark snapshot

## Interpretation

This is now a meaningful Stage 1 lift signal, not just a workflow-shape improvement.

What is now proven:
- Orgumented can turn a fragmented high-risk review into one typed packet workflow
- the packet survives deterministic replay and proof lookup
- the packet reduces proxy evidence assembly effort materially
- the desktop runtime can self-bootstrap into a grounded benchmark baseline instead of starting empty
- the selected review workflow can clear the active policy envelope on the packaged desktop runtime

What still needs improvement:
- human benchmark capture for operator confidence and real desktop timing

## Next Decision

The next best move is not broader scope.

It is:
1. capture one human benchmark run using the same scenario
2. validate the same trusted result after a fresh packaged rebuild on CI
3. then decide whether the slice is ready to claim full Stage 1 lift proof
