# Orgumented Architecture Inspection Plan

Date: February 28, 2026
Branch: `dna-foundation`
Purpose: pause wave execution and inspect the runtime "DNA" before further structural work.

## What Was Inspected

### Desktop shell layer
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/src/main.rs`
- `apps/desktop/scripts/dev-runtime.mjs`

### Next.js UI layer
- `apps/web/app/page.tsx`
- `apps/web/app/layout.tsx`
- `apps/web/app/lib/status-client.ts`

### NestJS engine layer
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/config/app-config.service.ts`
- `apps/api/src/config/runtime-paths.service.ts`
- `apps/api/src/common/path.ts`
- `apps/api/src/modules/ask/ask.service.ts`
- `apps/api/src/modules/ask/ask-proof-store.service.ts`
- `apps/api/src/modules/ask/ask-metrics-store.service.ts`
- `apps/api/src/modules/planner/planner.service.ts`
- `apps/api/src/modules/queries/queries.service.ts`
- `apps/api/src/modules/analysis/analysis.service.ts`
- `apps/api/src/modules/graph/graph.service.ts`
- `apps/api/src/modules/graph/sqlite-graph.store.ts`
- `apps/api/src/modules/graph/postgres-graph.store.ts`
- `apps/api/src/modules/ingestion/ingestion.service.ts`
- `apps/api/src/modules/ingestion/ontology-constraints.service.ts`
- `apps/api/src/modules/ingestion/semantic-drift-policy.service.ts`
- `apps/api/src/modules/evidence/evidence-store.service.ts`
- `apps/api/src/modules/org/org.service.ts`
- `apps/api/src/modules/org/org-tool-adapter.service.ts`
- `apps/api/src/modules/org/command-runner.service.ts`
- `apps/api/src/modules/health/health.controller.ts`
- `apps/api/src/modules/ask/ask.controller.ts`
- `apps/api/src/modules/org/org.controller.ts`

### Ontology and determinism primitives
- `packages/ontology/src/index.ts`
- `packages/ontology/src/constraints.ts`
- `packages/ontology/src/semantic-runtime.ts`
- `packages/ontology/src/semantic-runtime-engine.ts`

### Current enforcement tests
- `apps/api/test/phase12-replay-runtime.ts`
- `apps/api/test/integration.ts`
- `apps/api/test/semantic-runtime.ts`
- `apps/api/test/planner.ts`
- `apps/api/test/validation.ts`
- `apps/api/test/runtime-paths.ts`

## Architecture Map

### Tauri shell layer
- Tauri started as a thin shell, but `apps/desktop/src-tauri/src/lib.rs` now owns API child-process lifecycle in dev and packaged release modes.
- Runtime ownership is pushed into `apps/desktop/scripts/dev-runtime.mjs`, which starts the API and the embedded web server before Tauri dev launch.
- `apps/desktop/src-tauri/tauri.conf.json` still binds the shell to a local web URL in dev (`devUrl`), but package mode now stages a static web bundle plus bundled API runtime under `apps/desktop/src-tauri/runtime/`.

### Next.js UI layer
- `apps/web/app/page.tsx` is the main desktop UI surface and currently mixes:
  - presentation,
  - workflow state,
  - endpoint selection,
  - payload construction,
  - request dispatch.
- Typed clients under `apps/web/app/lib/` now own Ask, Org, Refresh, permissions, automation, impact, and meta transport instead of a single browser-era command multiplexer.
- Health and readiness now resolve through `apps/web/app/lib/status-client.ts` and hit the local Nest engine directly.

### NestJS engine layer
- The engine is modular at the Nest module level:
  - ingestion,
  - graph,
  - evidence,
  - queries,
  - analysis,
  - ask,
  - org,
  - meta,
  - observability.
- Deterministic decision logic and proof/replay logic are concentrated in `apps/api/src/modules/ask/ask.service.ts`.
- Retrieval/auth/session logic is concentrated in `apps/api/src/modules/org/org.service.ts`.
- Graph/query storage remains local-first with SQLite default and Postgres optional parity support.

### Storage, proof, replay, and artifacts
- Runtime paths are centralized in `apps/api/src/config/runtime-paths.service.ts` and `apps/api/src/common/path.ts`.
- Local artifacts include:
  - graph DB,
  - evidence index,
  - refresh state/audit,
  - ontology report,
  - semantic snapshot history,
  - semantic diff artifacts,
  - ask proof store,
  - ask metrics store,
  - meta-context state and audit,
  - org session/audit files.

