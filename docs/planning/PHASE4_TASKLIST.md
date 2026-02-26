# Orgumented Phase 4 Task List (Polish + UX)

Goal: complete Phase 4 polish with incremental refresh, a usable web UI, and operational hardening on NAS.

## Scope
- Add incremental refresh mode to avoid unnecessary full rebuilds
- Add `apps/web` Next.js UI for core workflows
- Keep deterministic graph/evidence behavior intact
- Ensure Docker + CI cover new Phase 4 surface area

## 1. Incremental Refresh

- [x] Add refresh mode contract (`full` | `incremental`) on `POST /refresh`
- [x] Implement fixture change detection fingerprint
- [x] Persist refresh state metadata (`data/refresh/state.json`)
- [x] Skip rebuild when unchanged in incremental mode
- [x] Return refresh metadata (`mode`, `skipped`, `skipReason`)

## 2. Web App (`apps/web`)

- [x] Scaffold Next.js app in monorepo workspace
- [x] Add API base configuration (`NEXT_PUBLIC_API_BASE`)
- [x] Build UI flows for:
  - [x] Refresh
  - [x] Permissions query
  - [x] Automation query
  - [x] Impact query
  - [x] Ask query
- [x] Add responsive layout for desktop/mobile

## 3. Docker + Runtime

- [x] Add web container build/runtime definition
- [x] Wire web + api services in `docker/docker-compose.yml`
- [x] Validate NAS runtime with both services up

## 4. CI + Repo Hygiene

- [x] Ensure CI validates web build/typecheck
- [x] Keep API test/build checks green
- [x] Ensure no regressions in PR workflows

## 5. Testing

- [x] Extend integration tests for incremental refresh behavior
- [x] Keep existing parser/validation/integration tests passing
- [x] Smoke test web to API connectivity

## 6. Documentation

- [x] Update `README.md` with web + incremental refresh usage
- [x] Update `.env.example` with any new variables
- [x] Add Phase 4 notes to planning docs as needed

## Definition of Done (Phase 4)

- [x] Incremental refresh mode works and skips unchanged refreshes
- [x] Web UI can execute `/refresh`, `/perms`, `/automation`, `/impact`, `/ask`
- [x] Docker project runs API + Web services on NAS
- [x] CI checks pass for updated monorepo
- [x] Phase 4 tasklist updated to complete

## Immediate Next Action

- [x] Implement incremental refresh API contract + state/fingerprint logic and add integration coverage.
