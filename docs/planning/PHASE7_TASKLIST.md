# OrgGraph Phase 7 Task List (Reasoning Quality + Org Alignment)

Goal: improve correctness and trust for live-org answers by tightening parser precision, resolving `/perms` org mapping, and adding production-grade validation gates.

## Scope
- Align permission reasoning to real sandbox users/profiles/permission sets
- Reduce parser false positives/negatives on live metadata
- Improve impact/automation signal quality and explainability
- Add validation datasets and acceptance checks before production promotion

## 1. Permission Alignment (`/perms`)

- [x] Replace fixture-only user/profile mapping with org-derived mapping strategy
- [x] Add import path for real user->profile/permission-set assignments from retrieved metadata/org API
- [x] Validate `/perms` for known sandbox users against expected object/field grants
: Verified on 2026-02-25 with `aaugust@shulman-hill.com.uat` and object `litify_pm__Intake__c` (`granted=true`).
- [x] Add fallback behavior and clear warnings when principal mapping is incomplete

## 2. Parser Precision Hardening

- [x] Tighten Apex class/object extraction to reduce false class/object tokens
- [x] Improve Flow field/object extraction to reduce generic/non-SF dotted token noise
- [x] Add parser confidence metadata per generated edge (`high|medium|low`)
- [x] Add skip/ignore registry for known non-actionable metadata patterns

## 3. Impact & Automation Quality

- [x] Rank/score automation and impact paths by confidence and relevance
- [x] Add optional strict mode to suppress low-confidence paths
- [x] Improve `/impact` to prioritize exact field matches before object-level fallbacks
- [x] Add endpoint option to include raw parser evidence for debugging (`debug=true`)

## 4. Validation Harness (Live Org)

- [x] Create sandbox validation fixture set (`known object`, `known field`, `known automation` expectations)
- [x] Add smoke script for live checks (`ready`, `perms`, `automation`, `impact`, `ask`)
- [x] Add regression checks comparing previous vs current graph/evidence counts with thresholds
- [x] Record validation snapshots and diffs for release decisions

## 5. Observability & Audit

- [x] Emit parser stats (files parsed, files skipped, parse warnings) in refresh response
- [x] Add endpoint for latest ingest summary (`/ingest/latest` or equivalent)
- [x] Persist structured refresh audit entries for comparison across runs
- [x] Add quick command/report for top unknown or low-confidence entities

## 6. Production Promotion Gate

- [x] Define go/no-go criteria for promoting from sandbox to production org
- [x] Add pre-promotion checklist with rollback commands and backup points
- [x] Validate secrets/credential rotation procedure for production auth
- [x] Document production cadence (manual vs scheduled retrieve/refresh)

## Definition of Done (Phase 7)

- [x] `/perms` is validated against real sandbox user access expectations
- [x] `/automation`, `/impact`, and `/ask` show improved precision on live metadata
- [x] Parser confidence/diagnostics are surfaced and test-covered
- [x] Live-org smoke/regression harness is in place and repeatable
- [x] Phase 7 tasklist updated to complete

## Immediate Next Action

- [x] Implement org-derived user->principal mapping and complete first `/perms` sandbox validation set.

## Handoff To Phase 8

- [x] Phase 7 merged to `main`
- [x] Phase 8 planning created and activated at `docs/planning/PHASE8_TASKLIST.md`
