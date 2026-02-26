# Orgumented Phase 22 Task List (WebUI Org Browser Retrieval Core)

Goal: make WebUI the primary operational surface for org connection and selective metadata retrieval, using CCI/sf flows and avoiding package.xml as the primary path.

## Entry Criteria
- [ ] Phase 21 complete
- [ ] CCI auth baseline stable (`SF_AUTH_MODE=cci`)
- [ ] Existing org status and retrieve endpoints available

## Exit Criteria
- [ ] WebUI supports org-wide metadata type/member browse tree (Org Browser style)
- [ ] WebUI supports keyword filtering across metadata types/members
- [ ] WebUI can retrieve selected metadata members without requiring package.xml-driven workflows
- [ ] Retrieval results are persisted to canonical runtime paths and immediately usable by refresh/query flows

## Scope
- WebUI-first metadata navigation and selective retrieval UX
- API contracts for catalog browse/search/select/retrieve
- Deterministic persistence and post-retrieve refresh integration
- Operator-facing status/error surfaces

## Deliverables
- [ ] Build/finish metadata browser panel:
  - [ ] lazy-load metadata types and members
  - [ ] expandable tree by type -> member
  - [ ] multi-select retrieval basket
- [ ] Add org-wide search/filter:
  - [ ] by metadata type
  - [ ] by member name
  - [ ] clear/reset filters
- [ ] Add selective retrieve execution from WebUI:
  - [ ] execute via sf/cci commands
  - [ ] do not require package.xml for standard UI flows
  - [ ] show retrieve job progress + result summary
- [ ] Persist retrieval outputs to runtime paths:
  - [ ] `SF_PROJECT_PATH`/`SF_PARSE_PATH` alignment
  - [ ] refresh trigger option after successful retrieve
- [ ] Add structured failure categories:
  - auth/session errors
  - source API/metadata type resolution errors
  - retrieve command failures

## Test Gates
- [ ] `pnpm --filter web build`
- [ ] `pnpm --filter api test`
- [ ] web smoke includes metadata catalog/search/select/retrieve happy path
- [ ] one sandbox-backed selective retrieve validation recorded
- [ ] no secret leakage in logs/UI artifacts

## Risks and Controls
- Risk: UI retrieval diverges from runtime parse path
  - [ ] enforce canonical output path checks before refresh
- Risk: broad metadata scans become slow
  - [ ] cache metadata catalog with explicit freshness/refresh controls

## Definition of Done
- [ ] Operators can connect, browse org metadata, select members, retrieve, and immediately analyze in WebUI without package.xml-first friction
