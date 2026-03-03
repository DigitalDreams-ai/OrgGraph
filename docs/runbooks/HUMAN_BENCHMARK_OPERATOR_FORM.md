# Human Benchmark Operator Form

Date: March 3, 2026

Use this form while running the first real Stage 1 human benchmark for the trusted high-risk review workflow.

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

## Before You Start

Complete these steps first.

- [ ] From repo root, run:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm phase17:benchmark:human:session -- --operator "<name>"
```

- [ ] Confirm the session bootstrap completed successfully.
- [ ] Confirm the capture template was generated:
  - `logs/high-risk-review-human-capture-template.json`
  - `logs/high-risk-review-human-capture-template.md`
- [ ] Confirm stale benchmark artifacts were archived under:
  - `logs/archive/phase17-human-benchmark/<timestamp>/`
- [ ] Confirm the benchmark scenario is still:
  - `Should we approve changing Opportunity.StageName for jane@example.com?`

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

Use the fragmented review flow:
1. Run a generic Ask query.
2. Inspect impact separately.
3. Inspect automation separately.
4. Inspect permissions separately.
5. Open proof/history separately.
6. Manually assemble a review recommendation.

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

Use the typed high-risk review workflow in Ask:
1. Run the typed high-risk review query.
2. Read the review packet in Ask.
3. Open proof only if deeper verification is needed.

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

## Submit the Capture

After filling the form, run:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "<name>" --baseline-time-ms <baseline-ms> --baseline-evidence-steps <baseline-steps> --baseline-workspace-switches <baseline-switches> --baseline-raw-json yes|no --baseline-confidence <baseline-confidence> --review-time-ms <review-ms> --review-evidence-steps <review-steps> --review-workspace-switches <review-switches> --review-raw-json yes|no --review-confidence <review-confidence> --notes "<short observation>"
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
- then tell me the command output from `pnpm phase17:benchmark:human:finalize`

## Pass Reminder

Stage 1 lift only counts if all of these hold:
- time improves by at least `40%`
- evidence steps drop by at least `2`
- workspace switches drop by at least `1`
- raw JSON dependence is eliminated
- confidence is not worse than baseline
- replay parity remains stable
- proof identity remains stable
