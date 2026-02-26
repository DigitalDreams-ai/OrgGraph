# Orgumented Phase 24 Task List (WebUI Workflow Overhaul and Operator Experience)

Goal: overhaul WebUI so the full Orgumented lifecycle is workflow-first, modern, and production-usable as the primary interface.

## Entry Criteria
- [x] Phase 23 complete
- [x] WebUI metadata retrieval and auth/session flows stable

## Exit Criteria
- [x] WebUI supports end-to-end workflow: connect -> retrieve -> refresh -> analyze -> ask -> proof
- [x] UI structure reflects real operator journeys (not endpoint-first tabs)
- [x] Explainability surfaces are first-class in UI (proofs, citations, trust, policy envelope)
- [x] Accessibility and performance baseline documented

## Scope
- Information architecture redesign
- Unified workflow navigation and state continuity
- Better result rendering for perms/impact/automation/ask/proof
- Operational observability in UI

## Deliverables
- [x] Redesign navigation around workflows:
  - [x] Connect
  - [x] Retrieve
  - [x] Refresh
  - [x] Analyze
  - [x] Ask/Proof
- [x] Add run-state timeline:
  - [x] current org/session
  - [x] latest retrieve
  - [x] latest refresh snapshot
  - [x] drift/trust indicators
- [x] Upgrade Ask presentation:
  - [x] deterministic summary first
  - [x] optional conversational elaboration second
  - [x] proof/citation panel side-by-side
- [x] Add operator diagnostics panel:
  - [x] recent errors with categories
  - [x] service readiness
  - [x] active config mode summary (non-secret)

## Test Gates
- [x] `pnpm --filter web build`
- [x] web smoke validates full guided workflow path
- [x] mobile and desktop rendering sanity checks
- [x] accessibility pass for key flows (keyboard + readable states)

## Definition of Done
- [x] WebUI becomes the default way to operate Orgumented for daily architecture analysis
