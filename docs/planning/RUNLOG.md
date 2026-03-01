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

## Entry 23: Phase 5 System State Extraction

### Change
- Extracted System workspace state and action orchestration out of `apps/web/app/page.tsx`.
- Added `apps/web/app/workspaces/system/use-system-workspace.ts`.
- Moved the following into the System workspace hook:
  - `metaDryRun` state
  - meta-context action handler
  - meta-adapt action handler
  - org-status action handler for the System workspace

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed desktop boundary routes remained present after the System hook extraction

### Outcome
- `page.tsx` no longer owns System workspace state or System action handlers directly.
- The remaining page shell is now concentrated around local persistence, shared copy/error/raw-response state, `limitRaw`, and the generic secondary-query helper.
- The next narrow slice is extracting the remaining shared response and persistence shell orchestration or deciding that the shell is small enough to pivot back to runtime work.

## Entry 24: Phase 5 Response Inspector Extraction

### Change
- Extracted shared response presentation and copy/error handling out of `apps/web/app/page.tsx`.
- Added `apps/web/app/shell/use-response-inspector.ts`.
- Moved the following into the response inspector hook:
  - raw JSON response state
  - copy button state
  - shared error-text state
  - response presentation helper
  - copy-to-clipboard fallback logic
  - shared query error-message resolver

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed desktop boundary routes remained present after the response inspector extraction

3. Page-shell reduction proof
- Result: passed
- Proof:
  - `apps/web/app/page.tsx` line count dropped from `431` to `375`

### Outcome
- `page.tsx` no longer owns shared response presentation or copy/error mechanics directly.
- The remaining page shell is now concentrated around local persistence, `limitRaw`, the generic secondary-query helper, and tab composition.
- The next narrow slice is extracting the remaining local persistence shell orchestration or deciding that the shell is now small enough to pivot back to runtime work.

## Entry 25: Phase 5 Shell Preference Extraction

### Change
- Extracted local shell persistence out of `apps/web/app/page.tsx`.
- Added `apps/web/app/shell/use-shell-preferences.ts`.
- Moved the following into the shell-preferences hook:
  - initial tab restore
  - initial org alias restore
  - initial Ask query restore
  - ongoing tab persistence
  - ongoing alias persistence
  - ongoing Ask query persistence
- Kept shell status refresh as an `onHydrated` callback so startup behavior stayed unchanged.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - `Compiled successfully`
  - typed desktop boundary routes remained present after the shell-preferences extraction

3. Page-shell reduction proof
- Result: passed
- Proof:
  - `apps/web/app/page.tsx` line count dropped from `375` to `363`

### Outcome
- `page.tsx` no longer owns local tab/alias/Ask persistence mechanics directly.
- The page shell is now small enough that the next best step is runtime proof work, not more UI extraction.
- The next narrow slice is growing the packaged desktop smoke toward authenticated org-session attach/switch verification.

## Entry 26: Packaged Auth Proof and Config Snapshot

### Change
- Added packaged Salesforce config staging in `apps/desktop/scripts/prepare-packaged-runtime.mjs`.
- The packaged runtime now writes `apps/desktop/src-tauri/runtime/config.json` from non-secret Salesforce config found in:
  - `.env`
  - `.env.local`
  - build-shell overrides
- Updated `apps/desktop/src-tauri/src/lib.rs` so the bundled API child receives `ORGUMENTED_CONFIG_PATH` in packaged mode.
- Added `runtime/config.json` to `apps/desktop/src-tauri/tauri.conf.json` resource bundling.
- Hardened `scripts/desktop-release-smoke.ps1` so packaged smoke now:
  - captures alias inventory and session artifacts
  - verifies session attach when aliases exist
  - verifies alias switch when `ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH=1`
  - restores the original session alias or disconnected state before exit
  - tears down the bundled packaged `node.exe` child reliably on Windows
