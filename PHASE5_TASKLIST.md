# OrgGraph Phase 5 Task List (Hardening + Delivery)

Goal: harden reliability and delivery workflows after Phase 4 so API/Web are production-ready on NAS with safer operations and better validation depth.

## Scope
- Improve runtime reliability and startup sequencing
- Add stronger API/web validation and regression checks
- Tighten release/ops workflows for predictable deployments
- Keep deterministic graph behavior as the system of record

## 1. Runtime Reliability

- [ ] Add explicit health/readiness endpoints for API and Web
- [ ] Add Docker healthchecks for both services
- [ ] Add startup ordering/health gating in compose (not just `depends_on`)
- [ ] Add retry/backoff behavior in web API client for transient startup windows

## 2. API Hardening

- [ ] Standardize error envelopes across endpoints (`/refresh`, `/ask`, `/perms`, `/impact`, `/automation`)
- [ ] Add request validation tightening (edge-case payloads/query params)
- [ ] Add simple request/latency metrics for key endpoints
- [ ] Add guardrails for large evidence/result payloads (caps + clear messaging)

## 3. Web UX Hardening

- [ ] Improve response rendering for large JSON payloads (collapsed sections/copy support)
- [ ] Add inline error states with actionable troubleshooting text
- [ ] Add environment/status panel (API base, service reachability)
- [ ] Add lightweight navigation structure for operator workflows

## 4. Test Coverage Expansion

- [ ] Add API regression tests for standardized error envelope behavior
- [ ] Add integration tests for refresh healthcheck/startup scenarios
- [ ] Add web smoke/e2e tests for core flows (refresh, perms, automation, impact, ask)
- [ ] Add CI artifact upload for failing integration/e2e runs

## 5. Deployment & Release Workflow

- [ ] Add release checklist doc (`RELEASE.md`) for NAS deployment steps
- [ ] Define image tagging/version strategy for API + Web
- [ ] Add optional manual workflow dispatch for release builds
- [ ] Add branch protection/check policy recommendations for `main`

## 6. Documentation

- [ ] Update README with healthcheck and troubleshooting section
- [ ] Document operational env vars and defaults in one place
- [ ] Add architecture note for runtime boundaries (API/Web/Evidence/DB)

## Definition of Done (Phase 5)

- [ ] Docker services expose health/readiness checks and compose respects them
- [ ] API/web error handling is consistent and test-covered
- [ ] CI includes stronger regression and web flow validation
- [ ] Release/deployment process is documented and repeatable
- [ ] Phase 5 tasklist updated to complete

## Immediate Next Action

- [ ] Implement service health/readiness endpoints + Docker healthchecks, then add tests that verify startup reliability.
