# Human Benchmark Capture

Date: March 3, 2026

If you are about to run the benchmark now, use this file instead:

- [HUMAN_BENCHMARK_QUICKSTART.md](./HUMAN_BENCHMARK_QUICKSTART.md)

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

## Commands You Manually Enter

For the normal benchmark flow, these are the only commands you type yourself.

Enter them in this order:

1. Change into the repo:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
```

2. Archive stale benchmark artifacts:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:reset
```

3. Start the benchmark session bootstrap:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:session -- --operator "Sean"
```

4. After you finish the manual review inside Orgumented, run the printed capture command.

In this runbook, "manual review" means:
- complete the baseline workflow in Orgumented and record the baseline measurements
- then complete the review-packet workflow in Orgumented and record the review-packet measurements

In this runbook:
- `baseline workflow` means the fragmented generic review path starting with:
  - `What touches Opportunity.StageName?`
- `review-packet workflow` means the typed approval-review path starting with:
  - `Should we approve changing Opportunity.StageName for jane@example.com?`

You will do those workflows later in:
- `Step 5: Run The Baseline Path First`
- `Step 6: Run The Review-Packet Path Second`

Default shape if needed:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "Sean" --baseline-time-ms <baseline-ms> --baseline-evidence-steps <baseline-steps> --baseline-workspace-switches <baseline-switches> --baseline-raw-json yes|no --baseline-confidence <baseline-confidence> --review-time-ms <review-ms> --review-evidence-steps <review-steps> --review-workspace-switches <review-switches> --review-raw-json yes|no --review-confidence <review-confidence> --notes "<short observation>"
```

5. Finalize the canonical result:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:finalize
```

6. Optional status check after finalize:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:status
```

You do **not** manually enter these during the normal benchmark flow:
- `pnpm desktop:smoke:release`
- `pnpm phase17:benchmark`
- `pnpm phase17:benchmark:human:prepare`

Those are started automatically inside:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:session -- --operator "Sean"
```

## Visibility Rules

If you want to see progress clearly:
- run commands one at a time
- wait for each command to finish before pasting the next one
- use the verbose `pnpm` forms in this runbook instead of the short aliases when available

What "verbose" means here:
- for `pnpm` commands, prefer:
  - `--reporter=append-only`
  - `--loglevel=info`
- some commands do not have a useful verbose mode:
  - `node --version`
  - `pnpm --version`

If a command appears to "just sit there", do not assume it is broken until you have run it by itself and waited for output.

## Machine Requirements

You are ready to run this benchmark only if all of these are true:
- the repo exists at `C:\Users\sean\Projects\GitHub\OrgGraph`
- `node` works in bash
- `pnpm` works in bash
- Orgumented dependencies are installed
- the packaged desktop shell has been built at least once

## First-Time Setup Or Readiness Check

Run these commands in bash, one at a time:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
node --version
pnpm --version
pnpm --reporter=append-only --loglevel=info install
pnpm --reporter=append-only --loglevel=info --filter desktop info
pnpm --reporter=append-only --loglevel=info --filter desktop build
```

Recommended copy/paste pattern:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
```

then:

```bash
node --version
```

then:

```bash
pnpm --version
```

then:

```bash
pnpm --reporter=append-only --loglevel=info install
```

then:

```bash
pnpm --reporter=append-only --loglevel=info --filter desktop info
```

then:

```bash
pnpm --reporter=append-only --loglevel=info --filter desktop build
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

Step-by-step meaning:

