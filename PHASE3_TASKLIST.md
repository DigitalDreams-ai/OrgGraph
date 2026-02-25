# OrgGraph Phase 3 Task List (Evidence + Ask)

Goal: introduce evidence retrieval and `/ask` orchestration while keeping deterministic graph queries as the system of record.

## Scope
- Add evidence abstraction and ingestion boundaries
- Add `/ask` endpoint with planner contract
- Keep Phase 3 safe: no hidden side effects, deterministic query + explicit citations

## 1. API Contracts

- [ ] Add `POST /ask` endpoint contract
- [ ] Define request schema (`query`, optional `context`, optional `maxCitations`)
- [ ] Define response schema (`answer`, `plan`, `citations`, `confidence`, `status`)
- [ ] Add explicit error envelope for planner/retrieval/provider failures

## 2. Planner Layer

- [ ] Add intent classification (`perms`, `automation`, `impact`, `mixed`, `unknown`)
- [ ] Add planner output model:
- [ ] selected intent
- [ ] extracted entities (object/field/user)
- [ ] required graph query calls
- [ ] required evidence retrieval calls
- [ ] Add deterministic fallback for unknown intent

## 3. Evidence Store Abstraction

- [ ] Create `EvidenceStore` interface
- [ ] Add initial implementation (filesystem/SQLite metadata)
- [ ] Add optional Chroma adapter behind interface
- [ ] Add evidence record schema:
- [ ] id
- [ ] source path
- [ ] source type (apex/flow/xml)
- [ ] chunk text
- [ ] entity tags

## 4. Evidence Ingestion

- [ ] Build chunking strategy for Apex classes/triggers/flows
- [ ] Persist chunks with stable IDs and metadata
- [ ] Link chunks to graph entities where possible
- [ ] Add refresh hook to update evidence index alongside graph refresh

## 5. Ask Orchestration

- [ ] Implement `/ask` flow:
- [ ] parse query -> planner
- [ ] run graph query templates
- [ ] retrieve evidence chunks
- [ ] produce answer with citations
- [ ] Keep LLM optional behind provider interface (OpenAI/Claude adapters deferred or stubbed)
- [ ] Ensure answer never omits citation list when evidence was used

## 6. Testing

- [ ] Unit tests: planner intent + entity extraction
- [ ] Unit tests: evidence chunking + stable IDs
- [ ] Integration tests: `/ask` for perms/automation/impact prompts
- [ ] Integration tests: no-evidence + unknown-intent paths
- [ ] Regression tests for existing Phase 1/2 endpoints

## 7. Operational Readiness

- [ ] Add env config for evidence provider/backends
- [ ] Add Docker env wiring for new evidence settings
- [ ] Add simple metrics/logging hooks for `/ask` timing and token/citation counts

## Definition of Done (Phase 3)

- [ ] `/ask` returns deterministic plan + answer + citations
- [ ] Evidence indexing runs with refresh and is queryable
- [ ] `pnpm --filter api test` passes with Phase 3 coverage
- [ ] Dockerized API serves `/ask` in NAS `orggraph` project

## Immediate Next Action

- [ ] Implement planner + `/ask` request/response contract (stubbed evidence provider), then add first integration test.
