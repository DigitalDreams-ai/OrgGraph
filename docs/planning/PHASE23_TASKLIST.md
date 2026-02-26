# Orgumented Phase 23 Task List (WebUI Authentication and Org Session UX)

Goal: make org auth/session management seamless in WebUI using CCI-based workflows, with clear operator controls and failure recovery.

## Entry Criteria
- [x] Phase 22 complete
- [x] Metadata browser retrieval core functioning in WebUI

## Exit Criteria
- [x] WebUI can start/validate org session through CCI flow
- [x] WebUI supports reconnect, switch-org, and disconnect flows
- [x] Session/auth state is explicit, observable, and auditable
- [x] Auth/runbook docs updated for WebUI-first operations

## Scope
- CCI auth UX endpoints and front-end orchestration
- Session lifecycle state machine
- Operator-safe error messaging and remediation
- Multi-org switching primitives (single active org at runtime)

## Deliverables
- [x] Add auth/session API surface for WebUI:
  - [x] connect/start auth
  - [x] status/health
  - [x] disconnect/clear session
  - [x] switch active org alias
- [x] Add WebUI session controls:
  - [x] active org indicator
  - [x] reconnect and re-auth actions
  - [x] switch-org dialog
- [x] Add deterministic auth audit artifact:
  - [x] timestamp
  - [x] alias/org id (masked where needed)
  - [x] auth mode used
- [x] Harden auth failure handling:
  - [x] expired token/session
  - [x] CCI/sf binary unavailable
  - [x] org access denied

## Test Gates
- [x] `pnpm --filter api test`
- [x] `pnpm --filter web build`
- [x] web smoke validates connect -> status -> retrieve -> disconnect
- [ ] sandbox validation confirms switch-org workflow

## Definition of Done
- [x] WebUI auth/session flows are primary, predictable, and recovery-friendly for daily operator use
