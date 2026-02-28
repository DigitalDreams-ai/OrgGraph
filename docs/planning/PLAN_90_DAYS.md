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

## Phase 3: Org Session Boundary Cleanup

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

## Phase 4: Desktop Runtime Ownership

### Scope
- Move runtime ownership closer to the Tauri shell.
- Reduce dependence on script-managed orchestration for normal desktop usage.

### Target files
- `apps/desktop/src-tauri/*`
- `apps/desktop/scripts/dev-runtime.mjs`
- `apps/web/app/api/health/route.ts`
- `apps/web/app/api/ready/route.ts`

### Acceptance gates
- Desktop shell owns lifecycle expectations clearly.
- Packaged desktop flow can start required local services or clearly supervise them.
- Windows desktop validation remains green.

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
- Next route owns a large engine command translation layer.
- Tauri dev lifecycle depends on external runtime orchestration.

### Cleanup order
1. Stabilize the core ask output contract.
2. Remove generic Ask command routing from the UI.
3. Remove generic org-session command routing from the UI.
4. Move runtime ownership closer to the shell.
5. Break monolithic UI into workspace modules.

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
- Proceed to Phase 2 Ask boundary cleanup only after reviewing:
  - `docs/planning/PLAN.md`
  - `docs/planning/DECISION_REPORT.md`
  - `docs/planning/RISK_REGISTER.md`
  - `docs/planning/RUNLOG.md`
