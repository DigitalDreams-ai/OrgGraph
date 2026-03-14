# High-Risk Review Benchmark Results

Date: 2026-03-03
Artifacts:
- `logs/high-risk-review-benchmark.json`
- `logs/high-risk-review-human-benchmark.json`

## Provenance Binding

Prepared capture template:
- path: `logs/high-risk-review-human-capture-template.json`
- signature: `6fd01d3b22e1f2a597bdff693f71635f3b48ce75b51450344a0ff8a5fe8852e6`
- proxy artifact hash: `7672b5d5305a1a7ca640b4081ec5d8d2f043044fcdde41009bee69d840a58dfb`

## Latest Automated Proxy Run

Runtime mode:
- existing-runtime

Scenario:
- `Should we approve changing Opportunity.StageName for jane@example.com?`

## Automated Proxy Summary

The typed review-packet path materially reduced workflow friction on the automated proxy benchmark:
- proxy time improved from `64ms` to `8ms`
- evidence steps dropped from `5` to `1`
- workspace switches dropped from `4` to `0`
- repeated identical review asks preserved:
  - `proofId`
  - `replayToken`
  - replay parity
- review packet recommendation verdict: `n/a`
- review packet recommendation summary: `n/a`
- review packet evidence gaps visible: `n/a`
- review packet specificity guard: `pass`
- review packet recommendation present: `fail`
- both baseline and review-packet asks returned:
  - `trustLevel = trusted`

Proxy comparison:
- proxy time delta: `56ms`
- proxy time improvement ratio: `0.8750`
- evidence-step delta: `4`
- workspace-switch delta: `4`

## Human Benchmark Capture

Operator:
- `Sean`

| Path | Time To Trusted Answer | Evidence Steps | Workspace Switches | Raw JSON Needed | Confidence 1-5 | Proof ID | Replay Token |
| --- | ---: | ---: | ---: | --- | ---: | --- | --- |
| baseline | 400ms | 1 | 2 | no | 4 | proof_60fbbf277ca9e18ff163f11d | trace_393b10a771b0be0fa3cb6b53 |
| review-packet | 9200ms | 2 | 2 | no | 4 | proof_36472fe1990f782282784498 | trace_f2581a7eb6eda19e90bf4c8a |

## Threshold Check

| Gate | Result |
| --- | --- |
| repeated ask stable | pass |
| replay parity | pass |
| proof identity stable | pass |
| review packet specificity | fail |
| time improved by at least 40% | fail |
| evidence steps reduced by at least 2 | fail |
| workspace switches reduced by at least 1 | fail |
| raw JSON eliminated | pass |
| confidence not worse than baseline | pass |

## Interpretation

Human comparison:
- time improvement ratio: `-2200.0%`
- evidence-step delta: `-1`
- workspace-switch delta: `0`
- confidence delta: `0`
- overall result: `FAIL`
- benchmark query matched prepared template: `Should we approve changing Opportunity.StageName for jane@example.com?`

Proxy notes:
- This harness captures deterministic API-path proxy metrics for the benchmark workflow.
- Human operator confidence and real desktop timing still need to be recorded separately when formal benchmark evidence is captured.

Human notes:
- Review packet was enough; no extra workspace switch needed.

## Publication Discipline

- generated from artifacts with `pnpm phase17:benchmark:human:publish`
- manual transcription into this file is not allowed
- synthetic or smoke-only human artifacts are rejected unless `--allow-synthetic` is used for a non-canonical preview
