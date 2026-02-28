# Wave G Tasklist - Desktop Ask-First Product UX

Objective: deliver the fresh desktop-native Orgumented experience with Ask as the flagship workflow.

## Scope
- Build the fresh desktop UI from the UX blueprint.
- Make Ask the primary workspace.
- Migrate org browser, refresh/build, analyze, proofs/history, and diagnostics into desktop-native flows.
- Replace JSON-first operator experience with decision-packet-first rendering.

## Tasks
- [x] Implement desktop navigation from the UX blueprint.
- [x] Make Ask the default landing workspace.
- [x] Render deterministic answer summary, explanation, trust envelope, proof context, and follow-up actions as the primary Ask response.
- [x] Keep raw JSON as a secondary inspector only.
- [ ] Make the packaged desktop shell own local runtime startup and supervision.
- [ ] Replace the browser-style `/api/query` proxy path with a desktop-native request boundary.
- [ ] Replace browser-era UI smoke and screenshot verification with desktop-shell verification.
- [ ] Break inherited monolithic desktop UI code into workspace modules.
- [ ] Implement desktop Org Sessions workspace.
- [ ] Implement desktop Org Browser workspace with org-wide selective retrieve.
- [ ] Implement desktop Refresh and Build workspace.
- [ ] Implement desktop Explain and Analyze workspace.
- [ ] Implement desktop Proofs and History workspace.
- [ ] Implement desktop Settings and Diagnostics workspace.
- [ ] Add operator history model so proofs/replays are accessed by labeled history, not token bookkeeping.
- [ ] Remove dependency on the superseded embedded dev-server workflow for primary operator usage.

## Exit Gates
- [x] Ask-first desktop experience is the default product interaction.
- [ ] Core operator workflows reach parity in the desktop product.
- [x] Decision packets, not raw JSON, are the default Ask output.
- [ ] Proof/history access works without manual tracking of opaque IDs/tokens.
- [ ] Org Browser supports org-wide selection and retrieve workflows in the desktop UX.
- [ ] Desktop shell is the required primary usage path; standalone dev-server access is secondary verification only.

## Dependencies
- Wave F exit gates passed
- `docs/planning/DESKTOP_UX_BLUEPRINT.md`
- `docs/planning/DESKTOP_RUNTIME_HARDENING_TODO.md`

## Evidence Required
- desktop workflow screenshots or walkthrough
- Ask parity smoke results
- org browser retrieve demonstration
- proof/history workflow demonstration

## Current Proof
- First Wave G slice landed on February 28, 2026 with blueprint-aligned desktop navigation, Ask as the default workspace, decision-packet rendering in the primary content area, and raw JSON moved behind the secondary inspector.
- Verified with `pnpm --filter web build`.
- Verified with `pnpm desktop:build`.

## Remaining Architecture Debt
- Docker is no longer an active product dependency.
- Remaining cleanup debt is primarily browser-era carryover in runtime ownership, request routing, verification, and UI structure.
- Use `docs/planning/DESKTOP_RUNTIME_HARDENING_TODO.md` as the concrete cleanup checklist while Wave G continues.
