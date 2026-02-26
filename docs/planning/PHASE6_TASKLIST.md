# Orgumented Phase 6 Task List (Salesforce Org Integration)

Goal: connect Orgumented to a real Salesforce org and run first live metadata retrieval + graph/evidence ingest safely using a sandbox-first rollout.

## Scope
- Add secure org auth strategy for NAS (non-interactive)
- Add repeatable metadata retrieve workflow
- Ingest retrieved metadata through existing refresh pipeline
- Validate end-to-end behavior on sandbox before production

## 1. Auth & Secrets

- [x] Define supported auth modes (External Client App OAuth refresh-token, plus fallback modes)
- [x] Add env vars for org auth settings (no secrets committed)
- [x] Add secret handling guidance for Synology/NAS deployment
- [x] Add auth validation step with clear error outputs
- [x] Add one-time OAuth authorization-code bootstrap workflow for sandbox

## 2. Metadata Retrieve Pipeline

- [x] Add retrieve script/command wrapper for `sf project retrieve start`
- [x] Define retrieve target path (separate from static fixtures)
- [x] Add manifest/package selection strategy (minimum required metadata first)
- [x] Add timeout/retry behavior for retrieve operations

## 3. API/CLI Integration

- [x] Add API-triggered retrieve + refresh flow (or explicit two-step flow)
- [x] Add execution status response shape (started, completed, failed)
- [x] Surface retrieve errors in standardized error envelope
- [x] Ensure graph/evidence refresh can run on retrieved metadata path

## 4. Validation & Safety Gates

- [x] Sandbox-first runbook (no production-first ingestion)
- [x] Validate node/edge/evidence count deltas after retrieve (implemented in flow + response metadata)
- [ ] Validate key endpoints after live refresh (`/perms`, `/automation`, `/impact`, `/ask`) against sandbox org
: Live run on 2026-02-25 validated `/automation`, `/impact`, `/ask`, `/ready` on retrieved metadata path; `/perms` still needs org-specific user->principal mapping validation.
- [x] Add rollback procedure for failed retrieve/ingest

## 5. Observability

- [x] Add retrieve metrics/logging (duration, files, status)
- [x] Add audit trail entry for retrieve source/time/result
- [x] Add troubleshooting commands for auth/retrieve failures

## 6. Docs & Operations

- [x] Update README with org integration setup and flow
- [x] Add `docs/runbooks/ORG_INTEGRATION.md` with step-by-step sandbox setup
- [x] Document promotion checklist from sandbox -> production org

## Definition of Done (Phase 6)

- [x] Sandbox org auth works on NAS without interactive prompts (requires user credentials)
- [x] Metadata retrieval runs successfully and repeatably against sandbox org
- [x] Retrieved metadata ingests into graph + evidence successfully
- [x] Post-refresh API/Web checks pass on live-retrieved metadata
- [x] Phase 6 tasklist updated to current implementation state

## Immediate Next Action

- [ ] Finalize `/perms` sandbox validation by aligning user->principal mapping with real org users/profiles.
