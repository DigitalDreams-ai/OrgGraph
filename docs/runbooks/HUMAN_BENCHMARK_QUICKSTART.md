# Human Benchmark Quickstart

Current policy:
- this quickstart is optional exploratory guidance
- it is not required for Wave 7 closure
- canonical Wave 7 acceptance now uses proxy benchmark publication and verification

Use this file when you actually run the benchmark.

This file is intentionally short.

## What You Are Doing

You are comparing two ways of answering this question in Orgumented:

- `Should we approve changing Opportunity.StageName for jane@example.com?`

You will:

1. run the fragmented baseline path
2. run the review-packet path
3. submit the capture command
4. finalize the result

## Use Git Bash

Use a Git Bash terminal.

Do not paste Markdown code fences such as:

- `````bash`
- ````` 

Paste only the command lines.

## Commands You Type

Type these commands in this order.

### Command 1

```bash
cd /c/Users/sean/Projects/GitHub/Orgumented
```

### Command 2

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:reset
```

### Command 3

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:session -- --operator "Sean"
```

Replace `"Sean"` only if you want a different operator name recorded.

## What Command 3 Should Do

Wait for Command 3 to finish.

Do not type anything else while it is running.

You should see all of this happen automatically:

1. old Phase 17 benchmark files are archived from `logs/`
2. packaged desktop smoke runs
3. Orgumented opens briefly, then closes during smoke
4. Orgumented opens again and stays open
5. a capture template is written
6. the terminal prints an exact `pnpm phase17:benchmark:human -- ...` command
7. the terminal prints `pnpm phase17:benchmark:human:finalize`

If Command 3 does not print the capture command, stop and report that failure.

## Files That Must Exist Before You Continue

After Command 3 finishes, these files must exist:

- `C:\Users\sean\Projects\GitHub\Orgumented\logs\high-risk-review-human-capture-template.json`
- `C:\Users\sean\Projects\GitHub\Orgumented\logs\high-risk-review-human-capture-template.md`
- `C:\Users\sean\Projects\GitHub\Orgumented\logs\high-risk-review-benchmark.json`

If any of these are missing, stop.

## Manual Work In Orgumented

After Command 3 finishes, Orgumented should be open.

You now do two timed runs inside the app.

### Run 1: Baseline Path

Start a timer.

Stay in the `Ask` workspace.

Enter this exact query:

- `What touches Opportunity.StageName?`

Submit it.

Then gather whatever extra evidence you need inside Orgumented so you can answer the real approval question:

- `Should we approve changing Opportunity.StageName for jane@example.com?`

Possible extra evidence:

- impact
- automation
- permissions
- proof/history

Stop the timer when you can answer the approval question confidently and can point to proof and replay identifiers.

Write down:

- baseline time in milliseconds
- baseline evidence steps
- baseline workspace switches
- raw JSON needed: `yes` or `no`
- baseline confidence from `1` to `5`
- baseline proof ID
- baseline replay token
- short baseline notes

### Run 2: Review-Packet Path

Start a new timer.

Stay in the `Ask` workspace.

Enter this exact query:

- `Should we approve changing Opportunity.StageName for jane@example.com?`

Submit it.

Read the review packet.

Only open proof/history if you still need more evidence.

Stop the timer when you can answer the approval question confidently and can point to proof and replay identifiers.

Write down:

- review time in milliseconds
- review evidence steps
- review workspace switches
- raw JSON needed: `yes` or `no`
- review confidence from `1` to `5`
- review proof ID
- review replay token
- short review notes

## Command 4

After both timed runs are complete, use the exact capture command that Command 3 printed.

It will look like this shape:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "Sean" --baseline-time-ms <baseline-ms> --baseline-evidence-steps <baseline-steps> --baseline-workspace-switches <baseline-switches> --baseline-raw-json yes|no --baseline-confidence <baseline-confidence> --review-time-ms <review-ms> --review-evidence-steps <review-steps> --review-workspace-switches <review-switches> --review-raw-json yes|no --review-confidence <review-confidence> --notes "<short observation>"
```

Replace every placeholder before pressing Enter.

## Command 5

After Command 4 succeeds, run:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:finalize
```

## Optional Command 6

If you want a summary after finalize, run:

```bash
pnpm --reporter=append-only --loglevel=info phase17:benchmark:human:status
```

## Final Output You Should Have

At the end, these should exist:

- `C:\Users\sean\Projects\GitHub\Orgumented\logs\high-risk-review-human-benchmark.json`
- `C:\Users\sean\Projects\GitHub\Orgumented\docs\planning\v2\HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md`

## If Something Goes Wrong

Stop and report which step failed.

Good examples:

- `Command 3 never printed the capture command`
- `Orgumented did not stay open after session bootstrap`
- `capture template file was missing`
- `I could not find proof ID or replay token`
- `finalize failed`


