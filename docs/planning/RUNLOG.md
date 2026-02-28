# Orgumented DNA Run Log

Date: February 28, 2026
Branch: `dna-foundation`

## Entry 1: Phase 1 Contract Hardening

### Change
- Stabilized `ask` proof identity so repeated identical requests use deterministic inputs only.
- Preserved replay behavior while removing wall-clock time from `proofId` generation in `apps/api/src/modules/ask/ask.service.ts`.
- Added repeated-identical-ask assertions in:
  - `apps/api/test/phase12-replay-runtime.ts`
  - `apps/api/test/integration.ts`

### Verification
1. `pnpm --filter api test:phase12-replay`
- Result: passed
- Proof: `phase12 replay runtime test passed`

2. `pnpm --filter api exec ts-node --transpile-only test/integration.ts`
- Result: passed
- Proof: `integration passed`

3. `pnpm --filter api test`
- Result: passed
- Proof:
  - `validation passed`
  - `runtime paths test passed`
  - `planner test passed`
  - `semantic runtime test passed`
  - `integration passed`
  - `backend parity test passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`
  - `postgres failure-path test passed`

4. `pnpm --filter api typecheck`
- Result: passed

5. `pnpm --filter api build`
- Result: passed

### Outcome
- Repeated identical `ask` requests now preserve:
  - `deterministicAnswer`
  - `proof.proofId`
  - `proof.replayToken`
  - `trustLevel`
  - `policy.policyId`
- Replay parity remained green after the change.

## Entry 2: Phase 2 Ask Boundary Slice 1

### Change
- Extracted Ask transport from the generic browser-style multiplexer into dedicated typed routes:
  - `apps/web/app/api/ask/route.ts`
  - `apps/web/app/api/ask/proof/[proofId]/route.ts`
  - `apps/web/app/api/ask/proofs/recent/route.ts`
  - `apps/web/app/api/ask/replay/route.ts`
  - `apps/web/app/api/ask/metrics/route.ts`
- Added a dedicated Ask client boundary in `apps/web/app/lib/ask-client.ts`.
- Updated `apps/web/app/page.tsx` so Ask, proof lookup, replay, and metrics export no longer go through `POST /api/query`.
- Narrowed `apps/web/app/api/query/route.ts` so the generic multiplexer no longer owns Ask/proof/replay transport.
- Separated the persistent Ask decision packet state from generic raw response state, so:
  - proof/replay/metrics actions do not overwrite the Ask packet,
  - elaboration no longer replaces the main Ask result.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - dedicated routes were emitted for:
    - `/api/ask`
    - `/api/ask/proof/[proofId]`
    - `/api/ask/proofs/recent`
    - `/api/ask/replay`
    - `/api/ask/metrics`

3. `pnpm --filter api test`
- Result: passed
- Proof:
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- The Ask workspace now uses a typed route boundary instead of the generic `/api/query` multiplexer.
- The generic query route is narrower and no longer acts as the transport seam for Ask/proof/replay.
- The Ask decision packet remains stable in the UI while secondary proof/history actions run.

## Entry 3: Phase 2 Ask Boundary Slice 2

### Change
- Extracted the Ask workspace UI and Ask-specific state out of `apps/web/app/page.tsx` into:
  - `apps/web/app/workspaces/ask/ask-workspace.tsx`
  - `apps/web/app/workspaces/ask/use-ask-workspace.ts`
  - `apps/web/app/workspaces/ask/types.ts`
- Kept Ask request execution and Ask decision-packet state inside the Ask workspace boundary instead of the page shell.
- Preserved proof/replay field syncing so the latest Ask proof can still flow into the Proofs tab without manual re-entry.
- Left non-Ask workspaces in place so the slice stays limited to the Ask boundary only.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - dedicated Ask routes remained present in the app build output

3. `pnpm --filter api test`
- Result: passed
- Proof:
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- `page.tsx` no longer owns the Ask workspace rendering tree or the Ask request lifecycle.
- Ask is now a real module boundary in the UI layer rather than a large inline section inside the desktop shell page.
- The next cleanup target is the Proofs/History slice or the remaining generic page-level wiring around non-Ask workspaces.

## Entry 4: Phase 2 Proofs/History Workspace Extraction

### Change
- Extracted the Proofs/History workspace from `apps/web/app/page.tsx` into:
  - `apps/web/app/workspaces/proofs/proofs-workspace.tsx`
  - `apps/web/app/workspaces/proofs/use-proofs-workspace.ts`
