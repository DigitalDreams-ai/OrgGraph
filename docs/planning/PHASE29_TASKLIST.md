# Orgumented Phase 29 Task List (Identity and Permission Truth Layer)

Goal: make permission outcomes provably accurate by upgrading user-to-principal resolution and map freshness.

## Entry Criteria
- [ ] Phase 28 complete

## Exit Criteria
- [ ] `/perms` and `/perms/system` produce reliable, explainable outcomes for real org users
- [ ] Mapping freshness and source are visible in API and UI

## Deliverables
- [x] Add principal resolution diagnostics endpoint (`whoami` style for user mapping)
- [ ] Introduce map freshness metadata (generatedAt/source/version) and stale warnings
- [ ] Add deterministic fallback strategy when user map is missing or partial
- [ ] Add org-driven user principal export/import workflow in UI and scripts
- [ ] Add discrepancy detector: expected access vs computed access triage helper
- [ ] Document validation process for permission trust certification

## Test Gates
- [ ] unit tests for mapping edge cases
- [ ] integration tests for mapped/unmapped/stale-map scenarios
- [ ] live sandbox verification set for known privileged and non-privileged users

## Definition of Done
- [ ] Permission explainability is trustworthy enough for architecture and compliance discussions.
