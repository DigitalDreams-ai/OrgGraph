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
- **Chroma** — Runs in-process with NestJS app

All OrgGraph services run under the Docker project **orggraphservices** for isolation and organization.

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

All OrgGraph services run via Docker Compose under the project **orggraphservices**:

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

## Operational Environment Variables

```bash
# API
PORT=3000
DATABASE_URL=file:./data/orggraph.db
PERMISSIONS_FIXTURES_PATH=fixtures/permissions
USER_PROFILE_MAP_PATH=fixtures/permissions/user-profile-map.json
EVIDENCE_INDEX_PATH=data/evidence/index.json
REFRESH_STATE_PATH=data/refresh/state.json

# Web
NEXT_PUBLIC_API_BASE=http://localhost:3100
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

---

## Plan

See [PLAN_v1_Monorepo.md](./docs/planning/PLAN_v1_Monorepo.md) and [PHASE1_TASKLIST.md](./PHASE1_TASKLIST.md) for the execution plan and checklist.
