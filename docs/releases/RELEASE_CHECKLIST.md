# Release Checklist

## Purpose

This checklist is the release gate for Orgumented's packaged Windows desktop app.

Use it when preparing a release candidate from `main`.

This checklist is not complete until:
- all required commands pass
- evidence files are captured
- the rollback playbook has been verified against the candidate
- a non-author operator has completed the real-org quickstart evidence run

Related files:
- [Release Notes](./RELEASE.md)
- [Release Artifact Paths](./ARTIFACT_PATHS.md)
- [Rollback Playbook](./ROLLBACK_PLAYBOOK.md)
- [Rollback Result Template](./ROLLBACK_RESULT_TEMPLATE.md)
- [Real Org Desktop Quickstart](../runbooks/REAL_ORG_DESKTOP_QUICKSTART.md)
- [Clean Machine Operator Proof](../runbooks/CLEAN_MACHINE_OPERATOR_PROOF.md)

## 1. Prepare The Workstation

- [ ] Work on a Windows machine with Git Bash available
- [ ] Use Node `22+`
- [ ] Use `pnpm 9.12.3+`
- [ ] Use Salesforce CLI `sf`
- [ ] Use `cci 4.5.0`
- [ ] Confirm the candidate starts from clean `main`

Run:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
git checkout main
git pull --ff-only
git status --short
node --version
pnpm --version
sf --version
cci version
```

Expected result:
- `git status --short` prints nothing
- tool versions are visible

## 2. Install Dependencies

- [ ] Frozen install succeeds

Run:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm --reporter=append-only --loglevel=info install --frozen-lockfile
```

## 3. Local Validation Gate

- [ ] API tests pass
- [ ] Web typecheck passes
- [ ] Web build passes
- [ ] Desktop readiness passes
- [ ] Desktop package build passes
- [ ] Packaged smoke passes

Run:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm --filter api test
pnpm --filter web typecheck
pnpm --filter web build
pnpm desktop:info
pnpm --reporter=append-only --loglevel=info desktop:build
pnpm --reporter=append-only --loglevel=info desktop:smoke:release
```

Evidence to capture:
- latest `logs/desktop-release-smoke-*.json`
- latest `logs/desktop-release-smoke.*.log`

Canonical path reference:
- [Release Artifact Paths](./ARTIFACT_PATHS.md)

## 4. Packaged Runtime Evidence Gate

- [ ] Packaged app reaches `ready`
- [ ] Packaged relaunch reaches `ready`
- [ ] Metadata search/retrieve smoke is verified or explicitly skipped in disconnected environments

Check the latest smoke artifact for:
- `readyStatus = verified`
- `relaunchVerified = true`
- `metadataSearchStatus = verified` or explicit skip reason
- `metadataRetrieveStatus = verified` or explicit skip reason

## 5. Real-Org Operator Proof Gate

- [ ] Run [Real Org Desktop Quickstart](../runbooks/REAL_ORG_DESKTOP_QUICKSTART.md)
- [ ] Run [Clean Machine Operator Proof](../runbooks/CLEAN_MACHINE_OPERATOR_PROOF.md) on a non-author machine
- [ ] Org Sessions connect proof captured
- [ ] Org Browser retrieve proof captured
- [ ] Refresh handoff proof captured
- [ ] Ask proof captured with citations, proof ID, and replay token
- [ ] Results appended to `docs/planning/v2/REAL_ORG_OPERATOR_PROOF_RESULTS.md`
- [ ] At least one non-author operator completed the runbook end-to-end

Required screenshots:
- Org Sessions connected state
- Org Browser retrieved selection
- Refresh & Build handoff state
- Ask response with trust envelope and citations

Required metadata:
- candidate commit SHA
- operator name
- machine identifier/description
- alias used

## 6. Release Candidate Artifacts

- [ ] Candidate desktop binary path recorded
- [ ] Candidate commit SHA recorded
- [ ] Candidate tag/version recorded
- [ ] Release notes drafted in [Release Notes](./RELEASE.md)

Record:
- commit SHA
- release tag
- date/time
- operator
- smoke artifact paths
- quickstart evidence location
- installer path used for operator proof

## 7. Rollback Readiness Gate

- [ ] Follow [Rollback Playbook](./ROLLBACK_PLAYBOOK.md)
- [ ] Prepare [Rollback Result Template](./ROLLBACK_RESULT_TEMPLATE.md)
- [ ] Identify last known-good tag
- [ ] Confirm previous installer/binary path is available
- [ ] Confirm previous smoke artifact exists
- [ ] Record rollback target in release notes
- [ ] Record rollback installer path and smoke artifact path using [Release Artifact Paths](./ARTIFACT_PATHS.md) as the format guide

Do not release if rollback target is missing.

## 8. Security And Config Gate

- [ ] No secret changes are pending in the worktree
- [ ] Active alias is authenticated in local `sf` keychain
- [ ] Local runtime can read the keychain session

Run:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
sf org list --all --json
sf org display --target-org <alias> --json
git status --short
```

## 9. Final Sign-Off

- [ ] Release notes complete
- [ ] Release checklist complete
- [ ] Rollback playbook verified
- [ ] Operator proof complete
- [ ] Candidate approved for tag/publish

Final release step:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
git checkout main
git pull --ff-only
git tag vX.Y.Z
git push origin vX.Y.Z
```
