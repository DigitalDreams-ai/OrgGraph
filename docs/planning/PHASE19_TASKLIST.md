# Orgumented Phase 19 Task List (Org-Wide Metadata Browser + Selective Retrieval)

Goal: implement org-wide metadata retrieval UX in WebUI with VS Code Org Browser-style expand/select/search behavior and selective fetch.

## Entry Criteria
- [x] Phase 18 complete
- [ ] CCI-based auth active in WebUI

## Exit Criteria
- [x] WebUI supports org-wide metadata type tree browsing
- [x] Expand/select retrieval works across metadata types (not limited to CustomObject)
- [x] Keyword search filters loaded metadata dynamically across types

## Scope
- Org-wide metadata type catalog in WebUI
- Selective member retrieval and job queueing
- Metadata type/member cache and refresh controls
- Source API to Metadata API fallback UX

## Deliverables
- [x] Build metadata type tree with lazy load and multi-select
- [x] Implement keyword search over loaded type/member data
- [x] Add “Refresh Types/Cache” controls and cache age indicators
- [x] Add guided fallback flow when Source API misses items
- [x] Add provenance tags in UI (`source_api`, `metadata_api`, `cache`)

## Test Gates
- [ ] UI integration tests for browse/expand/select/search
- [x] Retrieval smoke on at least 3 metadata families (objects, flows, apex)
- [ ] Deterministic retrieval job logs and reproducible run metadata
- [ ] Performance baseline: interactive search latency acceptable under large catalogs

## Risks and Controls
- Risk: loading full catalog blocks UI
  - [ ] enforce lazy loading and bounded batch queries
- Risk: stale cache causes operator confusion
  - [ ] show cache freshness + explicit refresh actions

## Definition of Done
- [x] WebUI retrieval experience is org-wide, selective, and operator-friendly without package.xml-all retrieval default

## Current Status (2026-02-26)
- Implemented in this slice:
  - `GET /org/metadata/catalog` with keyword search and limit controls
  - `POST /org/metadata/retrieve` for selective metadata retrieval by type/member (no package.xml requirement)
  - WebUI metadata tree UX with lazy expand/collapse and member/type multi-select
  - cache age/freshness indicators and explicit "Refresh Types" control
  - fallback/provenance labeling (`source`, warnings, and operator next-step hints)
- Remaining:
  - UI integration test coverage for browse/expand/select flows
  - performance baseline for very large catalogs
