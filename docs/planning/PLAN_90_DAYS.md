# Orgumented 90-Day Plan

Date: February 28, 2026
Branch: `dna-foundation`
Decision basis: `docs/planning/DECISION_REPORT.md`
Selected strategy: `B) Module-Level Rebuild`

## Objective
Harden Orgumented around its real product DNA:
- deterministic answers,
- proof and replay integrity,
- fail-closed policy enforcement,
- clean desktop-native boundaries,
- Windows packaging and operator reliability.

## Guiding Rules
- No Docker in runtime, release, or operator workflow.
- Preserve proven engine logic where it already satisfies the constitution.
- Rebuild only the modules that are structurally wrong.
- Stop immediately if replay parity regresses.

## Phase 1: Contract Hardening

Status: completed on February 28, 2026

### Scope
- Fix any core output-contract violations where identical inputs can still emit different result identities.
- Add deterministic ask regression tests for:
  - repeated identical ask calls,
  - stable proof identity,
  - stable replay token,
  - replay parity after repeated execution.

### Target files
- `apps/api/src/modules/ask/ask.service.ts`
- `apps/api/src/modules/ask/ask-proof-store.service.ts`
- `apps/api/test/phase12-replay-runtime.ts`
- `apps/api/test/integration.ts`

### Acceptance gates
- Same snapshot + query + policy returns the same:
  - `deterministicAnswer`
  - `proof.proofId`
  - `proof.replayToken`
  - `trustLevel`
- `/ask/replay` still matches.
- Existing replay and integration tests remain green.

Completion note:
- Implemented in `apps/api/src/modules/ask/ask.service.ts`.
- Verified in `apps/api/test/phase12-replay-runtime.ts` and `apps/api/test/integration.ts`.
- Full results are recorded in `docs/planning/RUNLOG.md`.

## Phase 2: Ask Boundary Cleanup

Status: in progress on February 28, 2026

### Scope
- Extract Ask workflow transport from the giant UI page.
- Remove generic command-style handling for Ask/proof/replay flows.
- Introduce a typed UI-to-engine boundary for the Ask workspace.

### Target files
- `apps/web/app/page.tsx`
- `apps/web/app/api/query/route.ts`
- new typed client/boundary files under `apps/web/`

### Acceptance gates
- Ask UI no longer constructs generic `QueryKind` commands for Ask/proof/replay.
- UI is presentation/workflow state only for the Ask slice.
- Engine-side policy and proof logic remain exclusively in Nest.
- Determinism/replay tests are unchanged or stronger.

Progress note:
- Slice 1 completed:
  - dedicated Ask/proof/replay/metrics routes
  - dedicated Ask client boundary
  - generic `/api/query` no longer owns Ask transport
- Slice 2 completed:
  - Ask workspace rendering and Ask-specific state moved out of `apps/web/app/page.tsx`
- Slice 3 completed:
  - Proofs/History workspace rendering and proof-history state moved out of `apps/web/app/page.tsx`
- Slice 4 completed:
  - Connect workspace rendering moved out of `apps/web/app/page.tsx`
- Slice 5 completed:
  - Analyze workspace rendering moved out of `apps/web/app/page.tsx`
- Next narrow step:
  - reassess whether the next highest-value move is:
    - another page-level workspace extraction,
    - or a pivot to Phase 3 org-session boundary cleanup now that Ask, Proofs, Connect, and Analyze are isolated

## Phase 3: Org Session Boundary Cleanup

Status: in progress on February 28, 2026

### Scope
- Apply the same boundary cleanup to org-session and metadata retrieval flows.
- Isolate session/retrieve request contracts from the monolithic page.

### Target files
- `apps/web/app/page.tsx`
- `apps/web/app/api/query/route.ts`
- `apps/api/src/modules/org/*`

### Acceptance gates
- No generic command multiplexer required for org session and metadata flows.
- Session attach/switch/retrieve behavior remains Windows-safe.
- Existing org tests remain green.

