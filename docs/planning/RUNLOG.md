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
