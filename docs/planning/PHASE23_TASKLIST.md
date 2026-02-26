# Orgumented Phase 23 Task List (WebUI Authentication and Org Session UX)

Goal: make org auth/session management seamless in WebUI using CCI-based workflows, with clear operator controls and failure recovery.

## Entry Criteria
- [ ] Phase 22 complete
- [ ] Metadata browser retrieval core functioning in WebUI

## Exit Criteria
- [ ] WebUI can start/validate org session through CCI flow
- [ ] WebUI supports reconnect, switch-org, and disconnect flows
- [ ] Session/auth state is explicit, observable, and auditable
- [ ] Auth/runbook docs updated for WebUI-first operations

## Scope
- CCI auth UX endpoints and front-end orchestration
- Session lifecycle state machine
- Operator-safe error messaging and remediation
- Multi-org switching primitives (single active org at runtime)

## Deliverables
- [ ] Add auth/session API surface for WebUI:
  - [ ] connect/start auth
  - [ ] status/health
  - [ ] disconnect/clear session
  - [ ] switch active org alias
- [ ] Add WebUI session controls:
  - [ ] active org indicator
  - [ ] reconnect and re-auth actions
  - [ ] switch-org dialog
- [ ] Add deterministic auth audit artifact:
  - [ ] timestamp
  - [ ] alias/org id (masked where needed)
  - [ ] auth mode used
- [ ] Harden auth failure handling:
  - [ ] expired token/session
  - [ ] CCI/sf binary unavailable
  - [ ] org access denied

## Test Gates
- [ ] `pnpm --filter api test`
- [ ] `pnpm --filter web build`
- [ ] web smoke validates connect -> status -> retrieve -> disconnect
- [ ] sandbox validation confirms switch-org workflow

## Definition of Done
- [ ] WebUI auth/session flows are primary, predictable, and recovery-friendly for daily operator use
