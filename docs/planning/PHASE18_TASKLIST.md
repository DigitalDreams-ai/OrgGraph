# Orgumented Phase 18 Task List (WebUI-First Auth + Runtime Alignment)

Goal: make WebUI the primary operational surface by migrating org authentication flows to `cci` and aligning runtime controls to UI-first usage.

## Entry Criteria
- [x] Phase 17 complete and merged
- [x] Existing API/CLI auth flows stable in current environments
- [x] `docs/planning/SUCCESS_GATES_CHECKLIST.md` KPI and benchmark prerequisites reviewed

## Exit Criteria
- [ ] WebUI supports org auth/login via CumulusCI flow (no External Client App dependency in primary UX)
- [x] CumulusCI version pinned to `3.78.0` in runtime images/tooling
- [x] Auth/session status is visible and deterministic in UI/API

## Scope
- WebUI authentication mode redesign
- CCI runner integration in backend/API orchestration
- Runtime config cleanup for auth path selection
- Deprecation path for External Client App UI flow

## Deliverables
- [ ] Add WebUI auth workflow: connect org via `cci` commands
- [x] Pin CumulusCI to `3.78.0` in Docker/runtime and docs
- [x] Add auth status endpoint(s) and WebUI status panel
- [x] Add explicit auth mode config (`auth_mode=cci`) with fail-closed behavior
- [x] Add migration note from External Client App flow to CCI flow

## Test Gates
- [x] CI validates cci availability and version `3.78.0`
- [ ] Sandbox login smoke from WebUI passes
- [x] Auth failure cases provide deterministic actionable errors
- [ ] No secret leakage in logs/artifacts

## Risks and Controls
- Risk: environment drift from cci/sf CLI versions
  - [x] enforce pinned versions + startup self-check
- Risk: partial migration leaves split user paths
  - [x] make CCI path default and mark old flow as legacy

## Current Status (2026-02-26)
- Implemented this phase:
  - `/org/status` API endpoint with deterministic CCI/SF probe output
  - WebUI query kinds for `orgStatus` and `orgRetrieve`
  - Docker + CI pin/validation for CumulusCI `3.78.0`
  - Default auth mode switched to `cci`
- Remaining to finish Phase 18:
  - full WebUI-driven interactive org connect flow (not only validation path)
  - sandbox login smoke specifically driven via the new WebUI connect UX

## Definition of Done
- [ ] Org connection in primary WebUI path is CCI-based, deterministic, and operator-auditable
- [ ] Required success gates for Phase 18 are satisfied or explicitly deferred with rationale