### Constraints and policies
- Ontology relation constraints are defined in `packages/ontology/src/constraints.ts`.
- Refresh-time constraint enforcement lives in `apps/api/src/modules/ingestion/ontology-constraints.service.ts`.
- Drift-budget policy and gating live in `apps/api/src/modules/ingestion/semantic-drift-policy.service.ts`.
- Ask trust thresholds, refusal logic, and policy IDs live in `apps/api/src/modules/ask/ask.service.ts` plus `apps/api/src/config/app-config.service.ts`.

## Suspected Boundary Violations

### UI ↔ engine boundary
1. `apps/web/app/page.tsx`
- The UI defines a large `QueryKind` union, builds request payloads for engine operations, and directly controls operational dispatch.
- This is not presentation-only behavior. It is an application command layer living in the UI.

2. `apps/web/app/page.tsx`
- Analysis, browser, and system surfaces still shape request payloads in the page shell even though their transport no longer depends on a generic multiplexer.
- The remaining UI boundary problem is page-level orchestration, not a query-route adapter.

3. `apps/desktop/scripts/dev-runtime.mjs`
- Runtime orchestration is still external to Tauri proper.
- The shell does not yet own service startup directly; dev runtime orchestration is script-managed.

## Where Determinism and Replay Are Enforced Today

### Enforced in the engine
- Planner normalization and stable graph-call ordering:
  - `apps/api/src/modules/planner/planner.service.ts`
- Deterministic graph payload ordering and snapshot hashing:
  - `apps/api/src/modules/ingestion/ingestion.service.ts`
- Constraint validation at refresh time:
  - `apps/api/src/modules/ingestion/ontology-constraints.service.ts`
- Ask trust envelope and fail-closed refusal:
  - `apps/api/src/modules/ask/ask.service.ts`
- Replay parity against stored proof core payload:
  - `apps/api/src/modules/ask/ask.service.ts`
- Deterministic SCU composition primitives:
  - `packages/ontology/src/semantic-runtime-engine.ts`

### Enforced in tests
- Replay parity and proof trace-level behavior:
  - `apps/api/test/phase12-replay-runtime.ts`
- End-to-end refresh, drift, ask, replay, metrics, and policy behavior:
  - `apps/api/test/integration.ts`
- Semantic composition invariants:
  - `apps/api/test/semantic-runtime.ts`
- Planner determinism and stable dispatch ordering:
  - `apps/api/test/planner.ts`

## Current Strengths
- The core semantic engine is not a greenfield problem. It already has:
  - deterministic planner structure,
  - replay checks,
  - proof persistence,
  - drift gates,
  - ontology constraints,
  - test coverage over many critical flows.
- Runtime paths are more explicit than earlier project stages.
- Org auth/session tooling is now local-first and Windows-aware.

## Current Weaknesses
- The desktop shell is still too thin.
- The UI boundary is not presentation-only.
- Very large files indicate concentrated complexity:
  - `apps/web/app/page.tsx`
  - `apps/api/src/modules/ask/ask.service.ts`
  - `apps/api/src/modules/org/org.service.ts`
  - `apps/api/src/modules/ingestion/ingestion.service.ts`

## Unknowns To Verify Next
1. Whether packaged Tauri should own engine startup natively or continue to rely on external script orchestration.
2. Whether the best desktop boundary is:
   - dedicated typed Next route adapters,
   - Tauri IPC,
   - or a thin typed local client over the Nest engine.
3. Whether proof and metrics stores should deduplicate stable proof identities or preserve repeated events separately.
   - Phase 1 stabilized proof identity. Store semantics are the remaining open follow-up.
4. Whether Postgres parity should remain in the engine now or be postponed until the desktop boundary is clean.

## Current Branch Direction

Current branch:
- `dna-runtime-ownership`

Reason:
- Packaged desktop already uses the local Nest engine directly and no longer depends on Next route handlers at release time.
- Development still depends on a standalone Next server plus the `apps/web/app/api/*` proxy surface.
- That dev/package split is now the highest-value remaining architectural drift.

