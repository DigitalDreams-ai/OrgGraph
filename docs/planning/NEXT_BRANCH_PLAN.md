# Next Branch Plan

Date: February 28, 2026
Current branch: `dna-runtime-ownership`
Source checkpoint: `dna-foundation` merged by PR `#42`

## Recommended Branch
- `dna-runtime-ownership`

## Objective
Converge Orgumented's desktop runtime around one explicit model:
- Tauri owns lifecycle,
- the embedded UI talks directly to the local Nest engine for desktop flows,
- dev and packaged runtime behave the same way at the UI-to-engine boundary.

This branch is about runtime ownership and boundary convergence, not feature expansion.

## Why This Is Next

Current evidence shows the core engine and packaged desktop path are in materially better shape:
- packaged shell supervises the API:
  - `apps/desktop/src-tauri/src/lib.rs`
- packaged runtime is manifest-driven and release-smoke-verified:
  - `apps/desktop/src-tauri/runtime/manifest.json`
  - `scripts/desktop-release-smoke.ps1`
- packaged desktop already calls the Nest engine directly:
  - `apps/web/app/lib/runtime-mode.ts`
  - `apps/web/app/lib/ask-client.ts`
  - `apps/web/app/lib/org-client.ts`
  - `apps/web/app/lib/refresh-client.ts`
  - `apps/web/app/lib/secondary-client.ts`

The remaining high-value drift is in development/runtime composition:
- desktop dev still starts a standalone web server:
  - `apps/desktop/scripts/dev-runtime.mjs`
- verification convergence still needs to reduce dependence on browser-style helper assumptions around the standalone Next server itself

## Scope

### 1. Runtime boundary convergence
- Make desktop dev and packaged runtime use the same direct-engine boundary model.
- Stop treating Next route handlers as part of the desktop runtime contract.

### 2. Route adapter retirement
- Inventory remaining `apps/web/app/api/*` consumers.
- Remove route families only after each direct-engine path is proven in desktop dev and packaged smoke.

### 3. Shell-owned verification
- Make desktop-owned smoke the primary runtime proof.
- Reduce or remove browser-product assumptions from default validation paths.

### 4. Docs and operator clarity
- Update runbooks and operator docs to describe one desktop runtime story instead of separate dev/proxy/package stories.

## Non-Goals
- no new wave execution track
- no feature expansion unrelated to runtime ownership
- no storage re-platform
- no Docker fallback
- no browser-hosted product path

## Proposed Slice Order

### Slice 1: Boundary inventory and fencing
- Map each `apps/web/app/api/*` route to its current caller.
- Confirm which routes are only needed for non-desktop browser/dev convenience.
- Add a clear boundary table to planning docs before deleting adapters.

Acceptance:
- there is an explicit list of route families to delete, keep temporarily, or replace

#### Current route adapter inventory

Keep temporarily while dev direct mode is not the default:
- `org/*`
  - Current callers: `apps/web/app/lib/org-client.ts`
  - Current workspaces: `apps/web/app/workspaces/connect/*`, `apps/web/app/workspaces/browser/*`, `apps/web/app/workspaces/refresh/*`, `apps/web/app/workspaces/system/*`
  - Packaged desktop need: no
  - Desktop dev need: no
  - Current state on `dna-runtime-ownership`: deleted after direct-engine dev mode became the default

Deleted on `dna-runtime-ownership`:
- `ask/*`
  - Former callers: `apps/web/app/lib/ask-client.ts`
  - Current state: `ask-client.ts` now resolves directly to the Nest engine for desktop flows
  - Verification: `pnpm --filter web build` no longer emits `/api/ask`, `/api/ask/proof/[proofId]`, `/api/ask/proofs/recent`, `/api/ask/replay`, or `/api/ask/metrics`
- `perms/*`, `automation`, `impact`, `meta/*`
  - Former callers: `apps/web/app/lib/secondary-client.ts`
  - Current state: `secondary-client.ts` now resolves directly to the Nest engine for desktop flows
  - Verification: `pnpm --filter web build` no longer emits `/api/perms`, `/api/automation`, `/api/impact`, `/api/meta/context`, or `/api/meta/adapt`
- `refresh/*`
  - Former callers: `apps/web/app/lib/refresh-client.ts`
  - Current state: `refresh-client.ts` now resolves directly to the Nest engine for desktop flows
  - Verification: `pnpm --filter web build` no longer emits `/api/refresh` or `/api/refresh/diff/[snapshotA]/[snapshotB]`
- `org/*`
  - Former callers: `apps/web/app/lib/org-client.ts`
  - Current state: `org-client.ts` now resolves directly to the Nest engine for desktop flows
  - Verification: `pnpm --filter web build` no longer emits any `/api/org/*` routes, and the app route surface is now only `/` plus `/_not-found`

Already outside the adapter problem:
- `apps/web/app/lib/status-client.ts`
  - Calls the Nest engine directly now for `/health` and `/ready`
  - No `apps/web/app/api/*` dependency remains for shell status checks

Current outcome:
- the `apps/web/app/api/` adapter tree is retired from the desktop runtime path
- `apps/web/app/lib/runtime-mode.ts` is now only a direct engine URL resolver

Deletion posture:
1. Make desktop dev default to direct-engine mode.
2. Prove Ask, Org, Refresh, and secondary analysis flows in `pnpm desktop:dev`.
3. Remove route families after their desktop dev callers no longer hit `/api/*`.
4. Retain adapters only if a non-desktop browser use case is intentionally reintroduced, which is not the current product direction.

### Slice 2: Direct-engine desktop dev default
- Make the desktop shell default to direct-engine clients in development, not only in packaged mode.
- Keep any required Next surface limited to UI asset serving, not operator API brokering.

Acceptance:
- `pnpm desktop:dev` exercises direct Ask, Org, Refresh, Analyze, and Proofs flows without relying on `apps/web/app/api/*`

### Slice 3: Route family removal
- Remove one adapter family at a time once its desktop direct path is proven.
- Start with the lowest-value families first.

Acceptance:
- route deletion happens with passing desktop smoke and no operator regression in affected workspaces

### Slice 4: Verification convergence
- Retire or sharply demote browser-first smoke checks from the default desktop branch path.
- Keep one release smoke and one narrower dev/runtime parity check.

Acceptance:
- CI and local docs describe desktop runtime smoke as the primary verification contract

## Verification Bar
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`
- targeted `pnpm desktop:dev` proof for any changed direct-engine flow

## Stop Conditions
- If replay parity regresses, stop and fix before more boundary deletion.
- If direct-engine dev flow breaks packaged parity, stop and restore convergence before more cleanup.
- If a slice requires expanding `apps/web/app/api/*`, stop and reassess branch scope.

## Success Definition
At the end of this branch, Orgumented should be easier to describe and verify:
- one desktop product runtime,
- one primary UI-to-engine boundary,
- fewer browser-era seams,
- no ambiguity about whether desktop behavior depends on Next proxy routes.
