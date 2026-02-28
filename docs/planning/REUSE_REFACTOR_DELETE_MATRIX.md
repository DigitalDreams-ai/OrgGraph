# Orgumented Reuse / Refactor / Delete Matrix

Status: planning inventory

Purpose: identify what survives the move to a desktop-native Next.js + NestJS architecture and what should be removed.

## 1. Scoring Meaning
- Reuse: carry forward largely intact
- Refactor: keep the capability but change structure/boundaries
- Delete: not part of future-state architecture

## 2. Matrix

| Area | Current Asset | Decision | Why | Notes |
|---|---|---|---|---|
| UI | Current browser-hosted operator shell | Delete | wrong product shape | replace with fresh desktop UI |
| UI | Ask domain concepts | Reuse | flagship workflow remains valid | presentation must change |
| UI | raw JSON result panel as default | Delete | debug-centric, not operator-first | keep as secondary inspector only |
| Backend | NestJS app shell | Refactor | good engine starting point | adapt to local sidecar/runtime |
| Backend | ingestion services | Reuse | core semantic value | may need path/runtime abstraction |
| Backend | analysis services | Reuse | core capability | preserve deterministic contracts |
| Backend | ask services | Refactor | valuable but UX/output shape must change | planner and presentation boundaries need cleanup |
| Backend | proof/replay logic | Reuse | strategic differentiator | improve operator access patterns |
| Backend | org service/auth orchestration | Refactor | current assumptions are wrong | rebuild around local CLI session model |
| Backend | command runner | Reuse | useful abstraction | likely becomes basis of tool adapter layer |
| Tooling | direct scattered `sf` calls | Refactor | too distributed | centralize behind tool adapter |
| Tooling | direct scattered `cci` calls | Refactor | too distributed | centralize behind tool adapter |
| Auth | external client app / OAuth remnants | Delete | not target auth model | remove from runtime and docs |
| Auth | frontdoor/magic link primary auth | Delete | brittle and obsolete | not core architecture |
| Auth | browser broker / VNC sidecar | Delete | wrong solution | immediate removal target |
| Retrieve | selector-based metadata retrieve | Reuse | matches target model | promote to standard path |
| Retrieve | manifest-driven default retrieve | Delete | obsolete operator workflow | keep only if needed for dev migration, not product |
| Parsers | Apex, Flow, Object, Permission parsers | Reuse | high-value domain logic | validate local-path assumptions |
| Ontology | ontology package and constraints | Reuse | core differentiation | keep authoritative role |
| Storage | SQLite backend | Reuse initially | fastest local-first path | abstract for future evolution |
| Storage | Postgres runtime as requirement | Delete from product target | unnecessary for initial desktop | revisit only if justified |
| Ops | Docker compose runtime | Delete from product target | unnecessary complexity | dev-only at most during migration |
| Ops | shell script wrappers | Refactor | some remain useful for dev/test | not primary operator UX |
| Docs | runbooks assuming container commands | Delete/Refactor | wrong target mental model | rewrite for local desktop flows |

## 3. Priority Refactor Areas
1. auth/session orchestration
2. retrieve orchestration
3. path/config services
4. proof access model
5. Ask output shaping

## 4. Priority Delete Areas
1. browser-broker auth implementation
2. obsolete auth docs and env/config keys
3. manifest-first operator messaging
4. endpoint-console UI assumptions

## 5. Keep Intact Unless Proven Wrong
1. ontology constraints package
2. parser pipeline logic
3. deterministic graph/proof core
4. trust/policy/replay structures

## 6. Use This Matrix When
- planning new waves
- deciding whether to migrate or rewrite a module
- reviewing PRs that risk reviving superseded behavior
- reviewing PRs that risk reviving superseded behavior