Progress note:
- Slice 1 completed:
  - dedicated org boundary routes now own status, session, aliases, connect, switch, disconnect, and preflight
  - Connect and top-bar org actions no longer use the generic `/api/query` multiplexer
  - `page.tsx` still owns org-session state and typed org transport orchestration for now
- Slice 2 completed:
  - dedicated org boundary routes now own `orgRetrieve` and metadata catalog/member/retrieve
  - Org Browser and Org Retrieve actions no longer use the generic `/api/query` multiplexer
- Next narrow step:
  - complete a typed Refresh boundary for the semantic rebuild path
  - then pivot into Phase 4 runtime ownership hardening

## Phase 4: Desktop Runtime Ownership

Status: in progress on February 28, 2026

### Scope
- Move runtime ownership closer to the Tauri shell.
- Reduce dependence on script-managed orchestration for normal desktop usage.

### Target files
- `apps/desktop/src-tauri/*`
- `apps/desktop/scripts/dev-runtime.mjs`
- `apps/web/app/lib/status-client.ts`

### Acceptance gates
- Desktop shell owns lifecycle expectations clearly.
- Packaged desktop flow can start required local services or clearly supervise them.
- Windows desktop validation remains green.

Progress note:
- Slice 1 completed:
  - in desktop dev, Tauri now owns the API child process lifecycle
  - `apps/desktop/scripts/dev-runtime.mjs` now prepares the API build and starts only the web runtime
  - desktop dev proof showed the Tauri-launched API child reaching `/ready` with HTTP `200`
- Slice 2 completed:
  - `pnpm desktop:build` now stages a packaged runtime at `apps/desktop/src-tauri/runtime/`
  - the packaged runtime bundles:
    - static web entry assets
    - deployed API runtime
    - bundled Node runtime
  - packaged-shell clients now talk directly to the local Nest engine for Ask, Org, Refresh, and secondary analysis/meta flows
  - packaged release smoke showed `orgumented-desktop.exe` starting the bundled API runtime and `/ready` returning HTTP `200`
- Slice 3 completed:
  - the generic `/api/query` adapter is removed
  - typed route families now own permissions, automation, impact, and meta transport in dev
  - packaged and dev desktop paths now use the same explicit capability routing model
- Slice 4 completed:
  - browser-style `/api/health` and `/api/ready` proxy routes are removed
  - the desktop status strip now calls the local Nest engine directly for health and readiness
- Slice 5 completed:
  - added `pnpm desktop:smoke:release`
  - packaged smoke now proves:
    - shell launch
    - bundled API readiness
    - deterministic Ask proof generation
    - live org status retrieval
- Slice 6 completed:
  - packaged build now stages `runtime/config.json` from non-secret Salesforce config in `.env` and build-shell overrides
  - bundled Tauri shell now passes `ORGUMENTED_CONFIG_PATH` to the packaged API child
  - packaged smoke with `ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH=1` now proves:
    - authenticated session attach
    - alias switch
    - original session restoration before shutdown
  - packaged smoke cleanup now reliably tears down the bundled `node.exe` child on Windows
- Slice 7 completed:
  - packaged build now prunes build-only API baggage from `apps/desktop/src-tauri/runtime/api`
  - staged packaged API payload dropped from about `24.09 MB` to about `13.93 MB`
  - packaged `better-sqlite3` payload dropped from about `11.32 MB` to about `1.67 MB`
  - packaged build preflight now stops stale packaged desktop processes before staging on Windows
  - release smoke cleanup now loops until packaged `orgumented-desktop.exe` and bundled `node.exe` are gone
- Slice 8 completed:
  - packaged shell launch now reads `runtime/manifest.json` for `nodeBinary`, `apiEntry`, and `configEntry`
  - the packaged runtime no longer depends on a Rust-side hardcoded `runtime/api/dist/main.js` assumption
  - packaged build and release smoke both passed after the manifest-driven launch change
