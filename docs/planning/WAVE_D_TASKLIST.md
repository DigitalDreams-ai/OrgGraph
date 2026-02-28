# Wave D Tasklist - Fresh Next.js Ask-First UX

Objective: deliver a fresh workflow-native Next.js UI where Ask is the flagship and raw JSON is secondary.

## Interpretation Update
- Wave D remains valid as a capability target.
- Its original browser-hosted implementation path is superseded by Wave G.
- Do not implement Wave D as a standalone browser-hosted modernization track.
- Use this wave to preserve the product requirements that must be realized in the desktop UX.

## Scope
- Fresh Ask-first UI baseline (not legacy endpoint-console derivative).
- Workflow-native tabs: Ask, Connect, Retrieve, Refresh, Analyze, Proofs, System.
- Predictable data contract and feature-segmented Next.js structure.

## Tasks
- [ ] Build fresh app shell and IA for workflow-native operator experience.
- [ ] Make Ask panel primary with decision packet-first layout.
- [ ] Keep raw JSON behind explicit operator action.
- [ ] Implement feature-segmented route/module structure in Next.js App Router.
- [ ] Normalize server/client boundaries and API adapter layer.
- [ ] Add interaction states, empty states, and actionable error UX.
- [ ] Add UI smoke + behavior parity tests for core workflows.
- [ ] Remove dependency on legacy UI routes for core operations.

## Exit Gates
- [ ] Workflow parity smoke pass on new UI.
- [ ] Operator task completion target achieved vs legacy baseline.
- [ ] No legacy UI route required for core workflows.
- [ ] New UI supports connect/retrieve/refresh/ask/proof end-to-end.

## Implementation Note
- Wave D requirements should now be delivered through [WAVE_G_TASKLIST.md](/volume1/data/projects/OrgGraph/docs/planning/WAVE_G_TASKLIST.md) on top of the desktop foundation defined in [WAVE_F_TASKLIST.md](/volume1/data/projects/OrgGraph/docs/planning/WAVE_F_TASKLIST.md).
