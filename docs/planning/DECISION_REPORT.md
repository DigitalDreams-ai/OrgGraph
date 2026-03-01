# Orgumented Decision Report

Date: February 28, 2026
Branch: `dna-foundation`
Scoring authority: `docs/planning/ORGUMENTED_DECISION_MATRIX.md`

## Scoring Method
- Each section weight is applied to the average of that section's item scores.
- Weighted section total = `(section item average / 5) * section weight`.
- Maximum total = `100`.
- Contract Compliance average is calculated from items `1.1` through `1.4`.

Options:
- `A` = Targeted Refactor
- `B` = Module-Level Rebuild
- `C` = Full Rebuild

## Completed Matrix

| Item | A | B | C | Evidence / Numeric Justification |
|---|---:|---:|---:|---|
| 1.1 Determinism enforceability | 4 | 4 | 2 | Current engine already sorts payloads and hashes snapshots in `apps/api/src/modules/ingestion/ingestion.service.ts`, uses deterministic planner routing in `apps/api/src/modules/planner/planner.service.ts`, and tests semantic determinism in `apps/api/test/semantic-runtime.ts`. Refactor and module rebuild preserve that. Full rebuild would discard the proven engine and retake this risk. |
| 1.2 Proof & replay integrity | 3 | 4 | 2 | Replay parity is explicitly enforced in `apps/api/src/modules/ask/ask.service.ts` and tested in `apps/api/test/phase12-replay-runtime.ts` plus `apps/api/test/integration.ts`. This score was assigned during the pre-implementation review because `proofId` still included a timestamp then. Phase 1 on `dna-foundation` has since removed that timestamp and strengthened this area. |
| 1.3 Constraint-first / fail-closed enforcement | 4 | 4 | 2 | Refresh rejects ontology violations and drift-budget failures in `apps/api/src/modules/ingestion/ingestion.service.ts`, with constraint logic in `apps/api/src/modules/ingestion/ontology-constraints.service.ts` and drift policy in `apps/api/src/modules/ingestion/semantic-drift-policy.service.ts`. Rebuild would need all of this rebuilt and revalidated. |
| 1.4 Provenance traceability | 4 | 4 | 2 | Ask builds derivation edges, proof artifacts, policy IDs, and replay tokens in `apps/api/src/modules/ask/ask.service.ts`. Storage paths are explicit in `apps/api/src/config/runtime-paths.service.ts` and `apps/api/src/common/path.ts`. Full rebuild would throw away most of the existing traceability implementation. |
| 2.1 Tauri owns lifecycle cleanly | 2 | 4 | 4 | Tauri is currently thin in `apps/desktop/src-tauri/src/lib.rs`, while process ownership lives in `apps/desktop/scripts/dev-runtime.mjs` and `apps/desktop/src-tauri/tauri.conf.json`. Module-level rebuild or full rebuild can address runtime ownership. Refactor is possible but currently incomplete. |
| 2.2 Next.js UI is presentation-only | 1 | 4 | 5 | `apps/web/app/page.tsx` contains command routing, payload shaping, and workflow dispatch over 1119 lines, and `apps/web/app/api/query/route.ts` adds a 454-line generic adapter. This is the clearest reason to prefer a module-level rebuild of the UI boundary. |
| 2.3 NestJS treated as local engine | 3 | 4 | 4 | The engine is local and modular in `apps/api/src/app.module.ts`, but the Next proxy path in `apps/web/app/api/query/route.ts` still frames it as a web server dependency. A module-level rebuild can clean this boundary without rewriting the engine. |
| 2.4 No Docker-era or browser-era assumptions embedded | 2 | 4 | 4 | Docker runtime is gone from the main path, but browser-era command multiplexing remains in `apps/web/app/api/query/route.ts`, browser-style health proxy routes remain in `apps/web/app/api/health/route.ts` and `apps/web/app/api/ready/route.ts`, and `tauri.conf.json` still points dev at a local web URL. |
| 3.1 Clear UI ↔ engine boundary | 2 | 4 | 4 | The UI still holds application command logic in `apps/web/app/page.tsx`, and the generic route adapter in `apps/web/app/api/query/route.ts` blurs the boundary. The engine itself is relatively coherent and can be preserved. |
| 3.2 Modular structure | 3 | 4 | 3 | Nest modules are segmented in `apps/api/src/modules`, but the UI is effectively monolithic in `apps/web/app/page.tsx`, and critical engine services remain very large: `ask.service.ts`, `org.service.ts`, `ingestion.service.ts`. Module rebuild can target the weak modules instead of resetting everything. |
| 3.3 No cross-layer coupling that prevents refactor | 3 | 4 | 2 | Coupling exists, but it is localized around the UI router and runtime orchestration rather than everywhere. `apps/api` modules are still separately testable in `apps/api/test`. Full rebuild would create new coupling risks. |
| 3.4 Config is explicit + auditable | 4 | 4 | 3 | Config surface is explicit in `apps/api/src/config/app-config.service.ts`, runtime path resolution is centralized in `apps/api/src/config/runtime-paths.service.ts`, and artifact paths are deterministic in `apps/api/src/common/path.ts`. This is already salvageable. |
| 4.1 Time to stable release | 4 | 3 | 1 | Targeted fixes can ship fastest, but they will leave the UI boundary debt mostly intact. Module-level rebuild is slower but still bounded because the engine is reusable. Full rebuild is the slowest option by far. |
| 4.2 Risk of hidden breakage | 3 | 3 | 1 | The engine has broad integration coverage in `apps/api/test/integration.ts`, reducing hidden risk for A/B. Full rebuild would invalidate most existing assurances. |
| 4.3 Refactor complexity vs rebuild complexity | 3 | 4 | 1 | Refactor is viable but starts fighting file concentration in `page.tsx`, `org.service.ts`, and `ask.service.ts`. Module-level rebuild is cleaner because the bad boundary is concentrated. Full rebuild is complexity-maximizing. |
| 4.4 % realistically salvageable code | 4 | 4 | 1 | The ontology package, graph/query services, ingestion pipeline, replay logic, and many tests are worth preserving. Real salvageable code is high in `packages/ontology` and most of `apps/api/src/modules`. |
| 5.1 Ability to add replay harness + golden tests | 4 | 5 | 2 | Replay tests already exist in `apps/api/test/phase12-replay-runtime.ts`, and integration assertions in `apps/api/test/integration.ts` are strong. Module rebuild can extend this cleanly. Full rebuild would start from lower assurance. |
| 5.2 Ability to add property tests for invariants | 4 | 4 | 2 | `apps/api/test/semantic-runtime.ts` already checks deterministic algebraic properties over the ontology primitives. This is reusable for A/B. |
| 5.3 Observability/diagnostics to explain failures | 4 | 4 | 2 | Metrics, readiness, ingest summary, drift artifacts, and org audit artifacts already exist in `apps/api/src/modules/observability`, `apps/api/src/modules/health`, `apps/api/src/modules/ingestion`, and `apps/api/src/modules/org`. |
| 6.1 Team familiarity with stack | 4 | 4 | 3 | Current work has already shipped across Tauri, Next, Nest, and local CLI tooling. A/B continue in the known stack. Full rebuild could still use the same stack, but familiarity would not offset the reset cost. |
| 6.2 Build + packaging stability (Windows desktop) | 3 | 3 | 2 | Packaging is functional through `apps/desktop/src-tauri/tauri.conf.json` and `apps/desktop/scripts/dev-runtime.mjs`, but runtime ownership is not yet clean. A/B both need work here; full rebuild would delay stability further. |
| 6.3 CI simplicity and speed | 3 | 3 | 2 | CI can already validate the current engine and desktop build, but UI boundary changes still need cleanup. A/B keep existing harnesses. Full rebuild would discard them and initially make CI worse. |

