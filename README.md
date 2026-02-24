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
| Project Path | `/volume1/data/projects/orggraph` |
| Auth | SSH key (no password) |

### Prerequisites (Synology)

- **Docker** — Already installed (Container Manager)
- **SSH** — Enable in Control Panel → Terminal & SNMP
- **Postgres** — Runs in container
- **Chroma** — Runs in-process with NestJS app

All OrgGraph services run under the Docker project **OrgGraphServices** for isolation and organization.

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
- Open `/volume1/data/projects/orggraph`
- Work directly in the repo on the NAS

### Running the Stack

All OrgGraph services run via Docker Compose under the project **OrgGraphServices**:

```bash
cd /volume1/data/projects/orggraph
docker compose -f docker/docker-compose.yml -p OrgGraphServices up -d
```

See `docker/docker-compose.yml` for Postgres + OrgGraph app configuration. The compose file uses `name: OrgGraphServices` to keep containers grouped in Container Manager.

---

## CLI

```bash
og refresh [--full]      # Pull metadata, parse, upsert graph
og impact field Account.Foo__c
og perms user jane@example.com
og automation object Case
og ask "What touches Opportunity.StageName?"
```

---

## Plan

See [PLAN_v3_Monorepo.md](./PLAN_v3_Monorepo.md) — monorepo, validate-first approach. Permissions proof of concept in Phase 1.
