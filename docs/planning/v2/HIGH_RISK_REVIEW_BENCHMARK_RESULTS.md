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
- proxy time improved from `41ms` to `10ms`
- evidence steps dropped from `5` to `1`
- workspace switches dropped from `4` to `0`
- repeated identical review asks preserved:
  - `proofId`
  - `replayToken`
  - replay parity

Proxy comparison:
- proxy time delta: `31ms`
- proxy time improvement ratio: `0.7561`
- evidence-step delta: `4`
- workspace-switch delta: `4`

## Important Caveat

Both the fragmented baseline path and the review-packet path returned:
- `trustLevel = refused`

That means:
- the review packet clearly improves review assembly efficiency
- but the underlying benchmark snapshot still lacks enough deterministic grounding to cross the active policy envelope

So the current result proves:
- stronger workflow shape
- stable proof and replay behavior
- lower evidence-gathering friction

It does not yet prove:
- trusted approval support on this benchmark snapshot

## Interpretation

This is a meaningful Stage 1 signal, but not a complete win.

What is now proven:
- Orgumented can turn a fragmented high-risk review into one typed packet workflow
- the packet survives deterministic replay and proof lookup
- the packet reduces proxy evidence assembly effort materially

What still needs improvement:
- stronger grounding/evidence for the selected benchmark scenario
- human benchmark capture for operator confidence and real desktop timing

## Next Decision

The next best move is not broader scope.

It is:
1. improve grounding for the selected review workflow so the packet can clear the policy envelope when the snapshot supports it
2. capture one human benchmark run using the same scenario
3. only then decide whether the slice is ready to claim full Stage 1 lift proof