Evidence:
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/scripts/dev-runtime.mjs`
- `apps/web/app/lib/runtime-mode.ts`
- `apps/web/app/api/_lib/upstream.ts`
- `apps/web/app/api/`
- `scripts/web-smoke.sh`
- `scripts/ui-smoke-playwright.sh`

Primary branch objective:
- make desktop dev and packaged desktop use the same explicit UI-to-engine boundary model

Slice 1 status:
- route adapter inventory is now explicit in `docs/planning/NEXT_BRANCH_PLAN.md`
- current finding: the remaining `apps/web/app/api/*` tree is still only a desktop-dev fallback for Ask, Org, Refresh, and secondary analysis/meta flows
- packaged desktop no longer needs those adapters for the main runtime path

Slice 2 status:
- desktop-managed dev runtime now forces direct-engine mode through explicit `NEXT_PUBLIC_DESKTOP_DIRECT_API_MODE=1` and `NEXT_PUBLIC_API_BASE=http://127.0.0.1:3100` wiring in `apps/desktop/scripts/dev-runtime.mjs`
- `apps/web/app/lib/runtime-mode.ts` now treats that explicit flag as authoritative instead of relying only on Tauri protocol detection
- result: normal `pnpm desktop:dev` startup no longer depends on the Next adapter tree for shell-owned Ask, Org, Refresh, and secondary analysis flows

Expected scope:
1. Default the desktop shell to direct Nest engine access in both dev and packaged flows.
2. Retire the Next route adapter tree from the desktop runtime path.
3. Reduce or eliminate the standalone Next server as a runtime dependency for normal desktop verification.
4. Replace remaining browser-first smoke assumptions with shell-owned desktop checks.

Non-goals:
- no new feature wave
- no storage re-platform
- no broad UI redesign
- no Docker fallback

## Review Update
- Phase 1 is now complete on `dna-foundation`.
- `apps/api/src/modules/ask/ask.service.ts` no longer salts `proofId` with wall-clock time for repeated identical asks.
- Phase 2 Ask boundary work is now in progress:
  - Ask transport is no longer owned by the generic `/api/query` multiplexer.
  - Ask rendering/state is no longer inlined entirely inside `apps/web/app/page.tsx`.
- Proofs/History is also no longer inlined entirely inside `apps/web/app/page.tsx`.
- Connect is also no longer inlined entirely inside `apps/web/app/page.tsx`.
- Analyze is also no longer inlined entirely inside `apps/web/app/page.tsx`.
- Phase 3 org-session boundary cleanup is now in progress:
  - Connect and top-bar org actions no longer rely on the generic `/api/query` multiplexer.
  - Dedicated typed org boundary routes now own:
    - status
    - session
    - session aliases
    - session connect
    - session switch
    - session disconnect
    - preflight
  - org retrieve
  - metadata catalog/members/retrieve
- Phase 3 now covers the full org operator surface:
  - org session
  - org retrieve
  - metadata catalog/members/retrieve
- Refresh now also has a dedicated typed boundary and no longer relies on the generic `/api/query` multiplexer.
- Phase 4 runtime ownership hardening is now in progress.
  - In desktop dev, the Tauri shell now owns the API child process lifecycle.
  - `apps/desktop/scripts/dev-runtime.mjs` now prepares the API build and starts only the web runtime.
- Phase 4 packaged-runtime ownership slice is now in progress:
  - `pnpm desktop:build` now stages a packaged runtime under `apps/desktop/src-tauri/runtime/`
  - the staged runtime includes:
    - static web entry assets
    - deployed API runtime
    - bundled Node runtime
  - packaged shell clients now call the local Nest engine directly instead of depending on Next route handlers inside the packaged app
  - Nest now enables explicit desktop-safe CORS for Tauri and local loopback origins
- Packaged release proof now exists:
  - `apps/desktop/src-tauri/target/release/orgumented-desktop.exe` started the bundled API runtime
  - `http://127.0.0.1:3100/ready` returned HTTP `200`
  - proof log: `logs/desktop-phase4-release.log`
- The generic `/api/query` adapter is now removed:
  - typed route families now own:
    - permissions
    - automation
    - impact
    - meta context/adapt
  - build output no longer emits `/api/query`
- Packaged-shell workflow proof now exists:
  - `pnpm desktop:smoke:release` launches the packaged shell and bundled API runtime
  - packaged smoke captured:
    - `healthStatus=ok`
    - `readyStatus=ready`
    - deterministic Ask proof ID `proof_dd7bcb4c6e249d0ebae058a6`
    - live org status with `session.status=connected` and `activeAlias=shulman-dev2`
  - proof artifacts live under `logs/desktop-release-smoke-*.json`
- Packaged auth/runtime proof now exists:
  - packaged runtime stages `runtime/config.json` from non-secret Salesforce config in `.env` and build-shell overrides
  - bundled Tauri shell now passes `ORGUMENTED_CONFIG_PATH` to the packaged API child
  - `pnpm desktop:smoke:release` with `ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH=1` captured:
    - `integrationEnabled=true`
    - `sessionConnectStatus=verified`
    - `sessionSwitchStatus=verified`
    - `sessionRestoreStatus=restored-alias`
  - proof artifacts now also include:
    - `logs/desktop-release-smoke-session-connect.json`
    - `logs/desktop-release-smoke-session-switch.json`
    - `logs/desktop-release-smoke-session-restore.json`
  - packaged smoke cleanup now tears down the bundled `node.exe` child correctly on Windows
- Packaged deterministic Ask proof now exists:
  - `scripts/desktop-release-smoke.ps1` issues the same `/ask` request twice against the packaged desktop runtime
  - the packaged smoke now fails if `proofId` or `replayToken` diverge across repeated identical requests
  - current packaged proof remained stable at:
    - `proofId=proof_dd7bcb4c6e249d0ebae058a6`
    - `replayToken=trace_f64fd67605f1ed56028f0e73`
- Packaged replay parity proof now exists:
  - `scripts/desktop-release-smoke.ps1` replays the packaged Ask proof through `/ask/replay`
  - the packaged smoke now fails if replay does not preserve:
    - `matched=true`
    - `corePayloadMatched=true`
    - `metricsMatched=true`
  - the current packaged replay proof matched the original Ask artifact on all three signals
- Packaged proof provenance lookup now exists:
  - `scripts/desktop-release-smoke.ps1` now fetches:
    - `GET /ask/proof/:proofId`
    - `GET /ask/proofs/recent?limit=10`
  - the packaged smoke now fails if the stored proof artifact or recent-proof list disagree with the packaged Ask proof identifiers
  - current packaged proof retrieval remained aligned with the live Ask artifact:
    - `proofLookupMatched=true`
    - `recentProofsMatched=true`
- Packaged API payload hardening now exists:
  - `apps/desktop/scripts/prepare-packaged-runtime.mjs` now prunes build-only baggage from `apps/desktop/src-tauri/runtime/api`
  - staged payload dropped from about `24.09 MB` to about `13.93 MB`
  - packaged `better-sqlite3` payload dropped from about `11.32 MB` to about `1.67 MB` by removing build-time `deps/` and `src/`
  - repeated packaged builds no longer depend on manual cleanup:
    - build preflight now stops stale packaged `orgumented-desktop.exe` and bundled `node.exe`
    - release smoke cleanup now loops until packaged processes are actually gone on Windows
- Packaged runtime entry is now explicit instead of shell-hardcoded:
  - `apps/desktop/src-tauri/src/lib.rs` now reads `runtime/manifest.json`
  - the packaged shell resolves `nodeBinary`, `apiEntry`, and `configEntry` from the manifest rather than assuming `runtime/api/dist/main.js`
  - packaged build and release smoke both stayed green after the manifest-driven launch change
- Packaged API bundle now exists:
  - `apps/desktop/scripts/prepare-packaged-runtime.mjs` now bundles `apps/api/dist/main.js` into `apps/desktop/src-tauri/runtime/api/main.cjs`
  - packaged runtime size dropped again:
    - `runtime/api` is now about `7.33 MB`
    - `runtime/api/main.cjs` is about `4.5 MB`
    - remaining `runtime/api/node_modules` is about `2.82 MB`
  - the packaged runtime keeps only the native `better-sqlite3` dependency set (`better-sqlite3`, `bindings`, `file-uri-to-path`)
  - packaged build, packaged release smoke, and the full API suite stayed green after switching away from the deployed `dist/` tree
  - `runtime/api/package.json` is no longer staged; the packaged API root now contains only `main.cjs` plus native runtime dependencies
  - `scripts/desktop-release-smoke.ps1` now kills any leftover listener on port `3100` before launch and waits for the port to be free, so repeated packaged smoke runs no longer depend on timing luck
- Phase 5 modular UI reconstruction is now moving again:
  - `Org Browser` rendering is no longer inlined inside `apps/web/app/page.tsx`
  - browser types and rendering now live under `apps/web/app/workspaces/browser/`
  - `Settings & Diagnostics` rendering is no longer inlined inside `apps/web/app/page.tsx`
  - system rendering now lives under `apps/web/app/workspaces/system/`
  - Browser metadata selection, member loading, and retrieve orchestration are no longer owned directly by `apps/web/app/page.tsx`
  - Browser state and actions now live under `apps/web/app/workspaces/browser/use-browser-workspace.ts`
  - `Refresh & Build` rendering and refresh/retrieve workflow state are no longer owned directly by `apps/web/app/page.tsx`
  - Refresh state and actions now live under `apps/web/app/workspaces/refresh/`
  - Org session alias, status, preflight, and session lifecycle state are no longer owned directly by `apps/web/app/page.tsx`
  - Connect state and actions now live under `apps/web/app/workspaces/connect/use-connect-workspace.ts`
  - Shell health/ready orchestration is no longer owned directly by `apps/web/app/page.tsx`
  - shell runtime state and top-level status rendering now live under `apps/web/app/shell/`
  - Operator rail rendering is no longer owned directly by `apps/web/app/page.tsx`
  - rail rendering now lives under `apps/web/app/shell/operator-rail.tsx`
  - Analyze state and action orchestration are no longer owned directly by `apps/web/app/page.tsx`
  - Analyze state and action handlers now live under `apps/web/app/workspaces/analyze/use-analyze-workspace.ts`
  - System workspace state and action orchestration are no longer owned directly by `apps/web/app/page.tsx`
  - System state and action handlers now live under `apps/web/app/workspaces/system/use-system-workspace.ts`
  - Shared response inspector state and copy/error handling are no longer owned directly by `apps/web/app/page.tsx`
  - response presentation and copy/error handling now live under `apps/web/app/shell/use-response-inspector.ts`
  - Local tab/alias/ask persistence is no longer owned directly by `apps/web/app/page.tsx`
  - shell preference hydration/persistence now lives under `apps/web/app/shell/use-shell-preferences.ts`
  - shared secondary-query shell state is no longer owned directly by `apps/web/app/page.tsx`
  - `loading`, `limitRaw`, and the generic secondary request dispatcher now live in `apps/web/app/shell/use-secondary-query-runner.ts`
  - Ask cross-workspace shell actions are no longer owned directly by `apps/web/app/page.tsx`
  - Ask-to-Connect/Analyze/Proofs navigation and action wiring now live in `apps/web/app/workspaces/ask/use-ask-shell-actions.ts`
  - workspace navigation and the launch-rule panel are no longer owned directly by `apps/web/app/page.tsx`
  - navigation rendering now lives in `apps/web/app/shell/workspace-nav.tsx`
  - `apps/web/app/page.tsx` is now down to about `305` lines, and most of what remains is workspace composition
- The next live architectural priority is back in the UI boundary layer:
  - packaged runtime hardening is complete enough for now because the packaged shell now proves:
    - deterministic Ask identity
    - replay parity
    - proof provenance lookup
    - live org attach/switch/restore
  - continue shrinking the remaining page-shell composition surface only where shared state or cross-workspace orchestration is still concentrated
  - avoid returning to packaging churn unless a new runtime gap or proof failure appears
- The first higher-value product slice beyond page-shell reduction is now complete:
  - `Proofs & History` surfaces structured recent-proof history
  - selected proof artifacts now show:
    - query
    - trust
    - policy
    - trace level
    - deterministic answer
    - citation and derivation counts
  - replay now shows parity badges for:
    - `matched`
    - `corePayloadMatched`
    - `metricsMatched`
  - metrics export now surfaces snapshot and provider summaries instead of relying on raw JSON inspection
- The next architectural priority should stay product/runtime focused:
  - improve `Org Sessions` and related retrieval workflows as operator-first desktop surfaces
  - do not return to low-value page-shell shaving unless a real boundary concentration reappears
- `Org Sessions` is now moving from a thin transport form toward an operator console:
  - overview refresh now re-syncs session, aliases, toolchain health, and preflight in one workflow
  - selected alias readiness and remediation now surface directly in the desktop UI
  - alias inventory now supports:
    - select
    - inspect
    - connect
    - switch
  - the next product/runtime gap is the retrieval handoff between `Org Sessions`, `Org Browser`, and `Refresh & Build`
- The retrieval handoff is now materially stronger:
  - `Org Browser` surfaces:
    - active alias context
    - cart summary
    - structured selected-retrieve results
  - `Refresh & Build` surfaces:
    - latest refresh summary
    - latest drift diff summary
    - latest org-retrieve pipeline summary
  - the next product question is whether the branch should keep productizing desktop workspaces or pause for review on PR `#42`