- Updated `.env.example` and `.env.sample` so the desktop org path explicitly includes `SF_INTEGRATION_ENABLED=true`.

### Verification
1. `pnpm desktop:build`
- Result: passed
- Proof:
  - `Built application at: ...\\apps\\desktop\\src-tauri\\target\\release\\orgumented-desktop.exe`
  - `Finished 2 bundles`

2. `$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH='1'; pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - `logs/desktop-release-smoke-result.json` recorded:
    - `sessionConnectStatus=verified`
    - `sessionSwitchStatus=verified`
    - `sessionRestoreStatus=restored-alias`
    - `sessionConnectAlias=shulman-dev2`
    - `sessionSwitchAlias=shulman`
  - `logs/desktop-release-smoke-org-status.json` recorded:
    - `integrationEnabled=true`
    - `session.activeAlias=shulman-dev2`
  - session artifacts were emitted for:
    - connect
    - switch
    - restore

3. `pnpm --filter api test`
- Result: passed
- Proof:
  - `org service test passed`
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- Packaged desktop auth behavior now matches the desktop operator model instead of silently falling back to `SF_INTEGRATION_ENABLED=false`.
- Packaged smoke now proves authenticated attach/switch/restore behavior from the bundled shell, not just health/readiness.
- The next narrow step is to trim unnecessary packaged API payload and reduce bundle/lock surface in `apps/desktop/src-tauri/runtime/api`.

## Entry 27: Packaged API Payload Trim and Cleanup Hardening

### Change
- Updated `apps/desktop/scripts/prepare-packaged-runtime.mjs` so packaged build staging now:
  - prunes build-only baggage from `apps/desktop/src-tauri/runtime/api`
  - removes root `src/`, `test/`, `apps/`, and tsconfig/Nest config files from the staged API payload
  - removes workspace-package source/test files from `node_modules/@orgumented/ontology`
  - removes build-only `deps/` and `src/` from `node_modules/better-sqlite3`
  - stops stale packaged `orgumented-desktop.exe` and bundled `node.exe` before rebuilding on Windows
- Updated `scripts/desktop-release-smoke.ps1` so packaged smoke cleanup now retries until the packaged desktop process tree is gone.

### Verification
1. `pnpm desktop:build`
- Result: passed
- Proof:
  - `Built application at: ...\\apps\\desktop\\src-tauri\\target\\release\\orgumented-desktop.exe`
  - `Finished 2 bundles`

2. staged runtime size check
- Result: passed
- Proof:
  - `apps/desktop/src-tauri/runtime/api` measured about `13.93 MB`
  - `apps/desktop/src-tauri/runtime/api/node_modules/better-sqlite3` measured about `1.67 MB`
  - staged `src/`, `test/`, and duplicate `apps/` directories were absent

3. `$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH='1'; pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - packaged smoke completed successfully after the cleanup hardening
  - release smoke artifacts were refreshed under `logs/desktop-release-smoke-*.json`

4. `pnpm --filter api test`
- Result: passed
- Proof:
  - `validation passed`
  - `org service test passed`
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- The packaged API runtime is materially smaller and carries less build-time baggage into release bundles.
- Repeated packaged builds no longer require manual cleanup of stale bundled Windows processes to avoid native-module lock failures.
- The next narrow decision is whether to keep the trimmed deployed API tree or replace it with a standalone bundled API artifact.

## Entry 28: Manifest-Driven Packaged Runtime Entry

### Change
- Updated `apps/desktop/src-tauri/src/lib.rs` so packaged launch now reads `runtime/manifest.json`.
- The packaged shell now resolves:
  - `nodeBinary`
  - `apiEntry`
  - `configEntry`
  from the staged manifest instead of hardcoding `runtime/api/dist/main.js`.
- Hardened `apps/desktop/scripts/prepare-packaged-runtime.mjs` further so the Windows build preflight uses the same `pwsh -File` execution model as the working release smoke cleanup.

