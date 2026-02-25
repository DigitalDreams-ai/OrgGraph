# OrgGraph Phase 6 Task List (Salesforce Org Integration)

Goal: connect OrgGraph to a real Salesforce org and run first live metadata retrieval + graph/evidence ingest safely using a sandbox-first rollout.

## Scope
- Add secure org auth strategy for NAS (non-interactive)
- Add repeatable metadata retrieve workflow
- Ingest retrieved metadata through existing refresh pipeline
- Validate end-to-end behavior on sandbox before production

## 1. Auth & Secrets

- [ ] Define supported auth modes (SFDX auth URL and/or JWT)
- [ ] Add env vars for org auth settings (no secrets committed)
- [ ] Add secret handling guidance for Synology/NAS deployment
- [ ] Add auth validation step with clear error outputs

## 2. Metadata Retrieve Pipeline

- [ ] Add retrieve script/command wrapper for `sf project retrieve start`
- [ ] Define retrieve target path (separate from static fixtures)
- [ ] Add manifest/package selection strategy (minimum required metadata first)
- [ ] Add timeout/retry behavior for retrieve operations

## 3. API/CLI Integration

- [ ] Add API-triggered retrieve + refresh flow (or explicit two-step flow)
- [ ] Add execution status response shape (started, completed, failed)
- [ ] Surface retrieve errors in standardized error envelope
- [ ] Ensure graph/evidence refresh can run on retrieved metadata path

## 4. Validation & Safety Gates

- [ ] Sandbox-first runbook (no production-first ingestion)
- [ ] Validate node/edge/evidence count deltas after retrieve
- [ ] Validate key endpoints after live refresh (`/perms`, `/automation`, `/impact`, `/ask`)
- [ ] Add rollback procedure for failed retrieve/ingest

## 5. Observability

- [ ] Add retrieve metrics/logging (duration, files, status)
- [ ] Add audit trail entry for retrieve source/time/result
- [ ] Add troubleshooting commands for auth/retrieve failures

## 6. Docs & Operations

- [ ] Update README with org integration setup and flow
- [ ] Add `ORG_INTEGRATION.md` with step-by-step sandbox setup
- [ ] Document promotion checklist from sandbox -> production org

## Definition of Done (Phase 6)

- [ ] Sandbox org auth works on NAS without interactive prompts
- [ ] Metadata retrieval runs successfully and repeatably
- [ ] Retrieved metadata ingests into graph + evidence successfully
- [ ] Post-refresh API/Web checks pass on live-retrieved metadata
- [ ] Phase 6 tasklist updated to complete

## Immediate Next Action

- [ ] Implement auth configuration + retrieve wrapper script, then run first sandbox metadata pull and validate refresh output.
