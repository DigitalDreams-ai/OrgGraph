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
