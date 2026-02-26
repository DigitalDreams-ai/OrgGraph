# Orgumented Phase 19 Task List (Org-Wide Metadata Browser + Selective Retrieval)

Goal: implement org-wide metadata retrieval UX in WebUI with VS Code Org Browser-style expand/select/search behavior and selective fetch.

## Entry Criteria
- [ ] Phase 18 complete
- [ ] CCI-based auth active in WebUI

## Exit Criteria
- [ ] WebUI supports org-wide metadata type tree browsing
- [ ] Expand/select retrieval works across metadata types (not limited to CustomObject)
- [ ] Keyword search filters loaded metadata dynamically across types

## Scope
- Org-wide metadata type catalog in WebUI
- Selective member retrieval and job queueing
- Metadata type/member cache and refresh controls
- Source API to Metadata API fallback UX

## Deliverables
- [ ] Build metadata type tree with lazy load and multi-select
- [ ] Implement keyword search over loaded type/member data
- [ ] Add “Refresh Types/Cache” controls and cache age indicators
- [ ] Add guided fallback flow when Source API misses items
- [ ] Add provenance tags in UI (`source_api`, `metadata_api`, `cache`)

## Test Gates
- [ ] UI integration tests for browse/expand/select/search
- [ ] Retrieval smoke on at least 3 metadata families (objects, flows, apex)
- [ ] Deterministic retrieval job logs and reproducible run metadata
- [ ] Performance baseline: interactive search latency acceptable under large catalogs

## Risks and Controls
- Risk: loading full catalog blocks UI
  - [ ] enforce lazy loading and bounded batch queries
- Risk: stale cache causes operator confusion
  - [ ] show cache freshness + explicit refresh actions

## Definition of Done
- [ ] WebUI retrieval experience is org-wide, selective, and operator-friendly without package.xml-all retrieval default
