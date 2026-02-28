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
