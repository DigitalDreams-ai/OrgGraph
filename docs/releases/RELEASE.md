# Release Checklist

## Scope
This release note template defines repeatable Windows desktop release evidence for Orgumented.

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
7. Launch packaged shell locally: `apps/desktop/src-tauri/target/release/orgumented-desktop.exe`
8. Confirm packaged API readiness: `curl http://localhost:3100/ready`
9. Capture one packaged-shell workflow proof and its log artifact.

## Current Runtime Evidence
- Product boundary: Windows desktop app
- Packaged runtime now includes:
  - static embedded UI assets
  - deployed API runtime
  - bundled Node runtime
- Minimum release evidence should include:
  - `pnpm desktop:build` success
  - packaged shell startup proof
  - `/ready` returning `200`
  - one operator workflow proof from the packaged shell

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
3. Re-run packaged desktop verification.

## Branch Protection Recommendations (`main`)
- Require PR before merge.
- Require at least one approving review.
- Require status checks to pass:
  - CI
  - Runtime Nightly
- Disallow force pushes.
- Require linear history (optional but recommended).
