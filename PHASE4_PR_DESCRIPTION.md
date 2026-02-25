# Phase 4 PR Description

## Summary
- Implements **Phase 4 (Polish + UX)** on branch `phase4`
- Adds incremental refresh behavior to reduce unnecessary rebuilds
- Introduces a new web operator console in `apps/web`
- Extends Docker and CI coverage to include web runtime/build

## What Changed

### Incremental Refresh
- Added refresh mode support on `POST /refresh`:
  - `full` (default)
  - `incremental`
- Added fixture fingerprinting to detect metadata changes
- Added persisted refresh state tracking:
  - `REFRESH_STATE_PATH` (default `data/refresh/state.json`)
- Added skip metadata in refresh response:
  - `mode`
  - `skipped`
  - `skipReason` (`no_changes_detected`)

### Web App (`apps/web`)
- Added Next.js app as monorepo workspace package
- Added web operator UI for:
  - Refresh
  - Permissions query
  - Automation query
  - Impact query
  - Ask query
- Added API base config via `NEXT_PUBLIC_API_BASE`
- Added responsive, operator-focused layout for desktop/mobile

### Docker + CI
- Added web Dockerfile:
  - `docker/Dockerfile.web`
- Updated compose stack:
  - `api` service on `3100`
  - `web` service on `3101`
- Updated CI workflow to build web in addition to API
- Updated Docker workflow to build/push both API and web images

### Synology/NAS Build Stability
- Added `scripts/clean-eadir.sh` to remove Synology `@eaDir` artifacts before web builds
- Wired web `prebuild` script to run this cleanup, preventing Next standalone copy failures (`EISDIR`)

### Documentation
- Updated `README.md` with:
  - Service endpoints
  - Incremental refresh usage
- Added and completed `PHASE4_TASKLIST.md`

## Verification
- `pnpm --filter api test` passed
- `pnpm -r typecheck` passed
- `pnpm --filter api build` passed
- `pnpm --filter web build` passed
- Docker runtime smoke checks passed:
  - `POST /refresh` (`incremental` skip behavior verified)
  - `POST /ask`
  - Web UI reachable at `http://<host>:3101`

## Notes / Known Limitations
- `docs/` is gitignored in this repository; tracked tasklist updates are kept in root tasklist files.
- First request after container restart may briefly race service startup; subsequent requests are stable once services report ready.

## Follow-ups (Phase 5+)
- Add explicit health/readiness checks to compose for cleaner startup sequencing
- Add frontend integration/e2e tests for UI query flows
- Add auth/session model for web console if moving beyond single-operator internal usage
