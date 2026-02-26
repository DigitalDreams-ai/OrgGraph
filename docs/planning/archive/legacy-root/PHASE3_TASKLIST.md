# Orgumented Phase 3 Task List (Evidence + Ask)

Goal: introduce evidence retrieval and `/ask` orchestration while keeping deterministic graph queries as the system of record.

## Scope
- Add evidence abstraction and ingestion boundaries
- Add `/ask` endpoint with planner contract
- Keep Phase 3 safe: no hidden side effects, deterministic query + explicit citations

## 1. API Contracts

- [x] Add `POST /ask` endpoint contract
- [x] Define request schema (`query`, optional `context`, optional `maxCitations`)
- [x] Define response schema (`answer`, `plan`, `citations`, `confidence`, `status`)
- [x] Add explicit error envelope for planner/retrieval/provider failures

## 2. Planner Layer

- [x] Add intent classification (`perms`, `automation`, `impact`, `mixed`, `unknown`)
- [x] Add planner output model:
  - [x] selected intent
  - [x] extracted entities (object/field/user)
  - [x] required graph query calls
  - [x] required evidence retrieval calls
- [x] Add deterministic fallback for unknown intent

## 3. Evidence Store Abstraction

- [x] Create `EvidenceStore` interface
- [x] Add initial implementation (filesystem-backed JSON metadata index)
- [x] Add optional Chroma adapter behind interface (deferred; interface seam is in place)
- [x] Add evidence record schema:
  - [x] id
  - [x] source path
  - [x] source type (apex/flow/xml)
  - [x] chunk text
  - [x] entity tags

## 4. Evidence Ingestion

- [x] Build chunking strategy for Apex classes/triggers/flows
- [x] Persist chunks with stable IDs and metadata
- [x] Link chunks to graph entities where possible
- [x] Add refresh hook to update evidence index alongside graph refresh

## 5. Ask Orchestration

- [x] Implement `/ask` flow:
  - [x] parse query -> planner
  - [x] run graph query templates
  - [x] retrieve evidence chunks
  - [x] produce answer with citations
- [x] Keep LLM optional behind provider interface (provider integration deferred)
- [x] Ensure answer never omits citation list when evidence was used

## 6. Testing

- [x] Unit tests: planner intent + entity extraction
- [x] Unit tests: evidence chunking + stable IDs
- [x] Integration tests: `/ask` for perms/automation/impact prompts
- [x] Integration tests: no-evidence + unknown-intent paths
- [x] Regression tests for existing Phase 1/2 endpoints

## 7. Operational Readiness

- [x] Add env config for evidence provider/backends
- [x] Add Docker env wiring for new evidence settings
- [x] Add simple metrics/logging hooks for `/ask` timing and token/citation counts

## Definition of Done (Phase 3)

- [x] `/ask` returns deterministic plan + answer + citations
- [x] Evidence indexing runs with refresh and is queryable
- [x] `pnpm --filter api test` passes with Phase 3 coverage
- [x] Dockerized API serves `/ask` in NAS `orgumented` project

## Immediate Next Action

- [x] Implement planner + `/ask` request/response contract (stubbed evidence provider), then add first integration test.