### Verification
1. `pnpm desktop:build`
- Result: passed
- Proof:
  - `Built application at: ...\\apps\\desktop\\src-tauri\\target\\release\\orgumented-desktop.exe`
  - `Finished 2 bundles`

2. `$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH='1'; pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - packaged shell reached ready state through the manifest-driven runtime path
  - release smoke completed successfully after the manifest launch change

### Outcome
- The packaged desktop shell now has an explicit runtime contract for launch entrypoints instead of a Rust-side hardcoded API path.
- The next narrow step remains evaluating whether the packaged API should move from a trimmed deployed tree to a standalone bundled artifact.

## Entry 29: Standalone Packaged API Bundle

### Change
- Updated `apps/desktop/scripts/prepare-packaged-runtime.mjs` so packaged build now:
  - bundles `apps/api/dist/main.js` into `apps/desktop/src-tauri/runtime/api/main.cjs` using `esbuild`
  - keeps only the native `better-sqlite3` runtime dependency set in `apps/desktop/src-tauri/runtime/api/node_modules`
  - points `runtime/manifest.json` at `api/main.cjs` instead of a deployed `dist/main.js`
- Added `esbuild` to `apps/desktop/package.json` dev dependencies for the packaged API bundle step.

### Verification
1. `pnpm desktop:build`
- Result: passed
- Proof:
  - `src-tauri\\runtime\\api\\main.cjs  4.5mb`
  - `Built application at: ...\\apps\\desktop\\src-tauri\\target\\release\\orgumented-desktop.exe`
  - `Finished 2 bundles`

2. staged runtime size check
- Result: passed
- Proof:
  - `apps/desktop/src-tauri/runtime/api` measured about `7.33 MB`
  - `apps/desktop/src-tauri/runtime/api/main.cjs` measured about `4.50 MB`
  - `apps/desktop/src-tauri/runtime/api/node_modules` measured about `2.82 MB`
  - remaining native runtime packages were limited to:
    - `better-sqlite3`
    - `bindings`
    - `file-uri-to-path`

3. `$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH='1'; pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - `logs/desktop-release-smoke-result.json` recorded:
    - `status=passed`
    - `sessionConnectStatus=verified`
    - `sessionSwitchStatus=verified`
    - `sessionRestoreStatus=restored-alias`

4. `pnpm --filter api test`
- Result: passed
- Proof:
  - `validation passed`
  - `org service test passed`
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- The packaged shell now launches a single bundled API entry instead of a deployed `dist/` tree.
- The packaged runtime is materially smaller and simpler while preserving the current deterministic proof and desktop auth behavior.
- The next step is to decide whether any more runtime packaging churn is justified, or whether the higher-value work has shifted back to core product behavior.

## Entry 30: Remove Packaged API Root Metadata

### Change
- Updated `apps/desktop/scripts/prepare-packaged-runtime.mjs` so packaged staging now removes `apps/desktop/src-tauri/runtime/api/package.json`.
- The packaged API root is now reduced to:
  - `main.cjs`
  - native runtime dependencies under `node_modules/`

### Verification
1. `pnpm desktop:build`
- Result: passed
- Proof:
  - `src-tauri\\runtime\\api\\main.cjs  4.5mb`
  - `Built application at: ...\\apps\\desktop\\src-tauri\\target\\release\\orgumented-desktop.exe`
  - `Finished 2 bundles`

2. `Get-ChildItem apps/desktop/src-tauri/runtime/api -Force`
- Result: passed
- Proof:
  - staged packaged API root contained only:
    - `main.cjs`
    - `node_modules`

