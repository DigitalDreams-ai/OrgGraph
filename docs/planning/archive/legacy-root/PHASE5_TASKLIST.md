# Orgumented Phase 5 Task List (Hardening + Delivery)

Goal: harden reliability and delivery workflows after Phase 4 so API/Web are production-ready on NAS with safer operations and better validation depth.

## Scope
- Improve runtime reliability and startup sequencing
- Add stronger API/web validation and regression checks
- Tighten release/ops workflows for predictable deployments
- Keep deterministic graph behavior as the system of record

## 1. Runtime Reliability

- [x] Add explicit health/readiness endpoints for API and Web
- [x] Add Docker healthchecks for both services
- [x] Add startup ordering/health gating in compose (not just `depends_on`)
- [x] Add retry/backoff behavior in web API client for transient startup windows

## 2. API Hardening

- [x] Standardize error envelopes across endpoints (`/refresh`, `/ask`, `/perms`, `/impact`, `/automation`)
- [x] Add request validation tightening (edge-case payloads/query params)
- [x] Add simple request/latency metrics for key endpoints
- [x] Add guardrails for large evidence/result payloads (caps + clear messaging)

## 3. Web UX Hardening

- [x] Improve response rendering for large JSON payloads (collapsed sections/copy support)
- [x] Add inline error states with actionable troubleshooting text
- [x] Add environment/status panel (API base, service reachability)
- [x] Add lightweight navigation structure for operator workflows

## 4. Test Coverage Expansion

- [x] Add API regression tests for standardized error envelope behavior
- [x] Add integration tests for refresh healthcheck/startup scenarios
- [x] Add web smoke/e2e tests for core flows (refresh, perms, automation, impact, ask)
- [x] Add CI artifact upload for failing integration/e2e runs

## 5. Deployment & Release Workflow

- [x] Add release checklist doc (`RELEASE.md`) for NAS deployment steps
- [x] Define image tagging/version strategy for API + Web
- [x] Add optional manual workflow dispatch for release builds
- [x] Add branch protection/check policy recommendations for `main`

## 6. Documentation

- [x] Update README with healthcheck and troubleshooting section
- [x] Document operational env vars and defaults in one place
- [x] Add architecture note for runtime boundaries (API/Web/Evidence/DB)

## Definition of Done (Phase 5)

- [x] Docker services expose health/readiness checks and compose respects them
- [x] API/web error handling is consistent and test-covered
- [x] CI includes stronger regression and web flow validation
- [x] Release/deployment process is documented and repeatable
- [x] Phase 5 tasklist updated to complete

## Immediate Next Action

- [x] Implement service health/readiness endpoints + Docker healthchecks, then add tests that verify startup reliability.
