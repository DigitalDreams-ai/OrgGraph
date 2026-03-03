# Human Benchmark Capture

Date: March 3, 2026

This is the only file you need to follow for the first real Stage 1 human benchmark run.

Do not use `docs/runbooks/HUMAN_BENCHMARK_OPERATOR_FORM.md` as a separate worksheet anymore. That file now only redirects back here.

Scenario under test:
- `Should we approve changing Opportunity.StageName for jane@example.com?`

Do not widen the scenario. Do not substitute a different query. Do not record guessed numbers.

## What This Run Proves

This run is intended to produce the first real human-operated benchmark result for the trusted high-risk review workflow.

The run only counts if all of these are true:
- the benchmark was run by a real operator
- the benchmark used the exact prepared query and capture template
- the review-packet path improved time by at least `40%`
- the review-packet path reduced evidence steps by at least `2`
- the review-packet path reduced workspace switches by at least `1`
- the review-packet path eliminated raw JSON dependence
- review-packet confidence was not lower than baseline
- proof and replay anchors remained stable

## Use Bash Only

All commands in this runbook assume Git Bash.

Repository root:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
```

Do not use PowerShell commands like `Set-Location` inside a bash terminal.

## Machine Requirements

You are ready to run this benchmark only if all of these are true:
- the repo exists at `C:\Users\sean\Projects\GitHub\OrgGraph`
- `node` works in bash
- `pnpm` works in bash
- Orgumented dependencies are installed
- the packaged desktop shell has been built at least once

## First-Time Setup Or Readiness Check

Run these commands in bash:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
node --version
pnpm --version
pnpm install
pnpm desktop:info
pnpm desktop:build
```

What success looks like:
- `node --version` prints a version instead of `command not found`
- `pnpm --version` prints a version instead of `command not found`
- `pnpm install` completes without dependency errors
- `pnpm desktop:info` reports desktop readiness instead of missing toolchain failures
- `pnpm desktop:build` completes successfully

Important packaged desktop paths:
- built executable:
  - `C:\Users\sean\Projects\GitHub\OrgGraph\apps\desktop\src-tauri\target\release\orgumented-desktop.exe`
- MSI bundle:
  - `C:\Users\sean\Projects\GitHub\OrgGraph\apps\desktop\src-tauri\target\release\bundle\msi\Orgumented_0.1.0_x64_en-US.msi`
- NSIS installer:
  - `C:\Users\sean\Projects\GitHub\OrgGraph\apps\desktop\src-tauri\target\release\bundle\nsis\Orgumented_0.1.0_x64-setup.exe`

If `pnpm desktop:build` has already succeeded on this machine and the executable path exists, you do not need to rebuild before every benchmark run.

## Before You Start The Real Run

Read this section fully before running anything.

What the bootstrap sequence does:
1. archives stale Phase 17 artifacts out of the default `logs/` paths
2. runs packaged desktop smoke
3. opens Orgumented briefly during smoke, then closes it
4. relaunches the packaged Orgumented desktop app
5. refreshes the proxy benchmark against the live runtime
6. writes a human capture template
7. prints the exact command you will run after the manual review
8. leaves Orgumented open for your manual work

Expected visual cues:
- Orgumented may open once and close automatically during smoke
- Orgumented should open again and remain open for your manual review
- the terminal should eventually print:
  - `Human benchmark session is prepared.`
  - `Orgumented should now remain open for the manual review.`
  - an exact `pnpm phase17:benchmark:human -- ...` command
  - `pnpm phase17:benchmark:human:finalize`

If Orgumented opens and closes once during smoke, that is normal.

## Step 1: Start A Clean Benchmark Session

Run:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm phase17:benchmark:human:reset
pnpm phase17:benchmark:human:session -- --operator "Sean"
```

Replace `"Sean"` with the real operator name if needed.

Do not:
- paste markdown code fences into the terminal
- close the terminal while the command is running
- start the manual review before the session command fully finishes

## Step 2: Confirm Bootstrap Succeeded

Do not continue until all of these are true.

- [ ] The terminal finished running `pnpm phase17:benchmark:human:session -- --operator "Sean"`
- [ ] The terminal printed `Human benchmark session is prepared.`
- [ ] The terminal printed an exact `pnpm phase17:benchmark:human -- ...` command
- [ ] The terminal printed `pnpm phase17:benchmark:human:finalize`
- [ ] An Orgumented desktop window is open and usable
- [ ] This file exists:
  - `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-human-capture-template.json`
- [ ] This file exists:
  - `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-human-capture-template.md`
- [ ] This file exists:
  - `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-benchmark.json`

Expected archive location after reset:
- `C:\Users\sean\Projects\GitHub\OrgGraph\logs\archive\phase17-human-benchmark\<timestamp>\`

If any required file is missing, stop and report the failure instead of continuing.

## Step 3: Record Run Metadata

Write these down before starting the timed work:

- Operator name:
- Run date:
- Branch under test:
- Commit under test:
- Desktop runtime used:
  - packaged shell
- Benchmark query:
  - `Should we approve changing Opportunity.StageName for jane@example.com?`

Quick bash commands if you want the branch and commit:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
git branch --show-current
git rev-parse --short HEAD
```

## Step 4: Understand What You Are Measuring

For both the baseline path and the review-packet path, record:
- time to trusted answer in milliseconds
- evidence-gathering steps
- workspace switches
- whether raw JSON was required
- confidence from `1` to `5`
- proof ID observed
- replay token observed
- notes

Definitions:
- `time to trusted answer`
  - time from first query submission until you can state an approval recommendation and have proof and replay identifiers
