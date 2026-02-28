# Release Checklist

## Scope
This checklist defines repeatable Windows desktop release steps for Orgumented.

## Versioning
- Create release tags as `vMAJOR.MINOR.PATCH` (example: `v0.5.0`).
- Keep release tags and commit SHAs for traceability and rollback.

## Pre-Release Checks
1. `pnpm -r typecheck`
2. `pnpm --filter api test`
3. `pnpm --filter api build`
4. `pnpm --filter web build`
5. `pnpm desktop:info`
6. `pnpm desktop:build`
7. Run smoke checks: `./scripts/web-smoke.sh`
8. Confirm `/metrics`, `/health`, `/ready`, `/api/health`, `/api/ready` are healthy.

## Wave A Operator Baseline Evidence
- Branch baseline: `wave-a`
- Selector-first retrieve path is active; standard retrieve no longer depends on `package.xml`.
- Real org-backed refresh baseline verified with:
  - `WEB_SMOKE_USE_SF_PROJECT=1 ./scripts/web-smoke.sh`
  - `GET /api/ready`
- Verified ready payload:
  - `checks.fixtures.sourcePath=/app/data/sf-project/force-app/main/default`
  - `checks.db.nodeCount=7024`
  - `checks.db.edgeCount=51754`
- Operator failure messages for auth/session now include remediation for:
  - missing `sf`
  - missing `cci`
  - alias not authenticated in `sf`
  - alias not imported into `cci`

## Release Steps
1. Merge approved PR into `main`.
2. Pull latest main on the Windows workstation:
`git checkout main && git pull --ff-only`
3. Create and push release tag:
`git tag vX.Y.Z && git push origin vX.Y.Z`
4. Run the Windows desktop verification workflow.
5. Capture release notes and verification artifacts.

## Rollback
1. Identify last known-good tag.
2. Checkout that tag commit.
3. Re-run smoke checks.

## Branch Protection Recommendations (`main`)
- Require PR before merge.
- Require at least one approving review.
- Require status checks to pass:
  - CI
  - Runtime Nightly
- Disallow force pushes.
- Require linear history (optional but recommended).
