# Orgumented Phase 28 Task List (Runtime Reliability and Trust Baseline)

Goal: make core runtime paths consistently reliable so the platform can be trusted before higher-order UX and reasoning upgrades.

## Entry Criteria
- [ ] Phase 27 merged
- [ ] API and Web health checks stable in local and Docker runtime

## Exit Criteria
- [ ] Connect/session/retrieve flows are deterministic and actionable
- [ ] Runtime error taxonomy is clear and operator-facing
- [ ] Clipboard and response UX reliability issues resolved

## Deliverables
- [ ] Fix auth-path behavior so Connect tab does not imply unsupported backend mode switching
- [ ] Harden org session lifecycle (`check`, `switch`, `connect`, `disconnect`) with explicit state transitions
- [ ] Add runtime preflight endpoint for sf/cci/auth/keychain readiness
- [ ] Replace generic UI error copy with structured actionable remediation
- [ ] Add fallback-safe copy-to-clipboard behavior and visual confirmation states
- [ ] Add integration tests for known failure classes (`alias not authenticated`, `tool missing`, `bad request`, `drift-gated refresh`)

## Test Gates
- [ ] `pnpm --filter api test`
- [ ] `pnpm --filter web typecheck`
- [ ] `npm run test:web-smoke`
- [ ] UI functional matrix pass for reliability-critical actions

## Definition of Done
- [ ] Operator can identify root cause and next step for any failed runtime action without reading backend logs.