- Slice 9 completed:
  - packaged API build now emits `runtime/api/main.cjs` from `apps/api/dist/main.js`
  - packaged runtime keeps only the native `better-sqlite3` dependency set under `runtime/api/node_modules`
  - staged packaged API footprint dropped again from about `13.93 MB` to about `7.33 MB`
  - packaged build, packaged release smoke, and the full API suite all remained green after the bundle swap
- Slice 10 completed:
  - packaged API staging no longer keeps `runtime/api/package.json`
  - the packaged API root now contains only `main.cjs` plus native runtime dependencies
  - packaged build, packaged release smoke, and the full API suite remained green after that removal
- Slice 11 completed:
  - `scripts/desktop-release-smoke.ps1` now kills any leftover listener on port `3100` before launch and waits for the port to release
  - two consecutive packaged smoke runs passed with attach, switch, and restore verification enabled
- Slice 12 completed:
  - packaged smoke now issues the same `/ask` request twice and asserts stable `proofId` plus `replayToken`
  - deterministic packaged Ask proof passed with:
    - `proofId=proof_dd7bcb4c6e249d0ebae058a6`
    - `replayToken=trace_f64fd67605f1ed56028f0e73`
- Slice 13 completed:
  - packaged smoke now replays the packaged Ask proof through `/ask/replay`
  - replay verification passed with:
    - `matched=true`
    - `corePayloadMatched=true`
    - `metricsMatched=true`
- Slice 14 completed:
  - packaged smoke now verifies proof artifact lookup and recent-proof history through:
    - `GET /ask/proof/:proofId`
    - `GET /ask/proofs/recent?limit=10`
  - provenance verification passed with:
    - `proofLookupMatched=true`
    - `recentProofsMatched=true`
- Slice 15 completed:
  - remaining shared secondary-query shell state moved out of `apps/web/app/page.tsx` into `apps/web/app/shell/use-secondary-query-runner.ts`
  - `page.tsx` no longer owns:
    - `loading`
    - `limitRaw`
    - the generic secondary request dispatcher
  - `page.tsx` is now about `341` lines after web verification
- Slice 16 completed:
  - Ask cross-workspace shell actions moved out of `apps/web/app/page.tsx` into `apps/web/app/workspaces/ask/use-ask-shell-actions.ts`
  - page-level Ask wiring no longer owns inline handlers for:
    - Connect
    - Browser
    - Refresh
    - Analyze
    - Proofs handoff
- Slice 17 completed:
  - workspace navigation and the launch-rule panel moved out of `apps/web/app/page.tsx` into `apps/web/app/shell/workspace-nav.tsx`
  - `page.tsx` is now about `305` lines after web verification
- Next narrow step:
  - shift from low-value page-shell trimming into higher-value operator productization
  - use the reduced shell to improve desktop-native workflows where proof, replay, session, and retrieval behavior are still too raw

## Phase 5: Modular UI Reconstruction

Status: in progress on February 28, 2026

### Scope
- Break `apps/web/app/page.tsx` into workspace modules.
- Preserve the Ask-first product model while removing monolithic UI concentration.

### Acceptance gates
- No single top-level workspace file exceeds a reasonable module boundary.
- Workspace state and rendering are separated from engine transport logic.
- Ask, Org Sessions, and Proofs/History remain functional in desktop runtime.

Progress note:
- Slice 1 completed:
  - `Org Browser` rendering moved out of `apps/web/app/page.tsx`
  - browser types now live under `apps/web/app/workspaces/browser/`
- Slice 2 completed:
  - `Settings & Diagnostics` rendering moved out of `apps/web/app/page.tsx`
  - system rendering now lives under `apps/web/app/workspaces/system/`
- Slice 3 completed:
  - Browser metadata search, selection, member loading, and retrieve state/actions moved out of `apps/web/app/page.tsx`
  - Browser orchestration now lives in `apps/web/app/workspaces/browser/use-browser-workspace.ts`
- Slice 4 completed:
  - `Refresh & Build` rendering moved out of `apps/web/app/page.tsx`
  - refresh/diff and org-retrieve workflow state/actions now live in `apps/web/app/workspaces/refresh/`
