# OrgGraph — Plan v3 (Monorepo, Validate First)

> Note: This file documents the original monorepo execution model.  
> For current strategic execution (Phase 11+), use:
> - `docs/planning/BLUE_OCEAN_EXECUTION_PLAN.md`
> - `docs/planning/BLUE_OCEAN_PHASE_ROADMAP.md`
> - `docs/planning/PHASE11_TASKLIST.md` through `docs/planning/PHASE17_TASKLIST.md`

## Current Status (2026-02-25)

- Phase 1 through Phase 7 are complete and merged.
- Current execution focus is **Phase 8**:
  - richer ontology constraints
  - parser precision upgrades
  - stricter confidence/consistency controls
- Retrieval/storage expansion (Postgres/Chroma) is intentionally deferred until Phase 8 quality gates are met.

**Target:** Personal org management · **Approach:** Prove one use case, then expand

**Stack:** pnpm workspaces · NestJS (API) · SQLite → Postgres · Chroma · Claude/OpenAI (deferred)

**Deployment:** Synology NAS. Docker project **OrgGraphServices**.

---

# Philosophy

- **Graph = Truth** — Structured state of the org. Deterministic.
- **Vectors = Evidence** — Supporting snippets only. (Phase 3+)
- **LLM = Interpreter** — Plans, synthesizes, cites. (Phase 3+)

We compute dependency truth first. Retrieval second. **Validate before scaling.**

---

# Monorepo Structure

**Path:** `/volume1/data/projects/orggraph`

```
orggraph/
├── apps/
│   ├── api/                          # NestJS — graph, ingestion, queries
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   ├── database/
│   │   │   ├── graph/
│   │   │   ├── ingestion/
│   │   │   ├── queries/
│   │   │   └── evidence/              # Phase 3
│   │   ├── prisma/
│   │   ├── test/
│   │   ├── nest-cli.json
│   │   └── package.json
│   │
│   └── web/                          # Next.js — Phase 4
│       └── ...
│
├── packages/
│   └── ontology/                     # Shared types, constants
│       ├── src/
│       │   ├── index.ts
│       │   ├── node-types.ts
│       │   ├── rel-types.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml            # name: OrgGraphServices
│
├── fixtures/                         # Test metadata for validation
│   └── permissions/
│       ├── profiles/
│       └── permission-sets/
│
├── package.json                      # Workspace root
├── pnpm-workspace.yaml
└── .env.example
```

### Workspace config

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

# Phase 1 — Permissions Proof of Concept (1–2 weeks)

**Goal:** Answer "Why can't user X edit Object Y?" with a deterministic graph. No LLM. No automation.

### Scope

| Item | Phase 1 |
|------|---------|
| Node types | Object, Field, Profile, PermissionSet |
| Relationship types | GRANTS_OBJECT, GRANTS_FIELD |
| Parser | Permissions only |
| Database | SQLite |
| Refresh | Full only |
| Interface | API first |

### Schema (SQLite)

```sql
-- nodes
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,  -- Object, Field, Profile, PermissionSet
  name TEXT NOT NULL,
  meta TEXT,           -- JSON
  created_at TEXT
);

-- edges
CREATE TABLE edges (
  id TEXT PRIMARY KEY,
  src_id TEXT NOT NULL,
  dst_id TEXT NOT NULL,
  rel TEXT NOT NULL,    -- GRANTS_OBJECT, GRANTS_FIELD
  meta TEXT,
  created_at TEXT
);

CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_name ON nodes(name);
CREATE INDEX idx_edges_src_rel ON edges(src_id, rel);
CREATE INDEX idx_edges_dst_rel ON edges(dst_id, rel);
```

### API (Phase 1)

```
POST /refresh                    # Pull metadata, parse, upsert (full rebuild)
GET  /perms?user=EMAIL&object=X   # Why can't user edit object? Returns graph path.
```

### Validation

1. **Fixture:** `fixtures/permissions/` — minimal Profile + PermSet XML from a test org
2. **Expected output:** Known edges (e.g. Profile X → GRANTS_OBJECT → Case, Profile X → GRANTS_FIELD → Case.Status)
3. **Script:** `pnpm --filter api test:validation` — parse fixture, assert expected edges exist
4. **Manual:** Run on real org, spot-check one user/object pair

### Deliverables

- [ ] Monorepo scaffold (pnpm workspaces, apps/api, packages/ontology)
- [ ] Permissions parser (Profile + PermSet → nodes + edges)
- [ ] SQLite schema + Prisma or raw SQL
- [ ] `POST /refresh` — sf project retrieve → parse → upsert
- [ ] `GET /perms` — traverse graph, return path (or "no path found")
- [ ] Validation script with fixture
- [ ] Docker: SQLite file in volume, or migrate to Postgres in Phase 2

---

# Phase 2 — Automation + Impact (2 weeks)

**Goal:** Add Flow, Trigger, Apex. Answer "What runs on Object X?" and "What breaks if Field Y changes?"

### Add to ontology

- **Node types:** ApexClass, ApexTrigger, Flow
- **Relationship types:** TRIGGERS_ON, REFERENCES, QUERIES, WRITES

### Parsers

- Flow parser (record-triggered only)
- Apex parser (SOQL/DML patterns, no AST)

### API

```
GET /impact?field=Account.Foo__c
GET /automation?object=Case
```

### CLI (Phase 2)

```
og refresh
og perms user jane@example.com object Case
og impact field Account.Foo__c
og automation object Case
```

CLI calls API. No direct DB access.

### Migration: SQLite → Postgres

When graph grows or recursive queries get slow, migrate. Prisma makes this straightforward.

---

# Phase 3 — Evidence + LLM (1–2 weeks)

**Goal:** Add Chroma evidence store. Add `og ask` with LLM planner.

### Add

- Chroma evidence store (chunk code/XML, embed, search)
- Planner: intent classification → template selection → run query → fetch evidence → LLM summarize
- `og ask "What touches Opportunity.StageName?"`

### API

```
POST /ask
Body: { "query": "What touches Opportunity.StageName?" }
```

---

# Phase 4 — Polish (ongoing)

- Incremental refresh (when full refresh is slow)
- Next.js UI (`apps/web`)
- Tree-sitter Apex (optional)
- Run via `docker compose -f docker/docker-compose.yml -p OrgGraphServices up -d` on NAS

---

# Build Order Summary

| Phase | Focus | DB | Parsers | Interface |
|-------|-------|-----|---------|------------|
| 1 | Permissions only | SQLite | Permissions | API: /refresh, /perms |
| 2 | Automation + impact | Postgres | Flow, Apex | API + CLI |
| 3 | Evidence + LLM | Postgres | — | og ask |
| 4 | Polish | — | — | Web UI, incremental |

---

# Guiding Rules

- Structured state first
- Evidence second
- LLM last
- Deterministic over probabilistic
- No hallucinated dependencies
- Always cite source lines
- **Validate before scaling**

---

# CLI Commands (Final)

```
og refresh                    # Full rebuild (incremental in Phase 4)
og perms user X object Y
og impact field Object.Field__c
og automation object Object
og ask "natural language"     # Phase 3
```

---

# Result

**OrgGraph** — A Salesforce operational reasoning engine. Monorepo. Validate with permissions first. Add automation, evidence, and LLM incrementally.

**Graph = Truth · LLM = Interpreter · Vectors = Supporting Evidence**