3. `$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH='1'; pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - packaged smoke succeeded with the reduced API root
  - the transient `EADDRINUSE` seen on the first rerun did not reproduce on the clean verification rerun

4. `pnpm --filter api test`
- Result: passed
- Proof:
  - `integration passed`
  - `phase12 replay runtime test passed`
  - `phase13 meaning gates test passed`

### Outcome
- The packaged API payload is now down to the actual bundled runtime artifact plus native dependencies.
- Further packaged-runtime pruning should now be treated as optional, not a standing architectural requirement.

## Entry 31: Harden Packaged Smoke Port Cleanup

### Change
- Updated `scripts/desktop-release-smoke.ps1` so packaged smoke now:
  - kills any leftover packaged desktop/runtime processes as before
  - also kills any process still listening on port `3100`
  - waits for port `3100` to be free before launching the packaged shell
- This hardens the packaged verification harness against the transient `EADDRINUSE` condition that appeared during repeated smoke runs.

### Verification
1. `$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH='1'; pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - `status=passed`
  - `sessionConnectStatus=verified`
  - `sessionSwitchStatus=verified`
  - `sessionRestoreStatus=restored-alias`

2. second consecutive `$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH='1'; pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - `status=passed`
  - `readyStatus=ready`
  - deterministic `askProofId=proof_dd7bcb4c6e249d0ebae058a6`
  - no repeated `EADDRINUSE` failure on the immediate rerun

### Outcome
- The packaged smoke harness is now more deterministic under repeated local verification on Windows.
- Further Phase 4 work should be justified by architectural need, not by cleanup gaps in the current packaged proof path.

## Entry 32: Assert Deterministic Ask in Packaged Smoke

### Change
- Updated `scripts/desktop-release-smoke.ps1` so packaged smoke now:
  - sends the same `/ask` request twice to the packaged desktop runtime
  - writes the repeated response to `logs/desktop-release-smoke-ask-repeat.json`
  - fails if `proofId` or `replayToken` differ between the two responses
- The packaged smoke result now also records `askReplayToken`.

### Verification
1. `$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH='1'; pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - `status=passed`
  - `askProofId=proof_dd7bcb4c6e249d0ebae058a6`
  - `askReplayToken=trace_f64fd67605f1ed56028f0e73`
  - `logs/desktop-release-smoke-ask-repeat.json` was written alongside the original ask artifact

### Outcome
- The packaged desktop proof path now checks the core deterministic Ask contract directly, not just service availability.
- This is a better use of Phase 4 verification than further payload-only pruning unless a new runtime risk appears.

## Entry 33: Assert Packaged Replay Parity

### Change
- Updated `scripts/desktop-release-smoke.ps1` so packaged smoke now:
  - calls `POST /ask/replay` using the replay token from the packaged Ask response
  - writes replay output to `logs/desktop-release-smoke-replay.json`
  - fails if replay does not preserve:
    - `matched=true`
    - `corePayloadMatched=true`
    - `metricsMatched=true`
- The packaged smoke result now records the replay parity flags directly.

### Verification
1. `$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH='1'; pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - `status=passed`
  - `replayMatched=true`
  - `replayCorePayloadMatched=true`
  - `replayMetricsMatched=true`
  - `logs/desktop-release-smoke-replay.json` was written alongside the Ask artifacts

### Outcome
- The packaged desktop proof path now exercises both determinism and replay parity, not just service readiness.
- Additional Phase 4 work should now be driven by real runtime gaps rather than by missing proof coverage.

## Entry 34: Assert Packaged Proof Provenance Lookup

### Change
- Updated `scripts/desktop-release-smoke.ps1` so packaged smoke now:
  - fetches `GET /ask/proof/:proofId` for the packaged Ask proof
  - fetches `GET /ask/proofs/recent?limit=10`
  - fails if proof lookup or recent-proof history do not agree with the packaged Ask identifiers
- The packaged smoke result now records:
  - `proofLookupMatched`
  - `recentProofsMatched`

### Verification
1. `$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH='1'; pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - `status=passed`
  - `proofLookupMatched=true`
  - `recentProofsMatched=true`
  - `logs/desktop-release-smoke-proof.json` and `logs/desktop-release-smoke-recent-proofs.json` were written

