# High-Risk Review Benchmark

Date: March 1, 2026

## Purpose

This benchmark exists to prove whether the high-risk change review packet actually creates Stage 1 operator lift.

It measures one benchmark workflow:
- high-risk field-change review for `Opportunity.StageName`

It does not measure:
- governance automation
- approval-state persistence
- policy engine expansion
- broad UX polish

## Benchmark Scenario

Operator question:
- "Should we approve changing `Opportunity.StageName` for `jane@example.com`?"

Expected packet outcome:
- one deterministic review packet
- explicit risk level
- explicit top risk drivers
- permission impact summary
- automation impact summary
- change impact summary
- proof and replay identifiers
- explicit next actions

## Comparison Paths

### Baseline path

This is the pre-packet review path that Orgumented should beat.

Operator flow:
1. run a generic Ask query
2. inspect impact separately
3. inspect automation separately
4. inspect permissions separately
5. open proof/history separately
6. manually assemble a review recommendation

Expected pain:
- more evidence gathering steps
- more workspace switching
- more reliance on raw JSON or fragmented answers

### Review-packet path

This is the new benchmark path.

Operator flow:
1. run the typed high-risk review query
2. read the review packet in Ask
3. open proof only if deeper verification is needed

Expected gain:
- fewer manual evidence assembly steps
- lower workspace/context switching
- faster time-to-trusted-answer

## Metrics

Measure all of the following for both paths:

1. time-to-trusted-answer
2. manual evidence-gathering steps
3. workspace/context switches
4. raw JSON dependence
5. operator confidence rating

### Definitions

`time-to-trusted-answer`
- elapsed time from first query submission to the point where the operator can state an approval recommendation with proof and replay identifiers available

`manual evidence-gathering steps`
- count of explicit operator actions required to gather permissions, automation, impact, and proof context

`workspace/context switches`
- count of times the operator must leave the current review surface to gather the missing evidence needed for the recommendation

`raw JSON dependence`
- whether the operator must inspect raw payload JSON to complete the workflow

`operator confidence rating`
- subjective 1-5 confidence score after completing the workflow

## Success Thresholds

The review-packet path passes only if it achieves all of the following:

- replay parity remains 100 percent
- proof identity remains stable for repeated identical review asks
- time-to-trusted-answer improves by at least 40 percent versus baseline
- manual evidence-gathering steps are reduced by at least 2
- workspace/context switches are reduced by at least 1
- raw JSON dependence is eliminated
- operator confidence is not worse than baseline

## Capture Template

Use one row per run.

| Run Date | Path | Query | Time To Trusted Answer | Evidence Steps | Workspace Switches | Raw JSON Needed | Confidence 1-5 | Proof ID | Replay Token | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | baseline | Should we approve changing Opportunity.StageName for jane@example.com? | | | | yes/no | | | | |
| YYYY-MM-DD | review-packet | Should we approve changing Opportunity.StageName for jane@example.com? | | | | yes/no | | | | |

## Evidence Artifacts

Capture at minimum:
- packaged desktop smoke proof for the branch head
- one Ask proof artifact for the benchmark query
- one replay verification result for the benchmark query
- one notes block comparing baseline vs review-packet path

Automated proxy harness:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:smoke:release
pnpm phase17:benchmark
```

Default artifact:
- `logs/high-risk-review-benchmark.json`

What the harness captures:
- API-path proxy timing for the fragmented baseline path
- API-path proxy timing for the review-packet path
- deterministic proof stability across repeated identical review asks
- replay parity for the review-packet proof

Harness runtime behavior:
- expects `http://127.0.0.1:3100/ready` to already be grounded before the benchmark starts
- the recommended path is to establish that state through the packaged desktop shell or `pnpm desktop:smoke:release`
- packaged auto-launch is available only as an explicit best-effort fallback with `ORGUMENTED_BENCHMARK_LAUNCH_PACKAGED=1`

What still requires human capture:
- real desktop operator timing
- operator confidence rating
- any nuance about whether the packet was sufficient without further drill-down

Human capture command:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:smoke:release
pnpm phase17:benchmark
pnpm phase17:benchmark:human -- --operator "<name>" --baseline-time-ms <ms> --baseline-evidence-steps <n> --baseline-workspace-switches <n> --baseline-raw-json yes --baseline-confidence <1-5> --review-time-ms <ms> --review-evidence-steps <n> --review-workspace-switches <n> --review-raw-json no --review-confidence <1-5> --notes "<observation>"
```

Human capture outputs:
- `logs/high-risk-review-human-benchmark.json`
- `logs/high-risk-review-human-benchmark.md`

What the human capture command does:
- reads the latest automated proxy artifact
- records the operator-observed baseline and review-packet timings
- preserves proof and replay identifiers alongside the human notes
- evaluates the Stage 1 pass/fail thresholds automatically

Preferred artifact locations:
- `logs/`
- proof and replay artifacts retrieved through the desktop product

## Stop Conditions

Stop and fix before broadening scope if:
- the packet still requires raw JSON inspection
- repeated identical review asks drift in proof identity or replay token
- the review packet does not beat baseline on at least two workflow-friction measures
- the packet looks cleaner but does not reduce evidence assembly effort

## Current Status

Current branch status:
- typed planner path exists
- deterministic review packet exists
- desktop Ask renders the packet as the primary artifact
- replay parity protection is green
- automated proxy benchmark capture is now available through `pnpm phase17:benchmark`
- latest proxy run is summarized in `HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md`
- human benchmark evidence is still required before claiming full Stage 1 lift proof

## Bottom Line

This benchmark is the gate between:
- "Orgumented can produce a better-looking review packet"

and

- "Orgumented materially improves one real Stage 1 architecture-review workflow"
