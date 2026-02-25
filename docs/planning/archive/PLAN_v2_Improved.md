# OrgGraph — Improved Plan (v2)

**Target:** Personal org management · **Scope:** Simple, maintainable

**Stack:** NestJS (API) + Postgres + Chroma (vectors) + Claude/OpenAI

**Deployment:** Synology NAS. All services run in Docker under project **OrgGraph**.

---

# Philosophy (unchanged)

- **Graph = Truth** — Structured state of the org. Deterministic.
- **Vectors = Evidence** — Supporting snippets only. Never source of truth.
- **LLM = Interpreter** — Plans, synthesizes, cites. Does not invent structure.

We compute dependency truth first. Retrieval second.

---

# Project Structure

**Path:** `/volume1/data/projects/orggraph` (NAS)

NestJS-style layout: each domain is a self-contained module with its own entities, DTOs, and services.

```
orggraph/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── common/                        # Shared across all modules
│   │   ├── common.module.ts
│   │   ├── constants/
│   │   │   └── ontology.ts            # Node types, relationship types
│   │   ├── interfaces/
│   │   │   └── graph.interface.ts
│   │   └── utils/
│   │
│   ├── config/                        # ConfigModule — env, validation
│   │   ├── config.module.ts
│   │   └── config.service.ts
│   │
│   ├── database/                      # Postgres connection, migrations
│   │   ├── database.module.ts
│   │   └── database.service.ts
│   │
│   ├── graph/                         # Knowledge graph domain
│   │   ├── graph.module.ts
│   │   ├── graph.service.ts            # Node/edge CRUD, traversals
│   │   ├── graph.controller.ts
│   │   ├── entities/
│   │   │   ├── node.entity.ts
│   │   │   └── edge.entity.ts
│   │   └── dto/
│   │       ├── create-node.dto.ts
│   │       └── create-edge.dto.ts
│   │
│   ├── ingestion/                     # Metadata + code parsing
│   │   ├── ingestion.module.ts
│   │   ├── ingestion.service.ts       # Orchestrates pull → parse → upsert
│   │   ├── parsers/
│   │   │   ├── permissions.parser.ts
│   │   │   ├── flow.parser.ts
│   │   │   └── apex.parser.ts
│   │   └── sf-client.service.ts        # Wraps sf CLI for metadata pull
│   │
│   ├── evidence/                      # Vector store (Chroma)
│   │   ├── evidence.module.ts
│   │   ├── evidence.service.ts        # Embed, store, search
│   │   └── evidence.controller.ts
│   │
│   ├── queries/                      # Deterministic query templates
│   │   ├── queries.module.ts
│   │   ├── queries.service.ts        # Runs graph traversals
│   │   ├── queries.controller.ts
│   │   └── templates/
│   │       ├── impact.template.ts
│   │       ├── permissions.template.ts
│   │       └── automation.template.ts
│   │
│   ├── planner/                      # LLM layer
│   │   ├── planner.module.ts
│   │   ├── planner.service.ts        # Intent → template → summarize
│   │   └── planner.controller.ts
│   │
│   └── cli/                          # CLI commands
│       ├── cli.module.ts
│       └── commands/
│           ├── impact.command.ts
│           ├── perms.command.ts
│           ├── refresh.command.ts
│           └── automation.command.ts
│
├── prisma/                            # Schema + migrations
│   ├── schema.prisma
│   └── migrations/
│
├── docker/                            # OrgGraphServices
│   ├── Dockerfile
│   └── docker-compose.yml             # name: OrgGraphServices
│
├── scripts/                           # One-off: seed, migrate
│   └── refresh-graph.ts
│
├── test/                              # E2E, unit tests
│   ├── e2e/
│   └── unit/
│
├── .env.example
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### Conventions

- **One module per domain** — graph, ingestion, evidence, queries, planner
- **common/** — Shared constants (ontology), interfaces, utilities
- **config/** — Centralized config; inject via ConfigService
- **database/** — Postgres connection; graph module uses it
- **docker/** — All container config in one place
- **Each module** — `.module.ts`, `.service.ts`, `.controller.ts` (if HTTP), plus `entities/`, `dto/`, `templates/` as needed

### Optional (later)

- `apps/web/` — Next.js minimal UI
- `apps/cli/` — Standalone CLI binary (if split from NestJS)

---

# Simplifications for Personal Use

| Original | Simplified |
|----------|------------|
| Qdrant or Chroma | **Chroma only** — runs in-process, no extra service |
| Full ontology (14 node types) | **MVP: 8 types** — Object, Field, ApexClass, ApexTrigger, Flow, Profile, PermissionSet, ValidationRule |
| Full relationship set | **MVP: 6 rels** — CALLS, QUERIES, WRITES, REFERENCES, TRIGGERS_ON, GRANTS_OBJECT, GRANTS_FIELD |
| Tree-sitter call graph | **Defer** — Add in v2. Use regex/pattern for SOQL/DML in MVP |
| Deployment, Commit, Incident | **Defer** — Out of scope for initial build |

---

# Postgres Schema (unchanged, minimal)

```sql
-- nodes
id (uuid), type (text), name (text), meta (jsonb), created_at