### Outcome
- The packaged desktop proof path now covers provenance lookup in addition to determinism and replay parity.
- Phase 4 verification now exercises the core Ask proof chain end-to-end inside the packaged runtime.

## Entry 35: Extract Shared Secondary Query Shell State

### Change
- Added `apps/web/app/shell/use-secondary-query-runner.ts`.
- Moved the remaining shared secondary-query shell state out of `apps/web/app/page.tsx`:
  - `loading`
  - `limitRaw`
  - the generic secondary request dispatcher
- `page.tsx` now composes the extracted shell runner rather than owning that state directly.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - Next build completed successfully after the shell-runner extraction
  - `apps/web/app/page.tsx` measured about `341` lines after the slice

### Outcome
- Phase 4 packaged runtime hardening is strong enough that the branch focus has shifted back to Phase 5 UI boundary cleanup.
- The remaining page shell is smaller and more composition-focused than before this slice.

## Entry 36: Extract Ask Cross-Workspace Shell Actions

### Change
- Added `apps/web/app/workspaces/ask/use-ask-shell-actions.ts`.
- Moved Ask cross-workspace shell orchestration out of `apps/web/app/page.tsx`, including:
  - Ask run and elaboration dispatch
  - Connect handoff
  - Browser and Refresh navigation
  - Analyze navigation for automation and permissions
  - Proofs handoff and history-save routing

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - Next build completed successfully after the Ask shell-action extraction
  - `apps/web/app/page.tsx` measured about `342` lines after the slice

### Outcome
- More of the remaining page shell is now composition wiring rather than inline cross-workspace logic.
- The next Phase 5 slices should keep targeting the remaining page-level orchestration hotspots rather than revisiting packaging work.

## Entry 37: Extract Workspace Navigation Shell

### Change
- Added `apps/web/app/shell/workspace-nav.tsx`.
- Moved the inline workspace navigation and launch-rule panel out of `apps/web/app/page.tsx`.
- Removed the dead `ASK_PRESETS` constant from `page.tsx`.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - Next build completed successfully after the workspace-nav extraction
  - `apps/web/app/page.tsx` measured about `305` lines after the slice

### Outcome
- The page shell is now substantially smaller and more composition-focused.
- Remaining Phase 5 work should focus only on the last page-level orchestration hotspots that still matter architecturally.

## Entry 38: Productize Proofs and History Workspace

### Change
- Expanded `apps/web/app/workspaces/proofs/` into a product-facing proof workflow surface instead of a thin transport form.
- Added `apps/web/app/workspaces/proofs/types.ts` for structured desktop UI models covering:
  - recent proof history
  - selected proof artifact details
  - replay parity state
  - metrics export summaries
- Updated `apps/web/app/workspaces/proofs/use-proofs-workspace.ts` so proof, replay, recent-history, and metrics actions now parse structured proof views instead of only presenting raw payloads.
- Updated `apps/web/app/workspaces/proofs/proofs-workspace.tsx` so the desktop UI now surfaces:
  - recent proof selection
  - deterministic proof artifact details
  - replay parity badges
  - metrics summaries by snapshot and provider
- Wired the new proof workspace state through `apps/web/app/page.tsx` and added workspace styling in `apps/web/app/globals.css`.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - Next build completed successfully after the proof workspace productization
  - the typed Ask route family remained intact:
    - `/api/ask`
    - `/api/ask/proof/[proofId]`
    - `/api/ask/proofs/recent`
    - `/api/ask/replay`
    - `/api/ask/metrics`

### Outcome
- `Proofs & History` is now aligned more closely with Orgumented’s actual DNA:
  - deterministic proof inspection
  - replay parity verification
  - trust-history review
- The next higher-value product slice is improving `Org Sessions` and retrieval handoff rather than doing more low-value page-shell cleanup.

## Entry 39: Productize Org Sessions Workspace