- Moved proof lookup, replay, recent-proof listing, and metrics export state/actions behind a dedicated Proofs workspace hook.
- Kept the page shell responsible only for composition and tab switching.
- Preserved Ask-to-Proofs handoff by syncing the latest Ask `proofId` and `replayToken` into the Proofs workspace state.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - Ask route boundary remained intact in the app build output

3. `pnpm --filter api test`
- Result: passed
- Proof:
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- `page.tsx` no longer owns the Proofs/History workspace rendering or proof-history action lifecycle.
- Both Ask and Proofs are now isolated modules inside the embedded desktop UI layer.
- The next cleanup target is the remaining page-level coupling for Connect or Analyze.

## Entry 5: Phase 2 Connect Workspace Extraction

### Change
- Extracted the Connect workspace from `apps/web/app/page.tsx` into:
  - `apps/web/app/workspaces/connect/connect-workspace.tsx`
  - `apps/web/app/workspaces/connect/types.ts`
- Moved Org Session rendering, runtime command guidance, alias inventory, and operator actions behind a dedicated Connect workspace component.
- Kept the page shell responsible only for org-session state, transport dispatch, and tab composition so the slice stays presentation-only.
- Reused the existing `runQuery` org/session transport without widening scope into the org boundary cleanup phase.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed Ask routes and the narrowed query boundary remained present in the app build output

3. `pnpm --filter api test`
- Result: passed
- Proof:
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- `page.tsx` no longer owns the Connect workspace rendering tree or the Org Sessions action layout.
- Ask, Proofs, and Connect are now isolated UI modules inside the desktop shell page.
- The next cleanup target is Analyze, which still owns substantial page-level workflow state.

## Entry 6: Phase 2 Analyze Workspace Extraction

### Change
- Extracted the Analyze workspace from `apps/web/app/page.tsx` into:
  - `apps/web/app/workspaces/analyze/analyze-workspace.tsx`
- Moved Analyze sub-tab rendering, form controls, and action layout behind a dedicated Analyze workspace component.
- Kept the page shell responsible only for analysis form state and the existing `runQuery` transport calls so the slice stays presentation-only.
- Preserved the existing analysis payloads for permissions, automation, impact, and system permission checks without changing engine semantics.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - Ask routes, `/api/query`, and readiness routes remained present in the app build output

3. `pnpm --filter api test`
- Result: passed
- Proof:
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- `page.tsx` no longer owns the Analyze workspace rendering tree or action layout.
- Ask, Proofs, Connect, and Analyze are now isolated modules inside the desktop shell page.
- The next architectural decision is whether to keep shrinking `page.tsx` through Browser/Refresh extraction or pivot into Phase 3 org-session boundary cleanup.

## Entry 7: Phase 3 Org Session Boundary Slice 1

### Change
- Removed org-session traffic from the generic `/api/query` multiplexer for:
  - status
  - session
  - session aliases
  - session connect
  - session switch
  - session disconnect
  - preflight
- Added dedicated typed org boundary routes under `apps/web/app/api/org/` and a typed org client in `apps/web/app/lib/org-client.ts`.
- Updated `apps/web/app/page.tsx` so Connect and the top-bar org actions now use the typed org client rather than issuing generic query kinds.
- Left `orgRetrieve` and metadata flows on the existing query seam so the slice stays limited to org-session cleanup.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - dedicated org routes were emitted for:
    - `/api/org/status`
    - `/api/org/session`
    - `/api/org/session/aliases`
    - `/api/org/session/connect`
    - `/api/org/session/switch`
    - `/api/org/session/disconnect`
    - `/api/org/preflight`

3. `pnpm --filter api test`
- Result: passed
- Proof:
  - `org service test passed`
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- The browser-era multiplexer no longer owns Connect or top-bar org-session actions.
- Org-session boundary cleanup is now underway without widening into metadata/retrieve behavior yet.
- The next cleanup target is the remaining org retrieve and metadata flows that still use `/api/query`.

## Entry 8: Phase 3 Org Data Boundary Slice 2

### Change
- Removed `orgRetrieve` and metadata traffic from the generic `/api/query` multiplexer for:
  - `orgRetrieve`
  - metadata catalog
  - metadata members
  - metadata retrieve
- Added dedicated typed org boundary routes for:
  - `/api/org/retrieve`
  - `/api/org/metadata/catalog`
  - `/api/org/metadata/members`
  - `/api/org/metadata/retrieve`