- Slice 5 completed:
  - org session/status/preflight/alias lifecycle state/actions moved out of `apps/web/app/page.tsx`
  - Connect orchestration now lives in `apps/web/app/workspaces/connect/use-connect-workspace.ts`
- Slice 6 completed:
  - shell health/ready state and refresh action moved out of `apps/web/app/page.tsx`
  - top bar and status strip rendering now live under `apps/web/app/shell/`
- Slice 7 completed:
  - operator rail rendering moved out of `apps/web/app/page.tsx`
  - operator rail now lives in `apps/web/app/shell/operator-rail.tsx`
- Slice 8 completed:
  - Analyze state and action handlers moved out of `apps/web/app/page.tsx`
  - Analyze orchestration now lives in `apps/web/app/workspaces/analyze/use-analyze-workspace.ts`
- Slice 9 completed:
  - System state and action handlers moved out of `apps/web/app/page.tsx`
  - System orchestration now lives in `apps/web/app/workspaces/system/use-system-workspace.ts`
- Slice 10 completed:
  - shared response presentation, copy state, and error presentation moved out of `apps/web/app/page.tsx`
  - response inspector orchestration now lives in `apps/web/app/shell/use-response-inspector.ts`
- Slice 11 completed:
  - local tab/alias/ask persistence moved out of `apps/web/app/page.tsx`
  - shell preference hydration/persistence now lives in `apps/web/app/shell/use-shell-preferences.ts`
- Slice 12 completed:
  - `Proofs & History` now surfaces structured recent-proof history, selected proof artifacts, replay parity badges, and metrics summaries
  - operators can reuse recent proofs directly instead of treating proof and replay identifiers as a raw copy/paste workflow
- Slice 13 completed:
  - `Org Sessions` now behaves more like a desktop operator workflow than a thin transport form
  - overview refresh now re-syncs session, aliases, toolchain health, and preflight in one pass
  - alias inventory now supports direct select, inspect, connect, and switch actions
  - selected alias readiness and remediation now surface directly in the desktop UI
- Slice 14 completed:
  - retrieval handoff between `Org Sessions`, `Org Browser`, and `Refresh & Build` is now structured in the desktop UI
  - `Org Browser` now surfaces active alias context, cart summary, and last selected-retrieve result
  - `Refresh & Build` now surfaces the latest refresh summary, drift diff summary, and org-retrieve pipeline summary
- Next narrow step:
  - either keep productizing remaining desktop workspaces with the same discipline
  - or pause implementation and review the accumulated DNA branch progress on PR `#42`

## Active Follow-On Branch: Desktop Runtime Convergence

Status: active

Current branch:
- `dna-runtime-ownership`

### Scope
- converge dev and packaged desktop runtime boundaries
- remove remaining desktop dependence on Next route adapters
- reduce dependence on a standalone Next server for normal desktop verification
- move shell verification fully toward desktop-owned smoke and release checks

### Evidence for prioritization
- packaged runtime already calls the local Nest engine directly:
  - `apps/desktop/src-tauri/src/lib.rs`
  - `apps/web/app/lib/runtime-mode.ts`
- dev runtime still starts a standalone web server:
  - `apps/desktop/scripts/dev-runtime.mjs`
- browser-era smoke scripts are retired, but the standalone Next server is still part of the dev runtime composition

### Acceptance gates
- `pnpm desktop:dev` succeeds without requiring Next route adapters for desktop flows.
- Desktop dev and packaged runtime hit the same explicit engine boundary for Ask, Org, Refresh, Analyze, and Proofs.
- The desktop verification path no longer depends on browser-product assumptions.
- `pnpm --filter api test`, `pnpm --filter web build`, `pnpm desktop:build`, and `pnpm desktop:smoke:release` all pass.

### First slices
1. Inventory and fence the remaining consumers of `apps/web/app/api/*`.
2. Make desktop direct-engine mode the default for shell-owned flows in development.
3. Remove one route family at a time from `apps/web/app/api/*` once the direct boundary is proven.
4. Update CI and operator docs so desktop smoke is the primary runtime contract.