### Change
- Expanded `apps/web/app/workspaces/connect/` from a thin command surface into a structured desktop operator workflow.
- Updated `apps/web/app/workspaces/connect/use-connect-workspace.ts` so session actions now:
  - keep local session state in sync after connect, switch, and disconnect
  - support a full overview refresh across:
    - tool status
    - session status
    - alias inventory
    - preflight
  - expose selected alias details, readiness state, and preflight issues as structured workspace state
- Updated `apps/web/app/workspaces/connect/connect-workspace.tsx` so the desktop UI now surfaces:
  - current desktop auth state
  - toolchain readiness
  - selected-alias readiness
  - alias inventory with direct select, inspect, connect, and switch actions
  - preflight blockers and remediation
- Added workspace styling in `apps/web/app/globals.css`.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - Next build completed successfully after the Org Sessions productization
  - typed org route family remained intact:
    - `/api/org/status`
    - `/api/org/session`
    - `/api/org/session/aliases`
    - `/api/org/session/connect`
    - `/api/org/session/switch`
    - `/api/org/preflight`

3. `pnpm desktop:build`
- Result: passed
- Proof:
  - `Built application at: ...\\apps\\desktop\\src-tauri\\target\\release\\orgumented-desktop.exe`
  - `Finished 2 bundles`

### Outcome
- `Org Sessions` now matches the desktop operator model better:
  - alias attach, switch, and readiness are visible as workflow state, not just raw payloads
  - the next higher-value product gap is retrieval handoff after alias selection

## Entry 40: Productize Retrieval Handoff

### Change
- Expanded `apps/web/app/workspaces/browser/` so `Org Browser` now surfaces:
  - active and selected alias context
  - cart summary
  - structured selected-retrieve results
- Expanded `apps/web/app/workspaces/refresh/` so `Refresh & Build` now surfaces:
  - latest refresh summary
  - latest drift diff summary
  - latest org-retrieve pipeline summary
- Updated `apps/web/app/page.tsx` so retrieval-related workspace transitions carry session context into Browser and Refresh.

### Verification
1. `pnpm --filter web typecheck`
- Result: passed

2. `pnpm --filter web build`
- Result: passed
- Proof:
  - Next build completed successfully after the retrieval handoff productization
  - typed org and refresh routes remained intact:
    - `/api/org/metadata/catalog`
    - `/api/org/metadata/members`
    - `/api/org/metadata/retrieve`
    - `/api/org/retrieve`
    - `/api/refresh`
    - `/api/refresh/diff/[snapshotA]/[snapshotB]`

3. `pnpm desktop:build`
- Result: passed
- Proof:
  - `Built application at: ...\\apps\\desktop\\src-tauri\\target\\release\\orgumented-desktop.exe`
  - `Finished 2 bundles`

### Outcome
- The desktop operator flow now stays structured after alias attach:
  - retrieve context remains visible
  - selected metadata and retrieve results are no longer hidden in raw payloads
  - refresh and diff results now read like product workflow state instead of transport output

## Entry 41: Default Desktop Dev to Direct Engine Mode

### Change
- Updated `apps/desktop/scripts/dev-runtime.mjs` so the desktop-managed web runtime now injects:
  - `NEXT_PUBLIC_DESKTOP_DIRECT_API_MODE=1`
  - `NEXT_PUBLIC_API_BASE=http://127.0.0.1:3100`
- The desktop launcher now emits that direct-mode configuration in its startup log.
- Updated `apps/web/app/lib/runtime-mode.ts` so the explicit direct-engine flag is authoritative instead of relying only on Tauri protocol detection.
- Updated `docs/runbooks/DESKTOP_DEV_RUNTIME.md` with the new dev proof and operator rule.

### Verification
1. `pnpm --filter web build`
- Result: passed