- Expanded `apps/web/app/lib/org-client.ts` so the Org Browser and Org Retrieve surfaces use the same typed org boundary as Connect.
- Updated `apps/web/app/page.tsx` so Browser and Refresh org actions no longer dispatch generic query kinds for org data operations.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - dedicated org data routes were emitted for:
    - `/api/org/retrieve`
    - `/api/org/metadata/catalog`
    - `/api/org/metadata/members`
    - `/api/org/metadata/retrieve`

3. `pnpm --filter api test`
- Result: passed
- Proof:
  - `org service test passed`
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- The generic query multiplexer no longer owns the org operator surface.
- Phase 3 now covers org session, org retrieve, and metadata catalog/member/retrieve flows.
- The next architectural decision is whether to give Refresh its own typed boundary or pivot into desktop runtime ownership hardening.

## Entry 9: Typed Refresh Boundary Slice

### Change
- Removed `refresh` and `refreshDiff` traffic from the generic `/api/query` multiplexer.
- Added a dedicated typed refresh client in `apps/web/app/lib/refresh-client.ts`.
- Added dedicated refresh boundary routes for:
  - `/api/refresh`
  - `/api/refresh/diff/[snapshotA]/[snapshotB]`
- Updated `apps/web/app/page.tsx` so the Refresh workspace now uses the typed refresh boundary while leaving analysis/meta flows on the generic seam.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - dedicated refresh routes were emitted for:
    - `/api/refresh`
    - `/api/refresh/diff/[snapshotA]/[snapshotB]`

3. `pnpm --filter api test`
- Result: passed
- Proof:
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- The semantic rebuild path no longer depends on the generic query multiplexer.
- Ask, Org, and Refresh now all use typed boundary routes in the embedded desktop UI layer.
- The next highest-value move is Phase 4 runtime ownership hardening in Tauri.

## Entry 10: Phase 4 Runtime Ownership Slice 1

### Change
- Moved desktop dev API process ownership into the Tauri shell in `apps/desktop/src-tauri/src/lib.rs`.
- Updated `apps/desktop/scripts/dev-runtime.mjs` so it prepares the API build and starts only the web runtime instead of supervising both API and web.
- Kept the change intentionally narrow:
  - desktop dev API lifecycle is now shell-owned
  - packaged-runtime ownership beyond dev remains a follow-up slice

### Verification
1. `pnpm desktop:build`
- Result: passed
- Proof:
  - `Built application at: ...\\apps\\desktop\\src-tauri\\target\\release\\orgumented-desktop.exe`
  - `Finished 2 bundles`

2. `pnpm desktop:dev` smoke with log capture
- Result: passed
- Proof:
  - `logs/desktop-phase4-dev.log` captured:
    - `[desktop-runtime] preparing desktop-managed api on 127.0.0.1:3100 and starting web on 127.0.0.1:3001`
    - `Running target\\debug\\orgumented-desktop.exe`
    - `Nest application successfully started`
  - `http://127.0.0.1:3100/ready` returned `200` during the smoke

3. Existing contract regression suite
- Commands:
  - `pnpm --filter web typecheck`
  - `pnpm --filter web build`
  - `pnpm --filter api test`
- Result: passed

### Outcome
- Tauri now owns one concrete runtime responsibility instead of relying entirely on external script orchestration.
- The shell-managed API child proved reachable in desktop dev.
- The next runtime question is how packaged desktop ownership should work beyond dev.

## Entry 11: Phase 4 Packaged Runtime Ownership Slice 2

### Change
- Added packaged-runtime staging in `apps/desktop/scripts/prepare-packaged-runtime.mjs`.
- Updated `apps/desktop/src-tauri/tauri.conf.json` so `pnpm desktop:build` now:
  - stages a static web entry under `apps/desktop/src-tauri/runtime/web`
  - deploys the API runtime under `apps/desktop/src-tauri/runtime/api`
  - bundles a local Node runtime under `apps/desktop/src-tauri/runtime/node`
- Extended `apps/desktop/src-tauri/src/lib.rs` so packaged Tauri builds start the bundled API runtime instead of assuming an external service.
- Added desktop direct-mode clients under `apps/web/app/lib/` so the packaged shell calls the local Nest engine directly for:
  - Ask
  - Org
  - Refresh
  - remaining secondary analysis/meta requests