## Section Totals

| Section | Weight | A Avg | A Weighted | B Avg | B Weighted | C Avg | C Weighted |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1. Contract Compliance | 35 | 3.75 | 26.25 | 4.00 | 28.00 | 2.00 | 14.00 |
| 2. Desktop-First Alignment | 15 | 2.00 | 6.00 | 4.00 | 12.00 | 4.25 | 12.75 |
| 3. Architectural Coherence | 15 | 3.00 | 9.00 | 4.00 | 12.00 | 3.00 | 9.00 |
| 4. Execution Risk | 15 | 3.50 | 10.50 | 3.50 | 10.50 | 1.00 | 3.00 |
| 5. Testability & Enforcement | 10 | 4.00 | 8.00 | 4.33 | 8.66 | 2.00 | 4.00 |
| 6. Team & Delivery Factors | 10 | 3.33 | 6.66 | 3.33 | 6.66 | 2.33 | 4.66 |

## Weighted Totals

| Option | Total / 100 |
|---|---:|
| A) Targeted Refactor | 66.41 |
| B) Module-Level Rebuild | 77.82 |
| C) Full Rebuild | 47.41 |

## Review Update

- This report remains the pre-implementation decision baseline for `dna-foundation`.
- Phase 1 has already closed the deterministic proof-identity gap that lowered item `1.2`.
- That does not change the branch-level recommendation.
- The decisive weak areas are still:
  - Tauri runtime ownership
  - UI presentation/boundary discipline
  - browser-era request multiplexing in `apps/web/app/api/query/route.ts`

