# Orgumented Risk Register

Date: February 28, 2026
Branch: `dna-foundation`

## Risk 1: Core output contract could regress back to non-deterministic result identity
- Evidence:
  - `apps/api/src/modules/ask/ask.service.ts`
  - `apps/api/test/phase12-replay-runtime.ts`
  - `apps/api/test/integration.ts`
- Current signal:
  - Phase 1 removed timestamp-based `proofId` generation.
  - Residual risk is regression if future boundary work reintroduces non-deterministic response identity.
- Impact:
  - same snapshot + query + policy could again stop producing identical external result identity.
- Mitigation:
  - keep proof identity derived from deterministic inputs only,
  - keep repeated-identical-ask regression tests mandatory.
- Pivot trigger:
  - if repeated-identical-ask assertions fail, stop boundary work and restore deterministic output identity first.

## Risk 2: UI continues to act as an application command layer
- Evidence:
  - `apps/web/app/page.tsx`
- Impact:
  - boundary drift,
  - policy leakage risk,
  - slower product evolution,
  - harder desktop-native transition.
- Mitigation:
  - remove generic command routing in slices,
  - introduce typed UI-to-engine boundaries,
  - keep engine policy logic only in Nest.
- Pivot trigger:
  - if the UI must keep expanding request translation logic to ship core flows, pause and rebuild that boundary first.

## Risk 3: Tauri does not yet own lifecycle strongly enough
- Evidence:
  - `apps/desktop/src-tauri/src/lib.rs`
  - `apps/desktop/scripts/dev-runtime.mjs`
  - `apps/desktop/src-tauri/tauri.conf.json`
- Impact:
  - desktop app may remain a thin wrapper over externally managed services,
  - packaging confidence stays lower than desired.
- Current signal:
  - dev-time API ownership is now shell-owned,
  - packaged builds now stage a bundled API runtime and bundled Node runtime,
  - residual risk is that packaged workflow proof is still narrower than full operator coverage.
- Mitigation:
  - explicitly plan runtime ownership work after contract hardening,
  - keep Windows packaging verification mandatory.
- Pivot trigger:
  - if packaged runtime cannot reliably supervise or reach required services, pause UI expansion and prioritize shell/runtime ownership.

## Risk 4: Large concentrated files hide structural complexity
- Evidence:
  - `apps/web/app/page.tsx`
  - `apps/api/src/modules/ask/ask.service.ts`
  - `apps/api/src/modules/org/org.service.ts`
  - `apps/api/src/modules/ingestion/ingestion.service.ts`
- Impact:
  - small changes produce unexpected regressions,
  - review and testing costs rise,
  - boundaries blur more easily.
- Mitigation:
  - module-level rebuild of the worst boundary modules,
  - extract slices with contract tests.
- Pivot trigger:
  - if a planned "small change" touches multiple large files across layers, stop and isolate the boundary first.

## Risk 5: Replay and proof stores may accumulate duplicate identities
- Evidence:
  - `apps/api/src/modules/ask/ask-proof-store.service.ts`
  - `apps/api/src/modules/ask/ask-metrics-store.service.ts`
- Impact:
  - proof lookup ambiguity,
  - noisy metrics,
  - harder audit interpretation.
- Mitigation:
  - define whether proof identity is event-based or deterministic-result-based,
  - add explicit store semantics after Phase 1.
- Pivot trigger:
  - if stable proof identity creates duplicate-store ambiguity that affects lookup or replay correctness, stop and redesign store semantics before boundary work.

## Risk 6: Browser-era transport assumptions may keep reappearing
- Evidence:
  - `apps/web/app/api/health/route.ts`
  - `apps/web/app/api/ready/route.ts`
  - `apps/web/app/page.tsx`
- Impact:
  - product behaves like a wrapped web console instead of a coherent desktop app.
- Current signal:
  - Ask, Org, Refresh, permissions, automation, impact, and meta flows now have explicit typed or direct-engine boundaries,
  - residual browser-era seams are mainly health/readiness proxy routes and remaining page-shell request shaping.
- Mitigation:
  - delete remaining browser-era routes incrementally as typed boundaries and shell-owned checks replace them.
- Pivot trigger:
  - if new work adds more generic route multiplexing, reject it and return to boundary cleanup.

## Risk 7: Real-org workflows and fixture workflows may drift apart
- Evidence:
  - `apps/api/src/modules/org/org.service.ts`
  - `apps/api/src/modules/ingestion/ingestion.service.ts`
  - `apps/api/test/integration.ts`
- Impact:
  - deterministic fixture confidence may overstate real operator reliability.
- Mitigation:
  - keep real-org validation in the runtime plan,
  - preserve sandbox-backed verification paths.
- Pivot trigger:
  - if fixture-backed tests stay green while real org flows repeatedly fail, stop and repair org/runtime contracts before more feature work.