- Enabled explicit desktop-safe CORS in `apps/api/src/main.ts` for Tauri and local loopback origins.
- Kept the runtime manifest deterministic by recording Node version instead of a wall-clock timestamp.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter api test`
- Result: passed
- Proof:
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

3. `pnpm desktop:build`
- Result: passed
- Proof:
  - `Running beforeBuildCommand node ./scripts/prepare-packaged-runtime.mjs`
  - staged runtime present under `apps/desktop/src-tauri/runtime/`
  - `Finished 2 bundles`

4. packaged release smoke with log capture
- Result: passed
- Proof:
  - `logs/desktop-phase4-release.log` captured bundled Nest startup
  - `Nest application successfully started`
  - `http://127.0.0.1:3100/ready` returned `200`
  - `orgumented-desktop.exe` and bundled `node.exe` were both observed and then shut down cleanly

### Outcome
- Packaged desktop builds no longer depend on a live Next server or externally managed API runtime.
- The packaged shell now has a concrete local-runtime ownership story that matches the desktop product boundary better than the old browser-style adapter model.
- The next highest-value move is to reduce or remove the remaining dev-only Next adapter seam and then prove a real packaged Ask or org-session workflow.

## Entry 12: Phase 4 Typed Analysis and Meta Boundary Slice

### Change
- Removed the generic `apps/web/app/api/query/route.ts` multiplexer entirely.
- Added explicit typed Next route families for:
  - `apps/web/app/api/perms/route.ts`
  - `apps/web/app/api/perms/diagnose/route.ts`
  - `apps/web/app/api/perms/system/route.ts`
  - `apps/web/app/api/automation/route.ts`
  - `apps/web/app/api/impact/route.ts`
  - `apps/web/app/api/meta/context/route.ts`
  - `apps/web/app/api/meta/adapt/route.ts`
- Updated `apps/web/app/lib/secondary-client.ts` so both desktop-direct and dev-mode flows use explicit capability routes instead of a command multiplexer.

### Verification
1. `pnpm --filter api test`
- Result: passed
- Proof:
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

2. `pnpm --filter web typecheck`
- Result: passed

3. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - build output emitted:
    - `/api/perms`
    - `/api/perms/diagnose`
    - `/api/perms/system`
    - `/api/automation`
    - `/api/impact`
    - `/api/meta/context`
    - `/api/meta/adapt`
  - build output no longer emitted `/api/query`

### Outcome
- The browser-era generic query seam is gone from the desktop UI boundary.
- Dev and packaged desktop paths now share the same explicit capability routing model.
- The next architectural decision is whether health/readiness should stay as Next proxy routes or move into a shell-owned check path.

## Entry 13: Phase 4 Direct Health and Ready Boundary Slice

### Change
- Removed `apps/web/app/api/health/route.ts` and `apps/web/app/api/ready/route.ts`.
- Added `apps/web/app/lib/status-client.ts` so the desktop status strip now calls the local Nest engine directly for:
  - `/health`
  - `/ready`
- Updated UI fallback messaging to reference `/ready` instead of the deleted Next proxy route.

### Verification
1. `pnpm --filter api test`
- Result: passed
- Proof:
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - build output no longer emitted:
    - `/api/health`
    - `/api/ready`

3. `pnpm --filter web typecheck`
- Result: passed

### Outcome
- The desktop status strip now reflects the actual engine health path instead of the embedded web layer.
- The remaining browser-era carryover is no longer in status transport; it is mostly in page-shell orchestration and browser-first verification scripts.

## Entry 14: Packaged Desktop Smoke Harness

### Change
- Added `scripts/desktop-release-smoke.ps1`.
- Added `pnpm desktop:smoke:release` in `package.json`.
- The smoke harness now:
  - launches `apps/desktop/src-tauri/target/release/orgumented-desktop.exe`
  - waits for bundled API readiness
  - captures `/health`, `/ready`, `/ask`, and `/org/status` artifacts under `logs/`
  - validates Ask proof identity and replay token presence
  - shuts down packaged desktop processes cleanly

### Verification
1. `pnpm desktop:build`
- Result: passed
- Proof:
  - `Built application at: ...\\apps\\desktop\\src-tauri\\target\\release\\orgumented-desktop.exe`
  - `Finished 2 bundles`

