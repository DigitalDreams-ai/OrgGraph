# Human Benchmark Capture

Date: March 2, 2026

## Purpose

This runbook captures the first real Stage 1 human benchmark result for the trusted high-risk review workflow.

It is for one scenario only:
- `Should we approve changing Opportunity.StageName for jane@example.com?`

Do not widen the scenario while Stage 1 lift proof is still open.

## Preconditions

- Windows desktop runtime is available on this machine
- packaged desktop smoke is green
- the benchmark query is already trusted on the packaged runtime
- the operator will execute both:
  - baseline path
  - review-packet path

## Commands

From the repo root:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm phase17:benchmark:human:session -- --operator "<name>"
```

That command:
- runs packaged desktop smoke unless told not to
- refreshes the proxy benchmark
- writes the prepared capture template
- prints the exact human capture command to run after the manual desktop review

After the operator finishes the two manual paths, record the results with:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "<name>" --baseline-time-ms <ms> --baseline-evidence-steps <n> --baseline-workspace-switches <n> --baseline-raw-json yes --baseline-confidence <1-5> --review-time-ms <ms> --review-evidence-steps <n> --review-workspace-switches <n> --review-raw-json no --review-confidence <1-5> --notes "<observation>"
pnpm phase17:benchmark:human:publish
pnpm phase17:benchmark:human:verify
```

## Manual Capture Rules

For the baseline path:
- use the fragmented review flow
- record real elapsed time
- count each explicit evidence-gathering action
- count each workspace/context switch
- record whether raw JSON inspection was required
- score confidence from `1` to `5`

For the review-packet path:
- use the typed high-risk review workflow in Ask
- only open additional surfaces if the packet is not sufficient
- record the same five measures

## Required Artifacts

The run should produce:
- `logs/high-risk-review-human-capture-template.json`
- `logs/high-risk-review-human-capture-template.md`
- `logs/high-risk-review-human-benchmark.json`
- `logs/high-risk-review-human-benchmark.md`
- updated canonical publication:
  - `docs/planning/v2/HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md`

## Fail-Closed Expectations

Do not override these protections:
- the capture must match the prepared query
- the capture must match the prepared proxy-artifact hash
- the capture must match the prepared proof and replay anchors
- canonical publication must not be generated from synthetic-only evidence

If any of those fail, stop and fix the mismatch before claiming a Stage 1 result.

## Pass Criteria

The review-packet path only counts as Stage 1 lift if:
- time-to-trusted-answer improves by at least `40%`
- evidence steps drop by at least `2`
- workspace switches drop by at least `1`
- raw JSON dependence is eliminated
- operator confidence is not worse than baseline
- replay parity remains stable
- proof identity remains stable

## Output Handling

- keep the raw JSON and markdown artifacts in `logs/`
- treat `docs/planning/v2/HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md` as the canonical published surface
- do not hand-edit benchmark numbers into the canonical results doc
- use `pnpm phase17:benchmark:human:verify` after publication to confirm the canonical results surface still matches the real human artifact
