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
