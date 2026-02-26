# Orgumented Phase 24 Task List (WebUI Workflow Overhaul and Operator Experience)

Goal: overhaul WebUI so the full Orgumented lifecycle is workflow-first, modern, and production-usable as the primary interface.

## Entry Criteria
- [ ] Phase 23 complete
- [ ] WebUI metadata retrieval and auth/session flows stable

## Exit Criteria
- [ ] WebUI supports end-to-end workflow: connect -> retrieve -> refresh -> analyze -> ask -> proof
- [ ] UI structure reflects real operator journeys (not endpoint-first tabs)
- [ ] Explainability surfaces are first-class in UI (proofs, citations, trust, policy envelope)
- [ ] Accessibility and performance baseline documented

## Scope
- Information architecture redesign
- Unified workflow navigation and state continuity
- Better result rendering for perms/impact/automation/ask/proof
- Operational observability in UI

## Deliverables
- [ ] Redesign navigation around workflows:
  - [ ] Connect
  - [ ] Retrieve
  - [ ] Refresh
  - [ ] Analyze
  - [ ] Ask/Proof
- [ ] Add run-state timeline:
  - [ ] current org/session
  - [ ] latest retrieve
  - [ ] latest refresh snapshot
  - [ ] drift/trust indicators
- [ ] Upgrade Ask presentation:
  - [ ] deterministic summary first
  - [ ] optional conversational elaboration second
  - [ ] proof/citation panel side-by-side
- [ ] Add operator diagnostics panel:
  - [ ] recent errors with categories
  - [ ] service readiness
  - [ ] active config mode summary (non-secret)

## Test Gates
- [ ] `pnpm --filter web build`
- [ ] web smoke validates full guided workflow path
- [ ] mobile and desktop rendering sanity checks
- [ ] accessibility pass for key flows (keyboard + readable states)

## Definition of Done
- [ ] WebUI becomes the default way to operate Orgumented for daily architecture analysis
