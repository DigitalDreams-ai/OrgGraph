# Orgumented v2 Pivot Lock

Date: March 5, 2026  
Status: locked execution policy

Purpose:
- lock the current strategic decision and stop architecture churn
- prevent sunk-cost drift and prevent restart churn
- force execution through measurable Stage 1 gates

## Locked Decision

1. Do not restart the product from scratch.
2. Do not re-open Docker or hosted-web runtime paths.
3. Execute a stabilization-first sequence on the existing desktop architecture:
- Tauri shell
- embedded Next.js UI
- local NestJS engine

Rationale:
- a full restart now would re-buy already-earned deterministic/proof/runtime work
- the remaining risk is execution and product quality debt, not architecture viability

## Ordered Execution Sequence (Mandatory)

Work in this order:
1. wave2 + wave3: runtime/session reliability and status clarity
2. wave4 + wave5: org browser parity and retrieve -> refresh handoff completion
3. wave6 + wave7: Ask grounding depth and approval-grade decision packets
4. wave8 + wave9: structured analyze/diagnostics depth and proofs/history closure
5. wave10: layout/accessibility hardening
6. wave11: P0/P1 burn-down and CI trust/cost lock
7. wave12: release readiness + clean-machine operator proof
8. wave13: stabilization hold before any Stage 2 work

No Stage 2/3/4 expansion while any Stage 1 gate above is incomplete.

## Real-Org Gate Policy

Fixture-only success is non-blocking evidence only.

Stage 1 completion requires real-org evidence for:
- connect/switch/preflight
- org browser search/browse/retrieve
- retrieve -> refresh -> diff handoff
- grounded Ask on retrieved metadata
- proof/replay/history workflows
- packaged desktop startup and smoke

## Scope-Control Rules

1. One active wave slice at a time.
2. One coherent branch per slice (`dna-wave<N>-...`).
3. One coherent PR per slice.
4. No mixed wave scope in a single PR.
5. If a gate fails, fix immediately before starting any new slice.

## Rebuild Triggers (Objective)

Default path is targeted refactor. Rebuild is conditional.

Module-level rebuild is allowed only if all are true:
1. same domain fails acceptance in two consecutive wave slices
2. P0/P1 count in that domain is not trending down
3. cycle time for that domain is not improving

Full rebuild is allowed only if all are true:
1. deterministic/proof/replay contract cannot be preserved in current architecture
2. at least one module-level rebuild attempt failed to restore gate compliance
3. v2 decision matrix is re-scored and explicitly recommends full rebuild

## Stop Conditions

Stop forward scope and correct immediately when:
- replay parity regresses
- proof identity/replay token integrity regresses
- UI boundary takes decision/policy logic
- packaged vs local runtime diverges on core flows
- raw JSON becomes primary operator path for a Stage 1 core workflow

## Definition of Locked Progress

Progress is only counted when a slice has:
1. green required tests/smoke
2. merged PR
3. updated v2 execution/governance docs if behavior changed
4. project-memory update for traceability

