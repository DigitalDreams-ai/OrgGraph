# Production Promotion Gate

## Purpose

This runbook defines the release go/no-go gate for the packaged Windows desktop app.

Use these authoritative release surfaces for the actual release decision:
- [Release Checklist](../releases/RELEASE_CHECKLIST.md)
- [Rollback Playbook](../releases/ROLLBACK_PLAYBOOK.md)
- [Release Notes](../releases/RELEASE.md)
- [Real Org Desktop Quickstart](./REAL_ORG_DESKTOP_QUICKSTART.md)
- [Clean Machine Operator Proof](./CLEAN_MACHINE_OPERATOR_PROOF.md)

## Promotion Standard

Do not promote a release candidate unless all of the following are true:
- packaged smoke passes
- packaged relaunch reaches `ready`
- rollback target is identified and documented
- real-org quickstart evidence is captured
- clean-machine proof is captured
- release notes include commit SHA, tag, smoke evidence, clean-machine proof summary, and rollback target

## Required Commands

Run from Git Bash:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
git checkout main
git pull --ff-only
pnpm --reporter=append-only --loglevel=info install --frozen-lockfile
pnpm --filter api test
pnpm --filter web typecheck
pnpm --filter web build
pnpm desktop:info
pnpm --reporter=append-only --loglevel=info desktop:build
pnpm --reporter=append-only --loglevel=info desktop:smoke:release
```

## Promotion Decision

Promotion is allowed only after:
1. [Release Checklist](../releases/RELEASE_CHECKLIST.md) is fully complete
2. [Rollback Playbook](../releases/ROLLBACK_PLAYBOOK.md) inputs are recorded
3. [Release Notes](../releases/RELEASE.md) are filled in as the canonical candidate evidence record
4. [Real Org Desktop Quickstart](./REAL_ORG_DESKTOP_QUICKSTART.md) evidence is complete
5. [Clean Machine Operator Proof](./CLEAN_MACHINE_OPERATOR_PROOF.md) evidence is complete

## Tagging

After all gates are green:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
git checkout main
git pull --ff-only
git tag vX.Y.Z
git push origin vX.Y.Z
```

## If Promotion Fails

Do not improvise recovery steps here.

Use the canonical rollback procedure:
- [Rollback Playbook](../releases/ROLLBACK_PLAYBOOK.md)
