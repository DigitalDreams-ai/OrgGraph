# Orgumented Phase 7 Task List (Reasoning Quality + Org Alignment)

Goal: improve correctness and trust for live-org answers by tightening parser precision, resolving `/perms` org mapping, and adding production-grade validation gates.

## Scope
- Align permission reasoning to real sandbox users/profiles/permission sets
- Reduce parser false positives/negatives on live metadata
- Improve impact/automation signal quality and explainability
- Add validation datasets and acceptance checks before production promotion

## 1. Permission Alignment (`/perms`)

- [ ] Replace fixture-only user/profile mapping with org-derived mapping strategy
- [ ] Add import path for real user->profile/permission-set assignments from retrieved metadata/org API
- [ ] Validate `/perms` for known sandbox users against expected object/field grants
- [ ] Add fallback behavior and clear warnings when principal mapping is incomplete

## 2. Parser Precision Hardening

- [ ] Tighten Apex class/object extraction to reduce false class/object tokens
- [ ] Improve Flow field/object extraction to reduce generic/non-SF dotted token noise
- [ ] Add parser confidence metadata per generated edge (`high|medium|low`)
- [ ] Add skip/ignore registry for known non-actionable metadata patterns

## 3. Impact & Automation Quality

- [ ] Rank/score automation and impact paths by confidence and relevance
- [ ] Add optional strict mode to suppress low-confidence paths
- [ ] Improve `/impact` to prioritize exact field matches before object-level fallbacks
- [ ] Add endpoint option to include raw parser evidence for debugging (`debug=true`)

## 4. Validation Harness (Live Org)

- [ ] Create sandbox validation fixture set (`known object`, `known field`, `known automation` expectations)
- [ ] Add smoke script for live checks (`ready`, `perms`, `automation`, `impact`, `ask`)
- [ ] Add regression checks comparing previous vs current graph/evidence counts with thresholds
- [ ] Record validation snapshots and diffs for release decisions

## 5. Observability & Audit

- [ ] Emit parser stats (files parsed, files skipped, parse warnings) in refresh response
- [ ] Add endpoint for latest ingest summary (`/ingest/latest` or equivalent)
- [ ] Persist structured refresh audit entries for comparison across runs
- [ ] Add quick command/report for top unknown or low-confidence entities

## 6. Production Promotion Gate

- [ ] Define go/no-go criteria for promoting from sandbox to production org
- [ ] Add pre-promotion checklist with rollback commands and backup points
- [ ] Validate secrets/credential rotation procedure for production auth
- [ ] Document production cadence (manual vs scheduled retrieve/refresh)

## Definition of Done (Phase 7)

- [ ] `/perms` is validated against real sandbox user access expectations
- [ ] `/automation`, `/impact`, and `/ask` show improved precision on live metadata
- [ ] Parser confidence/diagnostics are surfaced and test-covered
- [ ] Live-org smoke/regression harness is in place and repeatable
- [ ] Phase 7 tasklist updated to complete

## Immediate Next Action

- [ ] Implement org-derived user->principal mapping and complete first `/perms` sandbox validation set.
