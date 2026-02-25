# OrgGraph

A Salesforce operational reasoning engine — ontology-first knowledge graph for your org. Graph = Truth, LLM = Interpreter, Vectors = Evidence.

**Runs entirely on Synology NAS.**

---

## NAS Deployment

| Detail | Value |
|--------|-------|
| Hostname | DS1823xs |
| IP | 10.0.1.10 |
| SSH User | docker |
| Project Path | `/volume1/data/projects/OrgGraph` |
| Auth | SSH key (no password) |

### Prerequisites (Synology)

- **Docker** — Already installed (Container Manager)
- **SSH** — Enable in Control Panel → Terminal & SNMP
- **Postgres** — Runs in container

All OrgGraph services run under the Docker project **orggraph** for isolation and organization.

### SSH Setup

```bash
# Test connection
ssh docker@10.0.1.10

# If password required, set up SSH keys:
ssh-keygen -t rsa -b 4096
ssh-copy-id docker@10.0.1.10
```

### Development on NAS

- Use **Cursor Remote SSH** or `ssh docker@DS1823xs`
- Open `/volume1/data/projects/OrgGraph`
- Work directly in the repo on the NAS

### Local Bootstrap (Phase 1)

```bash
cd /volume1/data/projects/OrgGraph

# Preferred if pnpm is installed globally:
pnpm install

# Fallback on this NAS (no global pnpm):
npm exec --yes pnpm@9.12.3 -- install

# Typecheck all workspace packages
npm exec --yes pnpm@9.12.3 -- typecheck

# Build the API
npm exec --yes pnpm@9.12.3 -- --filter api build
```

Phase 1 user-to-profile resolution is read from `fixtures/permissions/user-profile-map.json`.

### Running the Stack

All OrgGraph services run via Docker Compose under the project **orggraph**:

```bash
cd /volume1/data/projects/OrgGraph
docker compose -f docker/docker-compose.yml up -d
```

See `docker/docker-compose.yml` for service configuration. The compose file uses `name: orggraph` to keep containers grouped in Container Manager.

### Service Endpoints

- API: `http://<nas-ip>:3100`
- Web Console (Phase 4): `http://<nas-ip>:3101`
- API Health: `GET /health`
- API Readiness: `GET /ready`
- API Metrics: `GET /metrics`
- Web Health: `GET /api/health`
- Web Readiness: `GET /api/ready`

---

## CLI

```bash
og refresh [--full]      # Pull metadata, parse, upsert graph
og impact field Account.Foo__c
og perms user jane@example.com
og automation object Case
og ask "What touches Opportunity.StageName?"
```

## API Quick Usage

```bash
# Full refresh (default mode)
curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{}'

# Incremental refresh (skip when fixtures unchanged)
curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{"mode":"incremental"}'
```

## Salesforce Org Integration (Phase 6)

Phase 6 adds sandbox-first org retrieval and refresh.

### Prerequisites

1. Install Salesforce CLI (`sf`) on NAS host.
2. Create secrets directory:
`mkdir -p /volume1/data/projects/OrgGraph/.secrets`
3. Ensure env file exists at repo root:
`cp .env.sample .env` (or `cp .env.example .env`)
4. Create an External Client App in sandbox org and enable OAuth scopes:
- `refresh_token`
- `api`
- `web`
5. Set OAuth values in `.env` (scripts auto-load this file):
- `SF_BASE_URL=https://test.salesforce.com` (single variable to switch org host)
- `SF_AUTH_MODE=oauth_refresh_token`
- `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_REDIRECT_URI`
6. Generate authorization URL and authorize once:
`npm run sf:oauth:url`
7. Paste returned OAuth `code` into `.secrets/sf-auth-code.txt`, then exchange:
`npm run sf:oauth:exchange`
8. Review/adjust retrieve manifest:
`manifest/package.xml`

### Commands

