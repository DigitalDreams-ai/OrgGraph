# Human Benchmark Operator Form

Date: March 3, 2026

Use this worksheet during the first real Stage 1 human benchmark for the trusted high-risk review workflow.

Scenario only:
- `Should we approve changing Opportunity.StageName for jane@example.com?`

Do not widen the scenario.

## Operator Info

- Operator name:
- Run date:
- Branch or commit under test:
- Desktop runtime used:
  - packaged shell
  - dev shell
- Notes before start:

## Exact Sequence

Follow this order exactly:

1. Run the clean session bootstrap commands.
2. Wait until the bootstrap command fully finishes.
3. Confirm the capture template files exist.
4. Run the baseline path and fill in the baseline section below.
5. Run the review-packet path and fill in the review-packet section below.
6. Run the capture command.
7. Run `pnpm phase17:benchmark:human:finalize`.

Do not enter guessed or synthetic numbers.

## Before You Start

- [ ] Run the clean session bootstrap commands in bash.

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

- [ ] Confirm the reset command archived stale human benchmark artifacts if any existed.
- [ ] Confirm the session bootstrap finished successfully.
- [ ] Confirm these files now exist:
  - `logs/high-risk-review-human-capture-template.json`
  - `logs/high-risk-review-human-capture-template.md`
  - `logs/high-risk-review-benchmark.json`
- [ ] Confirm an Orgumented desktop window is still open and usable for the manual review.
- [ ] Confirm stale artifacts were archived under:
  - `logs/archive/phase17-human-benchmark/<timestamp>/`
- [ ] Confirm the benchmark scenario is still:
  - `Should we approve changing Opportunity.StageName for jane@example.com?`

If any of those checks fail, stop and report the error instead of continuing.

## What To Measure

For both paths, record:
- time to trusted answer in milliseconds
- evidence-gathering steps
- workspace/context switches
- whether raw JSON was needed
- confidence from `1` to `5`

Definitions:
- `time to trusted answer`: from first query submission until you can state an approval recommendation with proof and replay identifiers available
- `evidence-gathering steps`: explicit actions to collect permissions, automation, impact, and proof context
- `workspace/context switches`: how many times you had to leave the current surface to gather missing evidence
- `raw JSON needed`: `yes` only if you had to inspect raw payload JSON to complete the workflow

## Path A: Baseline

Use the fragmented review flow.

Steps:
1. Run a generic Ask query for the scenario.
2. Inspect impact separately.
3. Inspect automation separately.
4. Inspect permissions separately.
5. Open proof/history separately.
6. Manually assemble a review recommendation.
7. Stop timing only when you can answer the approval question confidently.

Record your measurements:

- Baseline time to trusted answer (ms):
- Baseline evidence steps:
- Baseline workspace switches:
- Baseline raw JSON needed (`yes` or `no`):
- Baseline confidence (`1-5`):
- Baseline proof ID observed:
- Baseline replay token observed:
- Baseline notes:

## Path B: Review Packet

Use the typed high-risk review workflow in Ask.

Steps:
1. Run the typed high-risk review query.
2. Read the review packet in Ask.
3. Open proof/history only if you genuinely need more evidence.
4. Stop timing only when you can answer the approval question confidently.

Record your measurements:

- Review-packet time to trusted answer (ms):
- Review-packet evidence steps:
- Review-packet workspace switches:
- Review-packet raw JSON needed (`yes` or `no`):
- Review-packet confidence (`1-5`):
- Review-packet proof ID observed:
- Review-packet replay token observed:
- Review-packet notes:

## Manual Comparison Notes

Answer these directly:

- Was the review packet sufficient on its own?
- If not, what extra evidence did you need?
- Did you have to leave Ask?
- Did you have to inspect raw JSON?
- What felt slower or more confusing in the baseline path?
- What still feels weak or unclear in the review-packet path?

## Submit The Capture

Run the exact capture command printed by the bootstrap command.

If you need the default shape, use bash:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "Sean" --baseline-time-ms <baseline-ms> --baseline-evidence-steps <baseline-steps> --baseline-workspace-switches <baseline-switches> --baseline-raw-json yes|no --baseline-confidence <baseline-confidence> --review-time-ms <review-ms> --review-evidence-steps <review-steps> --review-workspace-switches <review-switches> --review-raw-json yes|no --review-confidence <review-confidence> --notes "<short observation>"
pnpm phase17:benchmark:human:finalize
```

PowerShell fallback only:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "Sean" --baseline-time-ms <baseline-ms> --baseline-evidence-steps <baseline-steps> --baseline-workspace-switches <baseline-switches> --baseline-raw-json yes|no --baseline-confidence <baseline-confidence> --review-time-ms <review-ms> --review-evidence-steps <review-steps> --review-workspace-switches <review-switches> --review-raw-json yes|no --review-confidence <review-confidence> --notes "<short observation>"
pnpm phase17:benchmark:human:finalize
```

## What To Send Back

Send back either:
- the completed markdown form, or
- these exact values in plain text:
  - operator name
  - baseline time
  - baseline evidence steps
  - baseline workspace switches
  - baseline raw JSON needed
  - baseline confidence
  - review time
  - review evidence steps
  - review workspace switches
  - review raw JSON needed
  - review confidence
  - short observation notes

Preferred:
- run the commands above and keep the artifacts in `logs/`
- then send the output from `pnpm phase17:benchmark:human:finalize`

## Pass Reminder

Stage 1 lift only counts if all of these hold:
- time improves by at least `40%`
- evidence steps drop by at least `2`
- workspace switches drop by at least `1`
- raw JSON dependence is eliminated
- confidence is not worse than baseline
- replay parity remains stable
- proof identity remains stable
