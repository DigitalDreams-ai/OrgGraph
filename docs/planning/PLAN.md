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
- `apps/web/app/api/query/route.ts`
- `apps/web/app/api/health/route.ts`
- `apps/web/app/api/ready/route.ts`

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
- Tauri is currently a thin shell. `apps/desktop/src-tauri/src/lib.rs` only builds the default app and runs the generated context.
- Runtime ownership is pushed into `apps/desktop/scripts/dev-runtime.mjs`, which starts the API and the embedded web server before Tauri dev launch.
- `apps/desktop/src-tauri/tauri.conf.json` still binds the shell to a local web URL in dev (`devUrl`) and a built Next output in package mode (`frontendDist`).

### Next.js UI layer
- `apps/web/app/page.tsx` is the main desktop UI surface and currently mixes:
  - presentation,
  - workflow state,
  - endpoint selection,
  - payload construction,
  - request dispatch.
- `apps/web/app/api/query/route.ts` is a generic command multiplexer that maps UI "kind" values to many Nest endpoints.
- Health and readiness proxy routes exist separately in `apps/web/app/api/health/route.ts` and `apps/web/app/api/ready/route.ts`.

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

2. `apps/web/app/api/query/route.ts`
- The route is a browser-era adapter layer that translates UI-specific request kinds into many engine endpoints.
- It acts as a shadow application service boundary outside the engine.

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
- The generic `/api/query` route keeps browser-era command multiplexing alive.
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
3. Whether proof identity should be stable for repeated identical asks or remain event-identity-based.
   - Current implementation suggests a contract violation here.
4. Whether proof and metrics stores should deduplicate stable proof identities or preserve repeated events separately.
5. Whether Postgres parity should remain in the engine now or be postponed until the desktop boundary is clean.