```bash
# Print authorize URL for External Client App flow
npm run sf:oauth:url

# Exchange auth code for token store (.secrets/sf-oauth-token.json)
npm run sf:oauth:exchange

# Auth only
npm run sf:auth

# Retrieve metadata only
npm run sf:retrieve

# Auth + retrieve + API refresh
npm run sf:retrieve-refresh

# Verbose output for auth/retrieve/refresh pipeline
SF_VERBOSE=true npm run sf:retrieve-refresh

# Export org-derived user -> [profile, permission-set...] map for /perms
npm run sf:export-user-map

# Phase 8 promotion safety commands
npm run phase8:promotion-dry-run
npm run phase8:restore-point:create
npm run phase8:promotion-log -- promoted
```

### API Trigger

```bash
curl -X POST http://localhost:3100/org/retrieve \
  -H 'content-type: application/json' \
  -d '{"runAuth":true,"runRetrieve":true,"autoRefresh":true}'
```

See [ORG_INTEGRATION.md](./ORG_INTEGRATION.md) and [SANDBOX_CONNECT_CHECKLIST.md](./SANDBOX_CONNECT_CHECKLIST.md).

## Operator Docs

- Usage guide: [docs/USAGE_GUIDE.md](./docs/USAGE_GUIDE.md)
- Quick commands: [docs/CHEATSHEET.md](./docs/CHEATSHEET.md)
- Production promotion gate: [PRODUCTION_PROMOTION.md](./PRODUCTION_PROMOTION.md)
- Release checklist: [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
- Postgres migration: [POSTGRES_MIGRATION.md](./POSTGRES_MIGRATION.md)

## Operational Environment Variables

```bash
# API
PORT=3000
GRAPH_BACKEND=sqlite
DATABASE_URL=file:./data/orggraph.db
PERMISSIONS_FIXTURES_PATH=fixtures/permissions
USER_PROFILE_MAP_PATH=fixtures/permissions/user-profile-map.json
EVIDENCE_INDEX_PATH=data/evidence/index.json
REFRESH_STATE_PATH=data/refresh/state.json
REFRESH_AUDIT_PATH=data/refresh/audit.jsonl
ONTOLOGY_REPORT_PATH=data/refresh/ontology-report.json
MIN_CONFIDENCE_DEFAULT=medium
ASK_CONSISTENCY_CHECK_ENABLED=true
ORGGRAPH_LOG_LEVEL=log,warn,error,debug
ORGGRAPH_HTTP_LOG_ENABLED=true

# Web
NEXT_PUBLIC_API_BASE=http://localhost:3100
ORGGRAPH_WEB_LOG_ENABLED=true
```

Postgres runtime example:
```bash
GRAPH_BACKEND=postgres
DATABASE_URL=postgres://orggraph:orggraph@postgres:5432/orggraph
```

## Architecture Notes

- API (`apps/api`): deterministic graph/evidence processing and query endpoints.
- Web (`apps/web`): operator console and API proxy routes (`/api/query`, `/api/ready`, `/api/health`).
- Data volume (`data/`): SQLite db, evidence index, and refresh state.
- Fixtures (`fixtures/permissions`): deterministic parser source for refresh/rebuild.

## Troubleshooting

1. Health endpoints: `curl http://localhost:3100/health` and `curl http://localhost:3100/ready`
2. Web readiness: `curl http://localhost:3101/api/ready`
3. Metrics snapshot: `curl http://localhost:3100/metrics`
4. If web builds fail on Synology due `@eaDir` artifacts, run `./scripts/clean-eadir.sh`
5. Rebuild stack after updates: `docker compose -f docker/docker-compose.yml up -d --build`
6. For Dozzle-friendly request logs, ensure `ORGGRAPH_HTTP_LOG_ENABLED=true` (api) and `ORGGRAPH_WEB_LOG_ENABLED=true` (web)

---

## Plan

- Current active phase: **Phase 10 planning** (LLM support plan) with Phase 9 implementation completed.
- See [PHASE9_TASKLIST.md](./docs/planning/PHASE9_TASKLIST.md) for completed Postgres + metadata expansion scope.
- See [PLAN_v1_Monorepo.md](./docs/planning/PLAN_v1_Monorepo.md) for the master roadmap.