-- edges  
id (uuid), src_id, dst_id, rel (text), meta (jsonb), created_at

-- indexes: type, name, (src_id, rel), (dst_id, rel)
```

---

# Refresh Strategy (new)

**When:** On-demand via CLI. No cron for personal use.

```
og refresh [--full]
```

- **Default:** Incremental. Compare current metadata checksums to last run. Only re-parse changed files.
- **--full:** Full rebuild. Use after major org changes or first run.
- **Storage:** `meta->>'checksum'` on nodes, or a separate `ingestion_state` table (last_run, file_checksums).

**Rule:** Run `og refresh` before asking questions. Keep it simple.

---

# Parser Limitations (documented)

| Parser | Captures | Does NOT capture |
|--------|----------|------------------|
| Permissions | Profile/PermSet object+field CRUD | RecordType, FLS at runtime |
| Flow | Record-triggered entry criteria, Get Records, Update Records | Screen flows, subflows, dynamic refs |
| Apex | Static SOQL, DML, obvious field refs | Dynamic SOQL, string concat, reflection |

**Display:** When returning results, include `meta->>'parser'` so you know the source. No silent overconfidence.

---

# Query Templates (MVP set)

| Intent | Template | Example |
|--------|----------|---------|
| Field impact | `impact.template` | "What breaks if Account.Foo__c changes?" |
| Permissions | `permissions.template` | "Why can't user X edit Case?" |
| Automation | `automation.template` | "What runs on Case insert?" |
| Evidence fallback | Vector search only | "Show me the trigger code for Account" |

**LLM flow:** Classify intent → pick template (or "evidence_only") → run → summarize with citations.

---

# Build Phases (realistic)

## Phase 1 — Foundation (2 weeks)
- NestJS project + Postgres schema
- `docker/Dockerfile` + `docker/docker-compose.yml` with `name: OrgGraphServices`
- `graph` module: node/edge CRUD, basic traversals
- `sf-client`: metadata pull via `sf project retrieve`
- Permissions parser → graph upsert

## Phase 2 — Parsers + Queries (2 weeks)
- Flow parser (record-triggered only)
- Apex parser (SOQL/DML patterns, no AST yet)
- Query templates: impact, permissions, automation
- `queries` controller + CLI commands

## Phase 3 — Evidence + LLM (1–2 weeks)
- Chroma evidence store
- Chunk code/XML with path + line numbers
- Planner: intent → template → evidence fetch → summarize

## Phase 4 — Polish (ongoing)
- Incremental refresh
- Tree-sitter Apex (optional)
- Next.js UI (optional)
- Run via `docker compose -p OrgGraphServices up -d` on NAS

**Total:** ~6–8 weeks at a relaxed pace.

---

# Guiding Rules (unchanged)

- Structured state first
- Evidence second
- LLM last
- Deterministic over probabilistic
- No hallucinated dependencies
- Always cite source lines

---

# CLI Commands

```
og refresh [--full]             # Pull metadata, parse, upsert graph
og impact field Account.Foo__c
og perms user jane@example.com
og automation object Case
og ask "What touches Opportunity.StageName?"
```

---

# Result

**OrgGraph** — A Salesforce operational reasoning engine for your org. Not a code search tool.

**Graph = Truth · LLM = Interpreter · Vectors = Supporting Evidence**
