# Orgumented Phase 22 Task List (WebUI Org Browser Retrieval Core)

Goal: make WebUI the primary operational surface for org connection and selective metadata retrieval, using CCI/sf flows and avoiding package.xml as the primary path.

## Entry Criteria
- [x] Phase 21 complete
- [x] CCI auth baseline stable (`SF_AUTH_MODE=cci`)
- [x] Existing org status and retrieve endpoints available

## Exit Criteria
- [x] WebUI supports org-wide metadata type/member browse tree (Org Browser style)
- [x] WebUI supports keyword filtering across metadata types/members
- [x] WebUI can retrieve selected metadata members without requiring package.xml-driven workflows
- [x] Retrieval results are persisted to canonical runtime paths and immediately usable by refresh/query flows

## Scope
- WebUI-first metadata navigation and selective retrieval UX
- API contracts for catalog browse/search/select/retrieve
- Deterministic persistence and post-retrieve refresh integration
- Operator-facing status/error surfaces

## Deliverables
- [x] Build/finish metadata browser panel:
  - [x] lazy-load metadata types and members
  - [x] expandable tree by type -> member
  - [x] multi-select retrieval basket
- [x] Add org-wide search/filter:
  - [x] by metadata type
  - [x] by member name
  - [x] clear/reset filters
- [x] Add selective retrieve execution from WebUI:
  - [x] execute via sf/cci commands
  - [x] do not require package.xml for standard UI flows
  - [x] show retrieve job progress + result summary
- [x] Persist retrieval outputs to runtime paths:
  - [x] `SF_PROJECT_PATH`/`SF_PARSE_PATH` alignment
  - [x] refresh trigger option after successful retrieve
- [x] Add structured failure categories:
  - auth/session errors
  - source API/metadata type resolution errors
  - retrieve command failures

## Test Gates
- [x] `pnpm --filter web build`
- [x] `pnpm --filter api test`
- [x] web smoke includes metadata catalog/search/select/retrieve happy path
- [ ] one sandbox-backed selective retrieve validation recorded
- [x] no secret leakage in logs/UI artifacts

## Risks and Controls
- Risk: UI retrieval diverges from runtime parse path
  - [x] enforce canonical output path checks before refresh
- Risk: broad metadata scans become slow
  - [x] cache metadata catalog with explicit freshness/refresh controls

## Definition of Done
- [x] Operators can connect, browse org metadata, select members, retrieve, and immediately analyze in WebUI without package.xml-first friction