2. `pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - `logs/desktop-release-smoke-result.json` recorded:
    - `healthStatus=ok`
    - `readyStatus=ready`
    - `askTrustLevel=refused`
    - `askProofId=proof_dd7bcb4c6e249d0ebae058a6`
  - `logs/desktop-release-smoke-ask.json` recorded proof and replay identifiers from the packaged shell runtime
  - `logs/desktop-release-smoke-org-status.json` recorded `session.status=connected` and `activeAlias=shulman-dev2`

### Outcome
- Packaged desktop verification is now a repeatable command instead of a manual terminal sequence.
- The release path can now prove deterministic Ask behavior and live org status from the packaged shell, not just `/ready`.
- The next highest-value cleanup is remaining page-shell orchestration in Browser and System.

## Entry 15: Phase 5 Browser Workspace Extraction

### Change
- Extracted `Org Browser` rendering out of `apps/web/app/page.tsx`.
- Added:
  - `apps/web/app/workspaces/browser/browser-workspace.tsx`
  - `apps/web/app/workspaces/browser/types.ts`
- Kept metadata retrieval logic in the page shell so the slice stays presentation-only and does not widen into a transport or engine change.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - route output remained unchanged for the typed desktop boundary surface

### Outcome
- `page.tsx` no longer owns the `Org Browser` render tree inline.
- The remaining large inline workspace in the page shell is `Settings & Diagnostics`, plus shared shell/orchestration state.
- The next narrow slice is extracting `Settings & Diagnostics` out of `apps/web/app/page.tsx`.

## Entry 16: Phase 5 System Workspace Extraction

### Change
- Extracted `Settings & Diagnostics` rendering out of `apps/web/app/page.tsx`.
- Added `apps/web/app/workspaces/system/system-workspace.tsx`.
- Kept meta-context, meta-adapt, and org-status request orchestration in the page shell so this stays a presentation-only slice.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed boundary route output remained unchanged after the workspace move

### Outcome
- `page.tsx` no longer owns the `Settings & Diagnostics` render tree inline.
- The page shell is now mostly shared shell state, workflow orchestration, and the operator rail.
- The next narrow slice is extracting Browser/System state or shared shell orchestration out of `apps/web/app/page.tsx`.

## Entry 17: Phase 5 Browser State Extraction

### Change
- Extracted `Org Browser` metadata state and actions out of `apps/web/app/page.tsx`.
- Added `apps/web/app/workspaces/browser/use-browser-workspace.ts`.
- Moved the following into the Browser workspace hook:
  - metadata search/filter state
  - type/member selection state
  - metadata catalog loading
  - metadata member loading
  - metadata retrieve execution
- Kept the slice narrow by reusing the existing typed org client and preserving the current Browser workspace presentation contract.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed org boundary routes remained present for:
    - `/api/org/metadata/catalog`
    - `/api/org/metadata/members`
    - `/api/org/metadata/retrieve`

### Outcome
- `page.tsx` no longer owns Browser metadata state or Browser action orchestration directly.
- The remaining page shell is increasingly limited to shared shell state and the System/operator rail.
- The next narrow slice is extracting the remaining System or shared shell orchestration out of `apps/web/app/page.tsx`.

## Entry 18: Phase 5 Refresh Workspace Extraction

### Change
- Extracted `Refresh & Build` rendering out of `apps/web/app/page.tsx`.
- Added:
  - `apps/web/app/workspaces/refresh/refresh-workspace.tsx`
  - `apps/web/app/workspaces/refresh/use-refresh-workspace.ts`
- Moved the following into the Refresh workspace hook:
  - refresh mode state
  - snapshot diff state
  - org-retrieve pipeline checkbox state
  - refresh execution
  - refresh diff execution
  - org retrieve execution from the Refresh workspace
- Removed the stale `orgRetrieve` path from the page-level org query dispatcher once Refresh owned that flow.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed refresh and org routes remained present for:
    - `/api/refresh`
    - `/api/refresh/diff/[snapshotA]/[snapshotB]`
    - `/api/org/retrieve`

3. Page-shell reduction proof
- Result: passed
- Proof:
  - `apps/web/app/page.tsx` line count dropped from `690` to `610`

### Outcome
- `page.tsx` no longer owns the `Refresh & Build` render tree or refresh/retrieve workflow state directly.
- The remaining page shell is now concentrated around shared shell state, top-bar/status actions, and the operator rail.
- The next narrow slice is extracting the remaining System or shared shell orchestration out of `apps/web/app/page.tsx`.

## Entry 19: Phase 5 Connect State Extraction

### Change
- Extracted org session and org-status orchestration out of `apps/web/app/page.tsx`.
- Added `apps/web/app/workspaces/connect/use-connect-workspace.ts`.
- Moved the following into the Connect workspace hook:
  - org alias state
  - session state
  - tool status state
  - preflight state
  - alias inventory state
  - alias inspect/connect/switch/disconnect actions
  - session and tool-status loading actions
- Updated the top bar, Connect workspace, System workspace, and operator rail to consume the shared Connect workspace hook instead of page-local org transport.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed org routes remained present for:
    - `/api/org/status`
    - `/api/org/session`
    - `/api/org/session/aliases`
    - `/api/org/session/connect`
    - `/api/org/session/switch`
    - `/api/org/session/disconnect`
    - `/api/org/preflight`

3. Page-shell reduction proof
- Result: passed
- Proof:
  - `apps/web/app/page.tsx` line count dropped from `610` to `533`

### Outcome
- `page.tsx` no longer owns org session/status/preflight/alias lifecycle state directly.
- Shared org-side desktop state now has a single UI hook boundary instead of being duplicated across top bar, Connect, System, and operator rail consumers.
- The next narrow slice is extracting the remaining System or shared shell orchestration out of `apps/web/app/page.tsx`.

## Entry 20: Phase 5 Shell Runtime Extraction

### Change
- Extracted shell runtime status orchestration out of `apps/web/app/page.tsx`.
- Added:
  - `apps/web/app/shell/use-shell-runtime.ts`
  - `apps/web/app/shell/shell-topbar.tsx`
  - `apps/web/app/shell/status-strip.tsx`
- Moved the following out of the page shell:
  - health status state
  - ready status state
  - ready details state
  - shell status refresh action
  - top-bar rendering
  - status-strip rendering
- Removed dead `responseData` state from `apps/web/app/page.tsx`.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed desktop boundary routes remained present after the shell extraction

3. Page-shell reduction proof
- Result: passed
- Proof:
  - `apps/web/app/page.tsx` line count dropped from `533` to `489`

### Outcome
- `page.tsx` no longer owns shell health/ready orchestration or the top-level status render tree.
- The remaining page shell is now concentrated around shared operator state, local persistence, and the operator rail.
- The next narrow slice is extracting the operator rail or remaining System/shared shell state out of `apps/web/app/page.tsx`.

## Entry 21: Phase 5 Operator Rail Extraction

### Change
- Extracted the operator rail render tree out of `apps/web/app/page.tsx`.
- Added `apps/web/app/shell/operator-rail.tsx`.
- Kept the slice deliberately structural:
  - copied/raw JSON state contract stayed unchanged
  - Ask/Connect/System data still flows through existing workspace hooks
  - only the rail presentation moved

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed desktop boundary routes remained present after the rail extraction

3. Page-shell reduction proof
- Result: passed
- Proof:
  - `apps/web/app/page.tsx` line count dropped from `489` to `458`

### Outcome
- `page.tsx` no longer owns the operator rail render tree inline.
- The remaining page shell is now mostly local persistence, a small amount of shared action state, and Analyze/System state not yet lifted into dedicated hooks.
- The next narrow slice is extracting the remaining System/shared shell orchestration or reassessing whether the page shell is now small enough to pivot back to deeper runtime work.

## Entry 22: Phase 5 Analyze State Extraction

### Change
- Extracted Analyze state and action orchestration out of `apps/web/app/page.tsx`.
- Added `apps/web/app/workspaces/analyze/use-analyze-workspace.ts`.
- Moved the following into the Analyze workspace hook:
  - analyze sub-mode state
  - user/object/field/system-permission inputs
  - strict/explain/debug toggles
  - permission, automation, impact, and system-permission action handlers
- Kept `limitRaw` in the page shell because the Proofs workspace still uses it for recent-proof listing.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed desktop boundary routes remained present after the Analyze hook extraction

3. Page-shell reduction proof
- Result: passed
- Proof:
  - `apps/web/app/page.tsx` line count dropped from `458` to `427`

### Outcome
- `page.tsx` no longer owns Analyze workflow state or Analyze action lambdas directly.
- The remaining page shell is now concentrated around local persistence, shared copy/error state, `limitRaw`, and the remaining System/shared shell orchestration.
- The next narrow slice is extracting the remaining System/shared shell state or deciding that the page shell is now small enough to pivot back to runtime and packaged-workflow proof work.
