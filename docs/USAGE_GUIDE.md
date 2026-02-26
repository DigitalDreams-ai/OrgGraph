# OrgGraph Usage Guide

## 1. What OrgGraph Does
OrgGraph builds a deterministic graph from Salesforce metadata and answers:
- Who can edit what (`/perms`)
- What automation runs on an object (`/automation`)
- What might be impacted by a field change (`/impact`)
- Natural-language queries with evidence (`/ask`)

## 2. Core Services
- API: `http://localhost:3100`
- Web UI: `http://localhost:3101`

## 3. Start the Stack
```bash
cd /volume1/data/projects/OrgGraph
docker compose -f docker/docker-compose.yml up -d --build
```

## 4. Health and Readiness
```bash
curl http://localhost:3100/health
curl http://localhost:3100/ready
curl http://localhost:3100/metrics
curl http://localhost:3100/ingest/latest
curl http://localhost:3101/api/health
curl http://localhost:3101/api/ready
```

## 5. Run With Local Fixtures
Use this when you want deterministic local validation.

```bash
curl -X POST http://localhost:3100/refresh \
  -H 'content-type: application/json' \
  -d '{}'
```

`/refresh` now includes:
- `snapshotId` (versioned semantic snapshot identifier)
- `semanticDiff` (added/removed nodes/edges, type/relation deltas, digest-change flag)
- `meaningChangeSummary` (human-readable semantic-change summary)
- `driftPolicy` and `driftEvaluation` (domain thresholds + pass/fail envelope)
- `driftReportPath` (artifact written for this refresh)

Compare two snapshots deterministically:
```bash
curl "http://localhost:3100/refresh/diff/<snapshotA>/<snapshotB>"
```

## 6. Connect Sandbox Org (External Client App OAuth)
1. Configure `.env` with Salesforce values (`SF_BASE_URL`, `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_REDIRECT_URI`, etc.).
2. Generate OAuth URL:
```bash
npm run sf:oauth:url
```
3. Approve app in browser and copy `code` into `.secrets/sf-auth-code.txt`.
4. Exchange code for tokens:
```bash
npm run sf:oauth:exchange
```
5. Authenticate CLI session:
```bash
npm run sf:auth
```

## 7. Retrieve and Ingest Sandbox Metadata
```bash
npm run sf:retrieve
npm run sf:export-user-map
curl -X POST http://localhost:3100/refresh \
  -H 'content-type: application/json' \
  -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'
```

Expected readiness source path after live refresh:
- `checks.fixtures.sourcePath` should be `/app/data/sf-project/force-app/main/default`

Optional staged UI metadata ingestion:
```bash
INGEST_UI_METADATA_ENABLED=true curl -X POST http://localhost:3100/refresh \
  -H 'content-type: application/json' \
  -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'
```

Expanded metadata coverage in current build includes:
- `CustomObject` / object-field projection
- `PermissionSetGroup`
- `CustomPermission`
- `ConnectedApp`
- staged UI metadata (`ApexPage`, `LightningComponentBundle`, `AuraDefinitionBundle`, `QuickAction`, `Layout`) when enabled

## 8. Query OrgGraph

### 8.1 Permissions
```bash
curl "http://localhost:3100/perms?user=sbingham@shulman-hill.com.uat&object=litify_pm__Intake__c"
curl "http://localhost:3100/perms?user=sbingham@shulman-hill.com.uat&object=litify_pm__Intake__c&field=litify_pm__Intake__c.OwnerId"
curl "http://localhost:3100/perms/system?user=sbingham@shulman-hill.com.uat&permission=ApproveUninstalledConnectedApps"
```

Read these response fields:
- `mappingStatus`: `resolved` | `unmapped_user` | `map_missing`
- `warnings`: guidance when principal mapping is missing/incomplete

### 8.2 Automation
```bash
curl "http://localhost:3100/automation?object=Opportunity"
```

### 8.3 Impact
```bash
curl "http://localhost:3100/impact?field=Opportunity.StageName"
```

### 8.4 Ask (NL)
```bash
curl -X POST http://localhost:3100/ask \
  -H 'content-type: application/json' \
  -d '{"query":"What touches Opportunity.StageName?","traceLevel":"standard"}'
```

Ask responses now include deterministic proof fields:
- `trustLevel`: `trusted`, `conditional`, or `refused`
- `policy`: applied thresholds for grounding/constraints/ambiguity
- `metrics`: deterministic meaning metrics
- `proof`: `proofId`, `replayToken`, `snapshotId`, operators, rejected branches
- `proof.traceLevel`: `compact`, `standard`, `full`
- metrics are also persisted over time at `ASK_METRICS_PATH` (default: `data/ask/metrics.jsonl`)

Lookup a stored proof artifact:
```bash
curl "http://localhost:3100/ask/proof/<proofId>"
```

Replay a proof deterministically:
```bash
curl -X POST http://localhost:3100/ask/replay \
  -H 'content-type: application/json' \
  -d '{"replayToken":"<replayToken>"}'
```

Replay response includes:
- `matched`: overall deterministic replay match
- `corePayloadMatched`: byte-equivalent core deterministic payload match
- `metricsMatched`: replay metric envelope matches proof metrics exactly

Policy validation (dry-run):
```bash
curl -X POST http://localhost:3100/ask/policy/validate \
  -H 'content-type: application/json' \
  -d '{"groundingThreshold":0.7,"constraintThreshold":0.9,"ambiguityMaxThreshold":0.45,"dryRun":true}'
```

Dashboard-ready metrics export:
```bash
curl http://localhost:3100/ask/metrics/export
```

Phase 12 replay validation scripts:
```bash
npm run phase12:replay-regression
npm run phase12:replay-load
```

## 9. Web Query Proxy
Web route supports either `kind` or `endpoint`, and either `payload` or `params`.

```bash
curl -X POST http://localhost:3101/api/query \
  -H 'content-type: application/json' \
  -d '{"kind":"impact","payload":{"field":"Opportunity.StageName"}}'

curl -X POST http://localhost:3101/api/query \
  -H 'content-type: application/json' \
  -d '{"endpoint":"perms","params":{"user":"sbingham@shulman-hill.com.uat","object":"litify_pm__Intake__c"}}'
```

## 10. Common Troubleshooting

### 10.1 `/perms` returns `unmapped_user`
```bash
npm run sf:export-user-map
```
Then retry `/perms`.

### 10.2 Readiness points to fixture path instead of retrieved path
Run live refresh again:
```bash
curl -X POST http://localhost:3100/refresh \
  -H 'content-type: application/json' \
  -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'
```
If refresh state was produced from a different runtime context, `/ready` now automatically falls back to current runtime path resolution.

### 10.3 Web container unhealthy
Rebuild and restart:
```bash
docker compose -f docker/docker-compose.yml up -d --build web
```

### 10.4 Validate full web flow quickly
```bash
npm run test:web-smoke
```

## 11. Extended Validation Harness
```bash
npm run phase7:smoke-live
npm run phase7:snapshot
npm run phase7:regression
npm run ingest:report
npm run phase14:drift-report -- latest latest artifacts/phase14-drift-report.json
npm run phase14:drift-gate
```
