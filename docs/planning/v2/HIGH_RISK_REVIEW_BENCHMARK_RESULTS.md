# High-Risk Review Benchmark Results

Date: 2026-03-18
Artifacts:
- `logs/high-risk-review-benchmark.json`

## Provenance Binding

Acceptance mode:
- `proxy_only`

Proxy artifact:
- path: `logs/high-risk-review-benchmark.json`
- hash: `e1ad2e3f8d7a2ab553045f80277539e579892e1bf9a853a25bc6af8cc03ce57b`

## Latest Automated Proxy Run

Runtime mode:
- auto-launched-packaged

Scenario:
- `Should we approve changing Opportunity.StageName for jane@example.com?`

## Automated Proxy Summary

The typed review-packet path materially reduced workflow friction on the automated proxy benchmark:
- proxy time improved from `173ms` to `20ms`
- evidence steps dropped from `5` to `1`
- workspace switches dropped from `4` to `0`
- repeated identical review asks preserved:
  - `proofId`
  - `replayToken`
  - replay parity
- review packet recommendation verdict: `do_not_approve_yet`
- review packet recommendation summary: `Do not approve yet. Resolve: jane@example.com has no deterministic permission grant path for Opportunity.StageName.`
- review packet evidence gaps visible: `1`
- review packet specificity guard: `pass`
- review packet recommendation present: `pass`
- both baseline and review-packet asks returned:
  - `trustLevel = trusted`

Proxy comparison:
- proxy time delta: `153ms`
- proxy time improvement ratio: `0.8844`
- evidence-step delta: `4`
- workspace-switch delta: `4`

## Human Benchmark Capture

Status:
- `not required for current Wave 7 acceptance`
- `not collected in this publication`

Reason:
- Human timing on test data is not treated as a reliable Stage 1 acceptance metric.
- Proxy evidence plus deterministic packet-quality gates are the canonical acceptance basis for this benchmark.

## Publication Discipline

- generated from artifacts with `pnpm phase17:benchmark:human:publish`
- manual transcription into this file is not allowed
- human capture remains optional exploratory evidence and is not required for canonical proxy-only publication

Proxy notes:
- This harness captures deterministic API-path proxy metrics for the benchmark workflow.
- Human operator confidence and real desktop timing still need to be recorded separately when formal benchmark evidence is captured.
