# Orgumented Phase 18 Task List (WebUI-First Auth + Runtime Alignment)

Goal: make WebUI the primary operational surface by migrating org authentication flows to `cci` and aligning runtime controls to UI-first usage.

## Entry Criteria
- [x] Phase 17 complete and merged
- [x] Existing API/CLI auth flows stable in current environments
- [x] `docs/planning/SUCCESS_GATES_CHECKLIST.md` KPI and benchmark prerequisites reviewed

## Exit Criteria
- [x] WebUI supports org auth/login via CumulusCI flow (no External Client App dependency in primary UX)
- [x] CumulusCI version pinned to `3.78.0` in runtime images/tooling
- [x] Auth/session status is visible and deterministic in UI/API

## Scope
- WebUI authentication mode redesign
- CCI runner integration in backend/API orchestration
- Runtime config cleanup for auth path selection
- Deprecation path for External Client App UI flow

## Deliverables
- [x] Add WebUI auth workflow: connect org via `cci` commands
- [x] Pin CumulusCI to `3.78.0` in Docker/runtime and docs
- [x] Add auth status endpoint(s) and WebUI status panel
- [x] Add explicit auth mode config (`auth_mode=cci`) with fail-closed behavior
- [x] Add migration note from External Client App flow to CCI flow

## Test Gates
- [x] CI validates cci availability and version `3.78.0`
- [x] Sandbox login smoke from WebUI passes
- [x] Auth failure cases provide deterministic actionable errors
- [x] No secret leakage in logs/artifacts

## Risks and Controls
- Risk: environment drift from cci/sf CLI versions
  - [x] enforce pinned versions + startup self-check
- Risk: partial migration leaves split user paths
  - [x] make CCI path default and mark old flow as legacy

## Current Status (2026-02-26)
- Implemented this phase:
  - `/org/status` API endpoint with deterministic CCI/SF probe output
  - WebUI query kinds for `orgStatus` and `orgRetrieve`
  - WebUI query kind for `orgConnect` (CCI auth/session validation path)
  - Docker + CI pin/validation for CumulusCI `3.78.0`
  - Default auth mode switched to `cci`
  - web smoke includes optional auth gate (`WEB_SMOKE_REQUIRE_ORG_AUTH=1`) for sandbox validation
  - query logging path keeps request body secrets out of logs
  - runbook marks External Client App as legacy fallback
  
### Sandbox Validation Command
- `WEB_SMOKE_REQUIRE_ORG_AUTH=1 ./scripts/web-smoke.sh`

## Definition of Done
- [x] Org connection in primary WebUI path is CCI-based, deterministic, and operator-auditable
- [x] Required success gates for Phase 18 are satisfied or explicitly deferred with rationale
