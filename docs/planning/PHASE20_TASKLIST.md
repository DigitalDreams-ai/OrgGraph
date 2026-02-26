# Orgumented Phase 20 Task List (WebUI Overhaul for Full Capability Surface)

Goal: overhaul WebUI to expose current Orgumented runtime capabilities end-to-end and make WebUI the primary daily interface.

## Entry Criteria
- [ ] Phase 19 complete
- [ ] Metadata retrieval UX stable at org scale

## Exit Criteria
- [ ] WebUI covers core API capability surface (refresh, diff, perms, automation, impact, ask, architecture decisions, meta/adapt)
- [ ] Ask response layering shipped: deterministic summary first, optional conversational expansion second
- [ ] Operator workflows are usable without CLI-first dependency

## Scope
- Web information architecture redesign
- Query workflow unification
- Decision and proof visualization
- Operational observability in UI

## Deliverables
- [ ] New WebUI navigation model for runtime lifecycle:
  - auth/connect
  - retrieve/select
  - refresh/diff
  - analyze/ask/decide
  - proofs/metrics/meta
- [ ] Unified query panel for:
  - `/perms`, `/perms/system`, `/automation`, `/impact`, `/ask`, `/ask/architecture`
- [ ] Proof + replay inspector (`proofId`, `replayToken`, trust metrics, rejected branches)
- [ ] Drift/meta dashboards:
  - semantic diff summaries
  - adaptation context + audit artifacts
- [ ] Ask output layering UX:
  - deterministic evidence summary
  - optional conversational elaboration

## Test Gates
- [ ] Web smoke includes all primary workflows
- [ ] API parity checks for UI-triggered actions
- [ ] Role-based/manual operator acceptance on sandbox org
- [ ] No regression in deterministic replay/trust outputs

## Risks and Controls
- Risk: UI complexity overwhelms users
  - [ ] ship progressive disclosure and workflow presets
- Risk: UI diverges from runtime truth
  - [ ] use strict API contracts and show raw payload drilldown

## Definition of Done
- [ ] WebUI is the primary, reliable, and complete operator surface for Orgumented
