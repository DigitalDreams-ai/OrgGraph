# OrgGraph Phase 4 Task List (Polish + UX)

Goal: complete Phase 4 polish with incremental refresh, a usable web UI, and operational hardening on NAS.

## Scope
- Add incremental refresh mode to avoid unnecessary full rebuilds
- Add `apps/web` Next.js UI for core workflows
- Keep deterministic graph/evidence behavior intact
- Ensure Docker + CI cover new Phase 4 surface area

## 1. Incremental Refresh

- [ ] Add refresh mode contract (`full` | `incremental`) on `POST /refresh`
- [ ] Implement fixture change detection fingerprint
- [ ] Persist refresh state metadata (`data/refresh/state.json`)
- [ ] Skip rebuild when unchanged in incremental mode
- [ ] Return refresh metadata (`mode`, `skipped`, `skipReason`)

## 2. Web App (`apps/web`)

- [ ] Scaffold Next.js app in monorepo workspace
- [ ] Add API base configuration (`NEXT_PUBLIC_API_BASE`)
- [ ] Build UI flows for:
  - [ ] Refresh
  - [ ] Permissions query
  - [ ] Automation query
  - [ ] Impact query
  - [ ] Ask query
- [ ] Add responsive layout for desktop/mobile

## 3. Docker + Runtime

- [ ] Add web container build/runtime definition
- [ ] Wire web + api services in `docker/docker-compose.yml`
- [ ] Validate NAS runtime with both services up

## 4. CI + Repo Hygiene

- [ ] Ensure CI validates web build/typecheck
- [ ] Keep API test/build checks green
- [ ] Ensure no regressions in PR workflows

## 5. Testing

- [ ] Extend integration tests for incremental refresh behavior
- [ ] Keep existing parser/validation/integration tests passing
- [ ] Smoke test web to API connectivity

## 6. Documentation

- [ ] Update `README.md` with web + incremental refresh usage
- [ ] Update `.env.example` with any new variables
- [ ] Add Phase 4 notes to planning docs as needed

## Definition of Done (Phase 4)

- [ ] Incremental refresh mode works and skips unchanged refreshes
- [ ] Web UI can execute `/refresh`, `/perms`, `/automation`, `/impact`, `/ask`
- [ ] Docker project runs API + Web services on NAS
- [ ] CI checks pass for updated monorepo
- [ ] Phase 4 tasklist updated to complete

## Immediate Next Action

- [ ] Implement incremental refresh API contract + state/fingerprint logic and add integration coverage.
