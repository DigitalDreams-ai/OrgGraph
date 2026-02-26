# Release Checklist

## Scope
This checklist defines repeatable NAS deployment and release steps for Orgumented API + Web.

## Versioning & Image Tags
- Create release tags as `vMAJOR.MINOR.PATCH` (example: `v0.5.0`).
- Docker workflow publishes both images on tagged pushes:
  - `ghcr.io/<org>/<repo>/orgumented-api:<tag>`
  - `ghcr.io/<org>/<repo>/orgumented-web:<tag>`
- Keep `sha` tags for traceability and rollback.

## Pre-Release Checks
1. `pnpm -r typecheck`
2. `pnpm --filter api test`
3. `pnpm --filter api build`
4. `pnpm --filter web build`
5. `docker compose -f docker/docker-compose.yml up -d --build`
6. Run smoke checks: `./scripts/web-smoke.sh`
7. Confirm `/metrics`, `/health`, `/ready`, `/api/health`, `/api/ready` are healthy.

## Release Steps
1. Merge approved PR into `main`.
2. Pull latest main on NAS:
`git checkout main && git pull --ff-only`
3. Create and push release tag:
`git tag vX.Y.Z && git push origin vX.Y.Z`
4. Wait for Docker workflow to publish images.
5. Deploy on NAS using compose build/pull policy.

## Rollback
1. Identify last known-good tag.
2. Checkout that tag commit or deploy matching image tags.
3. Re-run smoke checks.

## Branch Protection Recommendations (`main`)
- Require PR before merge.
- Require at least one approving review.
- Require status checks to pass:
  - CI
  - Docker
- Disallow force pushes.
- Require linear history (optional but recommended).
