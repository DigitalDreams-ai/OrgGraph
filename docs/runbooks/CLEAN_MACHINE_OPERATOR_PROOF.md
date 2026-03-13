# Clean Machine Operator Proof

## Purpose

Use this worksheet when a non-author operator validates Orgumented on a clean Windows machine.

This run is required to close the wave12 operator-proof gate.

Reference runbook:
- [Real Org Desktop Quickstart](./REAL_ORG_DESKTOP_QUICKSTART.md)

Canonical evidence log:
- [Real Org Operator Proof Results](../planning/v2/REAL_ORG_OPERATOR_PROOF_RESULTS.md)

Canonical release evidence record:
- [Release Notes](../releases/RELEASE.md)

Canonical path reference:
- [Release Artifact Paths](../releases/ARTIFACT_PATHS.md)

## Definition Of Clean Machine

For this proof, a clean machine means:
- different workstation than the primary author machine, or
- fresh Windows environment with no prior Orgumented runtime state
- operator did not build the current slice

It is acceptable for the machine to already have:
- Git Bash
- Node
- pnpm
- `sf`
- `cci`

It is not acceptable to reuse prior Orgumented runtime artifacts without rebuilding the current candidate.

## Commands The Operator Must Run

Run in Git Bash:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
git checkout main
git pull --ff-only
node --version
pnpm --version
sf --version
cci version
pnpm --reporter=append-only --loglevel=info install --frozen-lockfile
pnpm --reporter=append-only --loglevel=info desktop:build
./apps/desktop/src-tauri/target/release/orgumented-desktop.exe
```

Then follow:
- [Real Org Desktop Quickstart](./REAL_ORG_DESKTOP_QUICKSTART.md)

## Evidence The Operator Must Capture

Screenshots:
1. Org Sessions connected state
2. Org Browser retrieved selection
3. Refresh & Build handoff state
4. Ask response with citations, proof ID, and replay token

Text fields to record:
- operator name
- machine identifier or description
- alias used
- candidate commit SHA
- desktop executable path used
- installer path used, if installer validation was performed
- whether `sf` and `cci` were already installed
- whether Orgumented had been run on that machine before
- Ask question used
- proof ID
- replay token
- overall pass/fail
- blockers or friction notes

## Result Template

Copy this block into [Real Org Operator Proof Results](../planning/v2/REAL_ORG_OPERATOR_PROOF_RESULTS.md) by filling the existing `## Clean Machine 001` section or by adding the next numbered clean-machine entry (`## Clean Machine 002`, and so on):

```md
## Clean Machine 001

- Operator:
- Result:
- Proof ID:
- Replay Token:
- Machine:
- Date:
- Candidate commit SHA:
- Alias:
- Desktop executable path:
- Installer path:
- Prior Orgumented runtime on this machine: yes/no

### Tooling Check

- `sf` available: yes/no
- `cci 4.5.0` available: yes/no
- Build completed: pass/fail

### Workflow Check

1. Org Sessions connect:
- Result:
- Evidence:

2. Org Browser retrieve:
- Result:
- Evidence:

3. Refresh handoff:
- Result:
- Evidence:

4. Ask proof:
- Result:
- Query:
- Proof ID:
- Replay Token:
- Evidence:

### Overall Result

- Pass/fail:
- Blockers:
- Notes:
```

## Gate Rule

Wave12 is not complete until:
- this worksheet is executed by a non-author operator
- the results are appended to the canonical proof-results file
- the release checklist references that completed evidence
- [Release Notes](../releases/RELEASE.md) includes the clean-machine proof summary and proof-results link
