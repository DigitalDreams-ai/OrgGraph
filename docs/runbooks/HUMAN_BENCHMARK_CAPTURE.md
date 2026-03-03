# Human Benchmark Capture

Date: March 2, 2026

## Purpose

This runbook captures the first real Stage 1 human benchmark result for the trusted high-risk review workflow.

Operator worksheet:
- `docs/runbooks/HUMAN_BENCHMARK_OPERATOR_FORM.md`

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

## What You Will Do

1. Start a clean benchmark session.
2. Wait for Orgumented to open and close once during automated smoke.
3. Wait for the session command to finish printing the human capture command.
4. Open the generated operator worksheet.
5. Perform the baseline path and record the numbers.
6. Perform the review-packet path and record the numbers.
7. Run the printed capture command.
8. Run `pnpm phase17:benchmark:human:finalize`.

Do not skip steps.

## Step 1: Start A Clean Session

Use bash for all commands in this runbook.

Bash:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm phase17:benchmark:human:reset
pnpm phase17:benchmark:human:session -- --operator "Sean"
```

PowerShell fallback only:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm phase17:benchmark:human:reset
pnpm phase17:benchmark:human:session -- --operator "Sean"
```

What to expect:
- archives stale human benchmark artifacts into `logs/archive/phase17-human-benchmark/<timestamp>/`
- preserves the current proxy benchmark artifact during the reset step
- launches packaged desktop smoke
- opens Orgumented briefly and closes it automatically during smoke
- relaunches packaged runtime for the proxy benchmark
- leaves Orgumented open for your manual review after bootstrap completes
- writes the prepared capture template
- prints the exact human capture command you will run later

Do not interrupt the command unless it clearly errors.

## Step 2: Confirm Session Output

Before you do any manual review, confirm all of these exist:

- `logs/high-risk-review-human-capture-template.json`
- `logs/high-risk-review-human-capture-template.md`
- `logs/high-risk-review-benchmark.json`
- an Orgumented desktop window is still open and usable

If any of those files are missing, stop and report the error instead of continuing.

## Step 3: Open The Operator Worksheet

Use:
- `docs/runbooks/HUMAN_BENCHMARK_OPERATOR_FORM.md`

Fill it in as you perform the manual workflow.

## Step 4: Perform The Baseline Path

Do this first.

1. Run a generic Ask query for the scenario.
2. Gather missing evidence separately:
   - impact
   - automation
   - permissions
   - proof/history
3. Stop timing when you can state an approval recommendation and you have proof and replay identifiers.
4. Record the numbers in the operator form.

Record:
- elapsed time in milliseconds
- number of evidence-gathering steps
- number of workspace switches
- whether raw JSON was required
- confidence from `1` to `5`

## Step 5: Perform The Review-Packet Path

Do this second.

1. Run the typed high-risk review query in Ask.
2. Read the review packet.
3. Open proof/history only if you genuinely need more evidence.
4. Stop timing when you can state an approval recommendation and you have proof and replay identifiers.
5. Record the numbers in the operator form.

Record the same five measures:
- elapsed time in milliseconds
- number of evidence-gathering steps
- number of workspace switches
- whether raw JSON was required
- confidence from `1` to `5`

## Step 6: Submit The Human Capture

After the operator form is complete, run the exact capture command printed by the session command.

If you need the default shape, use bash:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "Sean" --baseline-time-ms <ms> --baseline-evidence-steps <n> --baseline-workspace-switches <n> --baseline-raw-json yes --baseline-confidence <1-5> --review-time-ms <ms> --review-evidence-steps <n> --review-workspace-switches <n> --review-raw-json no --review-confidence <1-5> --notes "<observation>"
pnpm phase17:benchmark:human:finalize
```

PowerShell fallback only:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "Sean" --baseline-time-ms <ms> --baseline-evidence-steps <n> --baseline-workspace-switches <n> --baseline-raw-json yes --baseline-confidence <1-5> --review-time-ms <ms> --review-evidence-steps <n> --review-workspace-switches <n> --review-raw-json no --review-confidence <1-5> --notes "<observation>"
pnpm phase17:benchmark:human:finalize
```

What finalize must do:
- publish the canonical markdown result
- verify the result against the captured human artifact
- fail closed if provenance does not match

## Required Artifacts

The run should produce:
- `logs/high-risk-review-human-capture-template.json`
- `logs/high-risk-review-human-capture-template.md`
- `logs/high-risk-review-human-benchmark.json`
- `logs/high-risk-review-human-benchmark.md`
- updated canonical publication:
  - `docs/planning/v2/HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md`
- verification summary proving the canonical publication still matches the captured human evidence provenance

## Fail-Closed Expectations

Do not override these protections:
- the capture must match the prepared query
- the capture must match the prepared proxy-artifact hash
- the capture must match the prepared proof and replay anchors
- canonical publication must not be generated from synthetic-only evidence
- canonical publication must still pass `phase17:benchmark:human:verify` against the same artifact set

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
- use `pnpm phase17:benchmark:human:reset` before a real run so stale synthetic or test artifacts are archived out of the default paths
- treat `docs/planning/v2/HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md` as the canonical published surface
- do not hand-edit benchmark numbers into the canonical results doc
- use `pnpm phase17:benchmark:human:finalize` as the default closeout path so publication and provenance verification stay coupled
- use `pnpm phase17:benchmark:human:status` when you need to confirm whether the repo still has pending, synthetic-only, or fully verified human evidence