- `evidence-gathering steps`
  - explicit actions needed to gather impact, automation, permissions, proof, or other missing review evidence
- `workspace switches`
  - any time you leave the current working surface to collect missing evidence
- `raw JSON needed`
  - `yes` only if you had to inspect raw payload JSON to complete the decision

## Step 5: Run The Baseline Path First

This is the fragmented path. It should feel slower and more manual than the review-packet path.

Start a timer immediately before the first baseline query.

Do this:
1. Run a generic Ask query for the scenario.
2. Gather missing evidence separately:
   - impact
   - automation
   - permissions
   - proof/history
3. Manually assemble an approval recommendation.
4. Stop the timer only when you can answer the approval question with enough confidence and can point to proof and replay identifiers.

Fill in:
- Baseline time to trusted answer (ms):
- Baseline evidence steps:
- Baseline workspace switches:
- Baseline raw JSON needed (`yes` or `no`):
- Baseline confidence (`1-5`):
- Baseline proof ID observed:
- Baseline replay token observed:
- Baseline notes:

## Step 6: Run The Review-Packet Path Second

This is the typed high-risk review path in Ask.

Start a new timer immediately before the first review-packet query.

Do this:
1. Run the typed high-risk review query in Ask.
2. Read the review packet.
3. Open proof/history only if you genuinely need more evidence.
4. Stop the timer only when you can answer the approval question with enough confidence and can point to proof and replay identifiers.

Fill in:
- Review-packet time to trusted answer (ms):
- Review-packet evidence steps:
- Review-packet workspace switches:
- Review-packet raw JSON needed (`yes` or `no`):
- Review-packet confidence (`1-5`):
- Review-packet proof ID observed:
- Review-packet replay token observed:
- Review-packet notes:

## Step 7: Write Comparison Notes

Answer these directly:

- Was the review packet sufficient on its own?
- If not, what extra evidence did you need?
- Did you have to leave Ask?
- Did you have to inspect raw JSON?
- What felt slower or more confusing in the baseline path?
- What still feels weak or unclear in the review-packet path?

## Step 8: Submit The Human Capture

Use the exact capture command printed by the bootstrap session if possible.

If you need the default command shape, run:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "Sean" --baseline-time-ms <baseline-ms> --baseline-evidence-steps <baseline-steps> --baseline-workspace-switches <baseline-switches> --baseline-raw-json yes|no --baseline-confidence <baseline-confidence> --review-time-ms <review-ms> --review-evidence-steps <review-steps> --review-workspace-switches <review-switches> --review-raw-json yes|no --review-confidence <review-confidence> --notes "<short observation>"
```

Replace every placeholder before pressing Enter.

What success looks like:
- a human benchmark artifact is written to:
  - `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-human-benchmark.json`
- the command does not fail on query mismatch, proxy artifact mismatch, or proof/replay mismatch

## Step 9: Finalize The Canonical Result

Run:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm phase17:benchmark:human:finalize
```

What finalize must do:
- publish the canonical markdown result
- verify the canonical result against the same human artifact
- fail closed if provenance does not match

Canonical output path:
- `C:\Users\sean\Projects\GitHub\OrgGraph\docs\planning\v2\HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md`

## Step 10: Optional Status Check

If you want a direct repository status summary after finalize, run:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm phase17:benchmark:human:status
```

## Required Output Files

By the end of a successful real run, these should exist:
- `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-human-capture-template.json`
- `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-human-capture-template.md`
- `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-benchmark.json`
- `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-human-benchmark.json`
- `C:\Users\sean\Projects\GitHub\OrgGraph\docs\planning\v2\HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md`

## What To Send Back

Send back one of these:
- the finalize terminal output, or
- the completed values below in plain text

Plain-text fallback fields:
- operator name
- branch under test
- commit under test
- baseline time
- baseline evidence steps
- baseline workspace switches
- baseline raw JSON needed
- baseline confidence
- baseline proof ID
- baseline replay token
- review time
- review evidence steps
- review workspace switches
- review raw JSON needed
- review confidence
- review proof ID
- review replay token
- comparison notes

## Troubleshooting

### Problem: `Set-Location` says command not found

Cause:
- you are in bash, not PowerShell

Fix:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
```

### Problem: the terminal shows nothing after paste

Most likely cause:
- you pasted the markdown code fence lines too

Fix:
1. press `Ctrl+C`
2. paste only the commands, not the opening or closing ``` lines

### Problem: Orgumented opens and closes once during bootstrap

That is normal during `pnpm desktop:smoke:release`.

The real failure is only if:
- the session command ends without printing the capture command
- or Orgumented never reopens for the manual review

### Problem: the packaged desktop executable is missing

Run:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm desktop:build
```

Then confirm this path exists:
- `C:\Users\sean\Projects\GitHub\OrgGraph\apps\desktop\src-tauri\target\release\orgumented-desktop.exe`

### Problem: the capture template files are missing after bootstrap

Stop. Do not continue manually.

Report:
- the full terminal output from the session command
- whether Orgumented stayed open
- whether `logs/high-risk-review-benchmark.json` exists

### Problem: finalize fails

Do not hand-edit the canonical results doc.

Report:
- the full `pnpm phase17:benchmark:human:finalize` output
- whether `logs/high-risk-review-human-benchmark.json` exists
- whether the proof ID and replay token you observed match what was captured

## Fail-Closed Rules

Do not override these protections:
- the capture must match the prepared query
- the capture must match the prepared proxy artifact hash
- the capture must match the prepared proof and replay anchors
- canonical publication must not be generated from synthetic-only evidence
- canonical publication must still pass verification against the same artifact set

If any of those fail, the run does not count.
