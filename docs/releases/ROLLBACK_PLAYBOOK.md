# Rollback Playbook

## Purpose

This playbook restores Orgumented to the last known-good packaged desktop release if a release candidate fails operator proof or post-release validation.

Use this with:
- [Release Checklist](./RELEASE_CHECKLIST.md)
- [Release Notes](./RELEASE.md)

## Inputs You Must Have

Before rollback starts, identify:
- failed release tag
- failed release commit SHA
- last known-good release tag
- last known-good release commit SHA
- path to the last known-good installer or packaged binary
- path to the last known-good smoke artifact

If any of those are missing, stop and reconstruct them before rollback.

## 1. Confirm Rollback Trigger

Rollback is justified if any of these are true:
- packaged runtime does not reach `ready`
- packaged relaunch fails
- real-org quickstart fails on the release candidate
- Ask/proof behavior regresses in a release-blocking way
- a P0/P1 defect is discovered after candidate cut

Record:
- trigger reason
- timestamp
- operator

## 2. Stop The Failed Candidate

Close the running Orgumented desktop app.

If the packaged runtime is still running in a shell, stop it before continuing.

## 3. Restore The Previous Known-Good Build

From Git Bash:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
git fetch --tags --prune
git checkout <known-good-tag>
pnpm --reporter=append-only --loglevel=info install --frozen-lockfile
pnpm --reporter=append-only --loglevel=info desktop:build
pnpm --reporter=append-only --loglevel=info desktop:smoke:release
```

Expected result:
- known-good tag is checked out
- packaged smoke passes again

## 4. Verify The Restored Candidate

Run the packaged binary:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
./apps/desktop/src-tauri/target/release/orgumented-desktop.exe
```

Confirm:
- `API READY: ready`
- packaged runtime behaves normally
- the previous known-good quickstart path is usable

If rollback validation fails here, stop and escalate. Do not tag or republish anything.

## 5. Capture Rollback Evidence

Record in [Release Notes](./RELEASE.md):
- failed release tag/SHA
- restored release tag/SHA
- rollback reason
- smoke artifact path
- operator name
- timestamp

Capture:
- restored smoke artifact path
- one screenshot showing the restored runtime ready state

## 6. Return To Mainline Work

After rollback proof is captured:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
git checkout main
git pull --ff-only
```

Then create a fix branch from `main`.

Do not continue development from the detached known-good tag checkout.