## Lowest-Scoring Categories

### Option A
- `2.2` Next.js UI is presentation-only: `1`
- `2.1` Tauri owns lifecycle cleanly: `2`
- `2.4` No browser-era assumptions embedded: `2`
- `3.1` Clear UI ↔ engine boundary: `2`

### Option B
- `4.1`, `4.2`, `4.4`, `6.2`, `6.3` are the floor at `3`
- This means module-level rebuild is not free; it must be tightly scoped and acceptance-gated.

### Option C
- Nearly every execution and contract category is too weak because it throws away the already working engine and test harness.

## Decision Rules Applied

### Full Rebuild rule
- Full rebuild is only allowed if it beats the best alternative by at least `15%` and Refactor contract average is below `3.0`.
- Result: **fails rule**.
  - Best alternative is `77.82`.
  - Full rebuild is `47.41`, not `>= 89.49`.
  - Refactor Contract Compliance average is `3.75`, not below `3.0`.

### Module-Level Rebuild rule
- Preferred if core engine Contract Compliance average is `>= 3.5` but UI/boundary categories are `< 3.0`.
- Result: **passes rule**.
  - Core engine/contract scores are strong.
  - Desktop/UI boundary scores in current shape are weak.

### Refactor rule
- Preferred if Refactor total is `>= 85%` of best option and Contract Compliance average is `>= 3.5`.
- `85%` of best option `77.82` = `66.15`.
- Refactor total is `66.41`, which narrowly passes the arithmetic threshold.
- However, the matrix still favors Module-Level Rebuild because the boundary-specific rule is more directly triggered by the actual weakness pattern:
  - strong engine contract,
  - weak UI boundary and shell ownership.

## Recommendation

### Recommendation: `B) Module-Level Rebuild`

Why:
1. The engine "DNA" is already real and worth preserving.
- Deterministic planner, proof/replay, drift gates, ontology constraints, and tests already exist.

2. The weakest part of the system is concentrated, not universal.
- The UI boundary and runtime ownership are the main problems:
  - `apps/web/app/page.tsx`
  - `apps/web/app/api/query/route.ts`
  - `apps/desktop/scripts/dev-runtime.mjs`

3. Full rebuild would discard too much proven value.
- That violates the constitution's preference for the smallest viable change that restores contract compliance.

4. Pure targeted refactor is too optimistic for the UI boundary.
- The existing boundary is not just untidy; it is structurally wrong for a desktop-first product.
- It needs selected modules rebuilt around a clean contract, not endless incremental patching.

## Practical Interpretation

Do not rebuild the engine wholesale.
Do rebuild the boundary modules that violate the architecture laws:
- the generic Next command multiplexer,
- the oversized Ask-first UI surface,
- the desktop runtime ownership seam,
- any contract leaks where response identity is not deterministic.
