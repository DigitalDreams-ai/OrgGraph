# Orgumented Phase 2 Task List (Automation + Impact)

Goal: answer
- "What runs on Object X?"
- "What breaks if Field Y changes?"

Scope focus:
- Add automation entities and relations
- Keep deterministic graph-first behavior
- No LLM dependency in this phase

## Current Status Snapshot

- [x] Phase 2 branch created/published (`phase2`).
- [x] Ontology extended with `ApexClass`, `ApexTrigger`, `Flow`.
- [x] Ontology relations extended with `TRIGGERS_ON`, `REFERENCES`, `QUERIES`, `WRITES`.
- [x] `/impact` and `/automation` endpoints scaffolded.
- [x] Apex Trigger parser implemented from fixtures.
- [x] Apex Class parser implemented from fixtures.
- [x] Flow parser implemented from fixtures.
- [x] `/automation?object=...` returns trigger/flow/class results from graph.
- [x] `/impact?field=...` returns deterministic impact paths from graph.
- [x] Validation/integration tests updated for trigger/class/flow ingestion and automation/impact queries.

## 1. Ingestion Expansion

- [x] Parse Apex Triggers from fixture files.
  - [x] Create `ApexTrigger` node.
  - [x] Create `TRIGGERS_ON` edge to target object.
  - [x] Add basic `REFERENCES` extraction from SOQL/DML patterns.
- [x] Parse Apex Classes.
  - [x] Create `ApexClass` node.
  - [x] Emit `REFERENCES`, `QUERIES`, `WRITES` edges.
- [x] Parse Flows (record-triggered first).
  - [x] Create `Flow` node.
  - [x] Emit `TRIGGERS_ON`, `REFERENCES`, and `WRITES` edges.

## 2. Query Endpoints

- [x] `/automation?object=...` implemented for trigger-backed results.
- [x] Expand `/automation` to include Flow + ApexClass results.
- [x] Implement `/impact?field=...` using graph traversal over `REFERENCES|QUERIES|WRITES`.
- [x] Add response shape parity (deterministic paths + explanation text).

## 3. Fixtures

- [x] Add minimum trigger fixture under `fixtures/permissions/apex-triggers/`.
- [x] Add minimum Apex class fixture set.
- [x] Add minimum Flow fixture set.
- [x] Add cross-object reference fixture content for impact tests.

## 4. Tests

- [x] Trigger ingestion covered in validation test.
- [x] `/automation` integration coverage added.
- [x] Add parser unit tests for Apex class parsing edge cases.
- [x] Add parser unit tests for Flow parsing edge cases.
- [x] Add integration tests for `/impact` positive/negative cases.

## 5. Definition of Done (Phase 2)

- [x] `POST /refresh` ingests permissions + triggers + flows + classes.
- [x] `/automation?object=Case|Opportunity` returns relevant automation entities.
- [x] `/impact?field=Account.Foo__c|Opportunity.StageName` returns deterministic path(s) or explicit no-path.
- [x] `pnpm --filter api test` passes with Phase 2 fixtures.
- [x] Dockerized API serves Phase 2 endpoints in NAS `orgumented` project.

## Status

- [x] **Phase 2 complete**
- [x] Ready for Phase 3 planning (evidence + LLM orchestration)
