# OrgGraph Lifecycle

This document describes how OrgGraph works end-to-end, from startup through retrieval, ingestion, graph rebuild, query serving, and operations.

## 1. Startup and Configuration
- API loads environment configuration (`GRAPH_BACKEND`, data paths, Salesforce auth settings, logging flags).
- API initializes graph backend (`sqlite` or `postgres`) and ensures schema/tables exist.
- Web starts as an operator UI/proxy over API.
- Health and readiness endpoints come online.

## 2. Metadata Source Setup
- OrgGraph reads metadata from either:
  - fixture path (`fixtures/permissions`) for controlled testing, or
  - retrieved Salesforce source (`data/sf-project/force-app/main/default`) for sandbox/live usage.
- `manifest/package.xml` defines metadata types retrieved from Salesforce.

## 3. Salesforce Retrieval (Optional but Typical)
- Auth flow is established (SFDX URL, OAuth refresh token, or JWT mode).
- Retrieve command pulls metadata into `SF_PROJECT_PATH`.
- Retrieve-refresh pipeline can then trigger API refresh to rebuild graph from latest source.

## 4. Refresh Trigger
- Refresh starts via:
  - `POST /refresh`, or
  - script pipeline (for example `sf:retrieve-refresh`).
- Refresh mode:
  - `full`: always rebuild graph.
  - `incremental`: skip rebuild if source fingerprint unchanged and graph/evidence are already valid.
- Concurrency guard: if one refresh is already running, another returns `409 Conflict`.

## 5. Parse and Extract
- Parsers scan metadata and emit deterministic graph pieces:
  - permissions parser
  - apex trigger parser
  - apex class parser
  - flow parser
  - custom object parser
  - permission set group parser
  - custom permission parser
  - connected app parser
  - staged UI metadata parser (feature gated by `INGEST_UI_METADATA_ENABLED=true`)
- Output from each parser:
  - nodes
  - edges
  - parser stats

## 6. Merge and Normalize
- Parser outputs are merged into a single graph payload.
- Node/edge IDs are deterministic.
- Payload is sorted to preserve deterministic behavior across runs.

## 7. Ontology Validation
- Merged payload is validated against ontology constraints.
- On violations, refresh fails with explicit validation error.
- On success, ontology report is written to disk for auditability.

## 8. Graph Rebuild
- Graph backend executes a full rebuild transaction:
  - clear existing graph records
  - insert nodes
  - insert edges
- Returns node/edge counts for run summary.

## 9. Evidence Reindex
- Evidence store reindexes source files and snippets.
- Writes evidence index and updates evidence count.

## 10. State and Audit Persistence
- Refresh state file is updated with:
  - source path
  - fingerprint
  - parser stats
  - counts
  - ontology summary
  - mode and timestamp
- Audit log appends run summary for historical trace.

## 11. Query Serving
- Query endpoints operate on graph + evidence:
  - `/perms`
  - `/perms/system`
  - `/automation`
  - `/impact`
  - `/ask`
- Phase 11 additions for deterministic traceability:
  - `/ask/proof/:proofId` (proof artifact lookup)
  - `/ask/replay` (deterministic replay check by replay token/proof id)
- `/ask` uses planner/orchestration but remains grounded in deterministic graph results and evidence citations.

## 12. Web Operator Layer
- Web UI posts to `/api/query` proxy.
- Proxy maps UI actions to API endpoints and returns wrapped JSON.
- Readiness panel shows upstream API readiness payload.
- Build badge identifies deployed UI revision.

## 13. Observability and Operations
- Metrics interceptor records route status and latency.
- `/metrics` exposes request metrics and DB backend.
- Logging supports detailed Dozzle visibility with reduced readiness-noise filtering.
- `/ready` reports the active fixtures path for the current runtime context and ignores stale cross-runtime state paths.
- Docker healthchecks keep services supervised.

## 14. Iteration Loop
- Retrieve latest metadata.
- Refresh graph/evidence.
- Run smoke queries.
- Inspect logs/metrics.
- Refine ontology/parser/query behavior.
- Repeat per phase/PR cycle.

## Visual: End-to-End Flow

```mermaid
flowchart TD
    A[Startup: API + Web + DB] --> B[Load Config + Init Backend]
    B --> C{Metadata Source}
    C -->|Fixtures| D[fixtures/permissions]
    C -->|Salesforce Retrieve| E[data/sf-project/force-app/main/default]

    D --> F[POST /refresh]
    E --> F

    F --> G{Refresh Lock}
    G -->|busy| H[409 Conflict]
    G -->|free| I[Build Source Fingerprint]

    I --> J{Incremental + unchanged?}
    J -->|yes| K[Skip rebuild, return cached readiness state]
    J -->|no| L[Run Parsers]

    L --> L1[Permissions Parser]
    L --> L2[Apex Trigger Parser]
    L --> L3[Apex Class Parser]
    L --> L4[Flow Parser]
    L --> L5[Custom Object Parser]
    L --> L6[Permission Set Group Parser]
    L --> L7[Custom Permission Parser]
    L --> L8[Connected App Parser]
    L --> L9[Staged UI Metadata Parser]

    L1 --> M[Merge Deterministic Graph Payload]
    L2 --> M
    L3 --> M
    L4 --> M
    L5 --> M
    L6 --> M
    L7 --> M
    L8 --> M
    L9 --> M

    M --> N[Ontology Constraint Validation]
    N -->|violation| O[400 Bad Request]
    N -->|ok| P[Full Graph Rebuild]

    P --> Q[Reindex Evidence]
    Q --> R[Write Refresh State + Audit + Ontology Report]
    R --> S[Ready for Queries]

    S --> T["/perms + /perms/system"]
    S --> U["/automation + /impact"]
    S --> V["/ask planner + evidence"]

    T --> W["Web /api/query Proxy + UI"]
    U --> W
    V --> W

    S --> X["/metrics + logs + Dozzle"]
```

## Visual: Runtime Components

```mermaid
graph LR
    User[Operator / Scripts] --> Web[Web UI + /api proxy]
    User --> API[API Controllers]
    Web --> API

    API --> Ingestion[Ingestion Service]
    API --> Query[Query + Analysis + Ask Services]

    Ingestion --> Parsers[Metadata Parsers]
    Parsers --> Ontology[Ontology Constraints]
    Ontology --> Graph[(Graph Store: SQLite/Postgres)]
    Ingestion --> Evidence[(Evidence Index)]
    Ingestion --> State[(Refresh State + Audit)]

    Query --> Graph
    Query --> Evidence

    API --> Metrics[Metrics + Logs]
    Metrics --> Dozzle[Dozzle / Docker Logs]
```