2. `pwsh -NoProfile -File .\\logs\\dna-runtime-ownership-desktop-dev-smoke.ps1`
- Result: passed
- Proof:
  - `logs/dna-runtime-ownership-desktop-dev.stdout.log` captured:
    - `[desktop-runtime] preparing desktop-managed api on 127.0.0.1:3100 and starting web on 127.0.0.1:3001 (mode=production, directApiMode=1, apiBase=http://127.0.0.1:3100)`
  - the same smoke reached `http://127.0.0.1:3100/ready`

### Outcome
- Desktop development now defaults to the same direct-engine boundary model that packaged desktop already uses.
- Ask, Org, Refresh, and secondary analysis flows no longer need the Next adapter tree as part of the normal desktop dev contract.
- The remaining adapter routes are now candidates for deliberate removal rather than required runtime infrastructure.

## Entry 42: Remove Secondary Analysis Route Adapters

### Change
- Updated `apps/web/app/lib/secondary-client.ts` so secondary analysis and meta flows now resolve directly to the local Nest engine with no `/api/*` fallback.
- Deleted the corresponding Next adapter routes:
  - `apps/web/app/api/perms/route.ts`
  - `apps/web/app/api/perms/diagnose/route.ts`
  - `apps/web/app/api/perms/system/route.ts`
  - `apps/web/app/api/automation/route.ts`
  - `apps/web/app/api/impact/route.ts`
  - `apps/web/app/api/meta/context/route.ts`
  - `apps/web/app/api/meta/adapt/route.ts`

### Verification
1. `pnpm --filter web build`
- Result: passed
- Proof:
  - Next build completed successfully after the adapter deletions
  - app output no longer emits:
    - `/api/perms`
    - `/api/perms/diagnose`
    - `/api/perms/system`
    - `/api/automation`
    - `/api/impact`
    - `/api/meta/context`
    - `/api/meta/adapt`

### Outcome
- The first non-essential adapter family is gone from the desktop runtime.
- Analyze and System secondary queries now match the same direct-engine boundary model already used by packaged desktop.
- The remaining adapter deletion work is now concentrated in Ask, Org, and Refresh.

## Entry 43: Remove Refresh Route Adapters

### Change
- Updated `apps/web/app/lib/refresh-client.ts` so refresh and diff flows now resolve directly to the local Nest engine with no `/api/*` fallback.
- Deleted the corresponding Next adapter routes:
  - `apps/web/app/api/refresh/route.ts`
  - `apps/web/app/api/refresh/diff/[snapshotA]/[snapshotB]/route.ts`

### Verification
1. `pnpm --filter web build`
- Result: passed
- Proof:
  - Next build completed successfully after the refresh adapter deletions
  - app output no longer emits:
    - `/api/refresh`
    - `/api/refresh/diff/[snapshotA]/[snapshotB]`

### Outcome
- Refresh now matches the direct-engine desktop boundary in both dev and packaged flows.
- The remaining adapter deletion work is narrowed to Ask and Org.

## Entry 44: Remove Ask Route Adapters

### Change
- Updated `apps/web/app/lib/ask-client.ts` so Ask, replay, proof lookup, recent proofs, and metrics export now resolve directly to the local Nest engine with no `/api/*` fallback.
- Deleted the corresponding Next adapter routes:
  - `apps/web/app/api/ask/route.ts`
  - `apps/web/app/api/ask/proof/[proofId]/route.ts`
  - `apps/web/app/api/ask/proofs/recent/route.ts`
  - `apps/web/app/api/ask/replay/route.ts`
  - `apps/web/app/api/ask/metrics/route.ts`

### Verification
1. `pnpm --filter web build`
- Result: passed
- Proof:
  - Next build completed successfully after the Ask adapter deletions
  - app output no longer emits:
    - `/api/ask`
    - `/api/ask/proof/[proofId]`
    - `/api/ask/proofs/recent`
    - `/api/ask/replay`
    - `/api/ask/metrics`

