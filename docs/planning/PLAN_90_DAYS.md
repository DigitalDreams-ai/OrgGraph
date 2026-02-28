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
- Next narrow step:
  - continue shrinking remaining page-shell orchestration in Browser and System
  - then decide whether packaged smoke should include authenticated org-session attach/switch checks

## Phase 5: Modular UI Reconstruction

### Scope
- Break `apps/web/app/page.tsx` into workspace modules.
- Preserve the Ask-first product model while removing monolithic UI concentration.

### Acceptance gates
- No single top-level workspace file exceeds a reasonable module boundary.
- Workspace state and rendering are separated from engine transport logic.
- Ask, Org Sessions, and Proofs/History remain functional in desktop runtime.

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
- Continue Phase 4 runtime ownership hardening from the Tauri shell.
- Preferred next step: reduce the remaining Browser and System page-shell orchestration now that packaged smoke covers shell launch, readiness, Ask proof, and org status.
- Preserve the current typed Ask route boundary and keep replay/proof logic in Nest.
- Record each slice in `docs/planning/RUNLOG.md` and stop immediately if replay parity regresses.