1. Archive stale Phase 17 artifacts
   - What happens:
     - old benchmark files are moved out of `logs/`
     - they are not deleted
   - What you should see:
     - JSON output containing:
       - `archiveDir`
       - `archivedCount`
       - `archived`
     - then either:
       - `Phase 17 artifacts archived. Start the next real capture with:`
       - or `No Phase 17 benchmark artifacts needed archiving.`
   - Where archived files go:
     - `C:\Users\sean\Projects\GitHub\OrgGraph\logs\archive\phase17-human-benchmark\<timestamp>\`
   - What you should do:
     - let the command finish
     - do not manually move files yourself
   - If this step fails:
     - stop and send the full terminal output

2. Run packaged desktop smoke
   - What happens:
     - Orgumented validates the packaged desktop runtime automatically
   - What you should see:
     - terminal output from `pnpm desktop:smoke:release`
     - readiness checks against the packaged runtime
   - What you should do:
     - wait
     - do not click around in Orgumented yet
   - Important:
     - this is an automated preflight check, not the manual benchmark itself

3. Open Orgumented briefly during smoke, then close it
   - What happens:
     - the desktop app may appear, then close on its own
   - What you should see:
     - an Orgumented window open briefly
     - then disappear without your input
   - What you should do:
     - nothing
     - this is normal
   - This is not a failure by itself.

4. Relaunch the packaged Orgumented desktop app
   - What happens:
     - after smoke, the session bootstrap launches the packaged desktop app again
   - What you should see:
     - Orgumented opens a second time
   - What you should do:
     - wait for the terminal to finish its bootstrap output
     - do not begin timing the benchmark yet
   - This second launch is the one intended for your manual review.

5. Refresh the proxy benchmark against the live runtime
   - What happens:
     - the session refreshes the Stage 1 proxy benchmark while Orgumented is grounded and live
   - What you should see:
     - terminal output from `pnpm phase17:benchmark`
     - a benchmark artifact refresh under `logs/`
   - Expected file:
     - `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-benchmark.json`
   - What you should do:
     - wait for the command to finish
   - If the session ends before this file exists:
     - stop and report that failure

6. Write a human capture template
   - What happens:
     - the bootstrap prepares the exact capture packet for this run
   - What you should see:
     - new template files under `logs/`
   - Required files:
     - `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-human-capture-template.json`
     - `C:\Users\sean\Projects\GitHub\OrgGraph\logs\high-risk-review-human-capture-template.md`
   - What you should do:
     - confirm those files exist before continuing
   - If either file is missing:
     - stop and report the failure

7. Print the exact command you will run after the manual review
   - What happens:
     - the bootstrap prints the exact `pnpm phase17:benchmark:human -- ...` command for this run
   - What you should see:
     - a full command beginning with:
       - `pnpm phase17:benchmark:human --`
     - then a final line:
       - `pnpm phase17:benchmark:human:finalize`
   - What you should do:
     - copy that printed capture command somewhere safe
     - use it later after you finish the manual review
   - Do not invent your own command if the printed one is available.

8. Leave Orgumented open for your manual work
   - What happens:
     - the bootstrap finishes and leaves the desktop app open
   - What you should see:
     - the terminal prints:
       - `Human benchmark session is prepared.`
       - `Orgumented should now remain open for the manual review.`
     - Orgumented is still open on screen
   - What you should do:
     - only now begin the manual benchmark steps
   - If Orgumented is closed at this point:
     - stop and report the failure instead of continuing

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

Run these one at a time:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:reset
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:session -- --operator "Sean"
```

Replace `"Sean"` with the real operator name if needed.

Do not:
- paste markdown code fences into the terminal
- close the terminal while the command is running
- start the manual review before the session command fully finishes

Recommended copy/paste pattern:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
```

then:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:reset
```

wait for it to finish, then:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:session -- --operator "Sean"
```

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

Exact baseline query:
- `What touches Opportunity.StageName?`

Do this exactly:
1. In the Orgumented desktop window, stay on the default `Ask` workspace.
2. In the Ask input box, enter:
   - `What touches Opportunity.StageName?`
3. Submit the query.
4. Read the Ask answer.
5. If the Ask answer is not enough to approve or reject the change, gather missing evidence separately. Use whatever Orgumented surfaces you need for:
   - impact
   - automation
   - permissions
   - proof/history
6. If you must switch workspaces to collect missing evidence, count each switch.
7. If you must inspect raw JSON to finish the decision, record `yes` for raw JSON.
8. Manually assemble your answer to the real approval question:
   - `Should we approve changing Opportunity.StageName for jane@example.com?`
9. Stop the timer only when you can give that answer with confidence and can point to proof and replay identifiers.

What you are measuring here:
- how many extra steps it takes when you start from the generic query instead of the typed review query
- how often you have to leave Ask
- whether you have to inspect raw JSON
- whether the fragmented path still gives you enough confidence to approve or reject the change

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

Exact review-packet query:
- `Should we approve changing Opportunity.StageName for jane@example.com?`

Do this exactly:
1. Return to the `Ask` workspace if you left it during the baseline path.
2. In the Ask input box, enter:
   - `Should we approve changing Opportunity.StageName for jane@example.com?`
3. Submit the query.
4. Read the review packet shown in Ask.
5. Try to make your approval decision from the review packet alone.
6. Open proof/history only if you genuinely need more evidence.
7. If you must inspect raw JSON to finish the decision, record `yes` for raw JSON.
8. Stop the timer only when you can answer the approval question with enough confidence and can point to proof and replay identifiers.

What you are measuring here:
- whether the typed review packet removes the need for fragmented evidence gathering
- whether you can stay in Ask instead of switching workspaces
- whether the typed path removes raw JSON dependence
- whether the typed path gives you equal or better confidence faster

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
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "Sean" --baseline-time-ms <baseline-ms> --baseline-evidence-steps <baseline-steps> --baseline-workspace-switches <baseline-switches> --baseline-raw-json yes|no --baseline-confidence <baseline-confidence> --review-time-ms <review-ms> --review-evidence-steps <review-steps> --review-workspace-switches <review-switches> --review-raw-json yes|no --review-confidence <review-confidence> --notes "<short observation>"
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
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:finalize
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
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:status
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

Also possible:
- you pasted several long-running commands at once and the current command has not produced output yet

Safer fix:
1. press `Ctrl+C`
2. run one command at a time
3. use the verbose `pnpm --reporter=append-only --loglevel=info ...` forms from this runbook

### Problem: Orgumented opens and closes once during bootstrap

That is normal during `pnpm desktop:smoke:release`.

The real failure is only if:
- the session command ends without printing the capture command
- or Orgumented never reopens for the manual review

### Problem: the packaged desktop executable is missing

Run:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm --reporter=append-only --loglevel=info --filter desktop build
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