Progress note:
- Slice 1 is complete:
  - route adapter inventory is now explicit in `docs/planning/NEXT_BRANCH_PLAN.md`
- Slice 2 has started:
  - `apps/desktop/scripts/dev-runtime.mjs` now injects explicit desktop direct-engine env vars into desktop-managed web build/startup
  - `apps/web/app/lib/runtime-mode.ts` now honors the explicit direct-engine flag in dev
  - current proof on March 1, 2026:
    - `logs/dna-runtime-ownership-desktop-dev.stdout.log` captured:
      - `[desktop-runtime] preparing desktop-managed api on 127.0.0.1:3100 and starting web on 127.0.0.1:3001 (mode=production, directApiMode=1, apiBase=http://127.0.0.1:3100)`
    - `pnpm desktop:dev` smoke reached `http://127.0.0.1:3100/ready`

## Determinism and Replay Harness Plan

### Existing harness to preserve
- `apps/api/test/phase12-replay-runtime.ts`
- `apps/api/test/integration.ts`
- `apps/api/test/semantic-runtime.ts`
- `apps/api/test/planner.ts`

### Harness upgrades
1. Add repeated identical ask assertions.
2. Add stable proof identity assertions.
3. Add stable replay-token assertions.
4. Add "same request twice after no-op refresh" assertions.
5. Add boundary tests that ensure UI transport changes do not alter engine outputs.

### Test commands per contract change
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`

## Boundary Cleanup Plan

### Current state
- UI owns command dispatch and payload shaping.
- Next route families are now typed by capability, and health/readiness now hit the local engine directly, but some page-shell orchestration still reflects browser-era assumptions.
- Tauri dev lifecycle depends on external runtime orchestration.

### Cleanup order
1. Stabilize the core ask output contract.
2. Remove generic Ask command routing from the UI.
3. Remove generic org-session command routing from the UI.
4. Remove generic analysis/meta command routing from the UI.
5. Move runtime ownership closer to the shell.
6. Break monolithic UI into workspace modules.

## Packaging and Release Checkpoints

### Checkpoint A
- `pnpm --filter api test`
- output contract green

### Checkpoint B
- `pnpm --filter web build`
- Ask boundary cleanup compiles

### Checkpoint C
- `pnpm desktop:build`
- Windows packaging still succeeds

### Checkpoint D
- desktop runtime proof on Windows:
  - shell starts,
  - engine reachable,
  - Ask works,
  - proof/replay works

### Checkpoint E
- packaged release proof on Windows:
  - `pnpm desktop:build` stages the bundled runtime successfully
  - `target/release/orgumented-desktop.exe` launches the bundled API runtime
  - local `/ready` returns `200`
  - at least one packaged-shell workflow succeeds without Next route handlers

## Milestones

### Day 0-14
- Complete Phase 1 contract hardening.
- Status: done

### Day 15-35
- Complete Ask boundary cleanup.

### Day 36-60
- Complete Org Session boundary cleanup.

### Day 61-90
- Complete runtime ownership hardening and modular UI extraction.

## Kill-Switches
1. If repeated identical asks still produce divergent proof identity after Phase 1, stop and fix before any UI work.
2. If replay parity fails at any point, stop and fix before continuing.
3. If a boundary cleanup requires engine logic to move into the UI, stop and redesign the boundary instead.
4. If Windows packaging regresses for two consecutive attempts, stop feature work and stabilize desktop runtime ownership first.

## Current Next Step
- Continue from the reduced shell into higher-value product/runtime slices.
- Preferred next step: review the accumulated DNA branch product/runtime gains on PR `#42`, then decide whether more workspace productization is justified before deeper runtime changes.
- Preserve the current typed Ask route boundary and keep replay/proof logic in Nest.
- Record each slice in `docs/planning/RUNLOG.md` and stop immediately if replay parity regresses.
