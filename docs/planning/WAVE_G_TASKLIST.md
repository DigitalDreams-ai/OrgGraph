# Wave G Tasklist - Desktop Ask-First Product UX

Objective: deliver the fresh desktop-native Orgumented experience with Ask as the flagship workflow.

## Scope
- Build the fresh desktop UI from the UX blueprint.
- Make Ask the primary workspace.
- Migrate org browser, refresh/build, analyze, proofs/history, and diagnostics into desktop-native flows.
- Replace JSON-first operator experience with decision-packet-first rendering.

## Tasks
- [ ] Implement desktop navigation from the UX blueprint.
- [ ] Make Ask the default landing workspace.
- [ ] Render deterministic answer summary, explanation, trust envelope, proof context, and follow-up actions as the primary Ask response.
- [ ] Keep raw JSON as a secondary inspector only.
- [ ] Implement desktop Org Sessions workspace.
- [ ] Implement desktop Org Browser workspace with org-wide selective retrieve.
- [ ] Implement desktop Refresh and Build workspace.
- [ ] Implement desktop Explain and Analyze workspace.
- [ ] Implement desktop Proofs and History workspace.
- [ ] Implement desktop Settings and Diagnostics workspace.
- [ ] Add operator history model so proofs/replays are accessed by labeled history, not token bookkeeping.
- [ ] Remove dependency on the legacy browser-hosted operator UI for primary workflows.

## Exit Gates
- [ ] Ask-first desktop experience is the default product interaction.
- [ ] Core operator workflows reach parity in the desktop product.
- [ ] Decision packets, not raw JSON, are the default Ask output.
- [ ] Proof/history access works without manual tracking of opaque IDs/tokens.
- [ ] Org Browser supports org-wide selection and retrieve workflows in the desktop UX.
- [ ] Legacy browser-hosted operator UI is no longer required for primary usage.

## Dependencies
- Wave F exit gates passed
- `docs/planning/DESKTOP_UX_BLUEPRINT.md`

## Evidence Required
- desktop workflow screenshots or walkthrough
- Ask parity smoke results
- org browser retrieve demonstration
- proof/history workflow demonstration