### Outcome
- Ask and Proofs now match the direct-engine desktop boundary in both dev and packaged flows.
- The remaining adapter deletion work is narrowed to Org only.

## Entry 45: Remove Org Route Adapters

### Change
- Updated `apps/web/app/lib/org-client.ts` so org status, session, preflight, retrieve, and metadata flows now resolve directly to the local Nest engine with no `/api/*` fallback.
- Deleted the remaining Next adapter routes:
  - `apps/web/app/api/org/status/route.ts`
  - `apps/web/app/api/org/preflight/route.ts`
  - `apps/web/app/api/org/session/route.ts`
  - `apps/web/app/api/org/session/aliases/route.ts`
  - `apps/web/app/api/org/session/connect/route.ts`
  - `apps/web/app/api/org/session/switch/route.ts`
  - `apps/web/app/api/org/session/disconnect/route.ts`
  - `apps/web/app/api/org/retrieve/route.ts`
  - `apps/web/app/api/org/metadata/catalog/route.ts`
  - `apps/web/app/api/org/metadata/members/route.ts`
  - `apps/web/app/api/org/metadata/retrieve/route.ts`
- Deleted `apps/web/app/api/_lib/upstream.ts` because no route adapters remain.
- Simplified `apps/web/app/lib/runtime-mode.ts` to a direct engine URL resolver only.

### Verification
1. `pnpm --filter web build`
- Result: passed
- Proof:
  - Next build completed successfully after the Org adapter deletions
  - app output now emits only:
    - `/`
    - `/_not-found`

### Outcome
- The Next adapter tree is retired from the desktop runtime path.
- Desktop UI transport is now consistently direct to the local Nest engine across Ask, Org, Refresh, Analyze, and Proofs.
- The next runtime-ownership work should focus on verification convergence and possibly eliminating the remaining standalone Next server dependence, not more adapter cleanup.

## Entry 46: Verify Adapter-Free Desktop Runtime

### Change
- No new code change in this entry.
- Purpose: verify the full desktop runtime after retiring the entire `apps/web/app/api/` adapter tree.

### Verification
1. `pnpm --filter api test`
- Result: passed

2. `pnpm desktop:build`
- Result: passed
- Proof:
  - `Built application at: ...\\apps\\desktop\\src-tauri\\target\\release\\orgumented-desktop.exe`
  - `Finished 2 bundles`

3. `pnpm desktop:smoke:release`
- Result: passed
- Proof:
  - `healthStatus=ok`
  - `readyStatus=ready`
  - `proofLookupMatched=true`
  - `recentProofsMatched=true`
  - `replayMatched=true`
  - `sessionConnectStatus=verified`

### Outcome
- The desktop runtime still passes packaged verification after full adapter retirement.
- The direct-engine boundary is now proven across build, packaged launch, Ask proof/replay, and org session attach flows.

## Entry 47: Retire Browser Smoke Script Residue

### Change
- Removed the obsolete package scripts:
  - `test:web-smoke`
  - `test:ui-smoke`
- Deleted the old browser-smoke files:
  - `scripts/web-smoke.sh`
  - `scripts/ui-smoke-playwright.sh`
  - `scripts/webui-functional-test.js`
- Updated runbooks and planning docs so desktop smoke is the canonical verification path.
- Updated `packages/project-memory-mcp/src/orgumented-profile.ts` so the operator-surface seed references packaged desktop smoke instead of the deleted UI smoke script.

### Verification
1. `rg -n "test:web-smoke|test:ui-smoke|web-smoke\\.sh|ui-smoke-playwright\\.sh|webui-functional-test\\.js|npm run test:web-smoke|npm run test:ui-smoke" .`
- Result: passed
- Proof:
  - no live references remained after the cleanup

2. `pnpm --filter @orgumented/project-memory-mcp test`
- Result: passed

### Outcome
- Browser-era smoke scripts are removed from the repo.
- Desktop packaged smoke is now the unambiguous verification contract in both code and operator docs.
