# Orgumented Usage Guide

## 1. What Orgumented Does
Orgumented is a deterministic semantic runtime for Salesforce architecture work. It ingests Salesforce metadata, builds a typed graph, and answers:
- who can edit what,
- what automation runs,
- what a change may impact,
- what architecture decision is safest under the current snapshot and policy envelope.

## 2. Runtime Shape
- Product shell: Tauri desktop application
- Embedded operator UI: Next.js rendered inside the shell
- Local semantic engine: NestJS on `http://localhost:3100`
- Auth source of truth: local Salesforce CLI keychain
- Support tooling: local `cci`

The product is desktop-native. Local `localhost` ports exist for process composition and verification, not as a hosted browser product model.

## 3. Start the Desktop Runtime
Start the managed desktop runtime:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
$env:ORGUMENTED_DESKTOP_API_PORT="3200"
$env:ORGUMENTED_DESKTOP_WEB_PORT="3201"
node apps/desktop/scripts/dev-runtime.mjs
```

Default behavior:
- the runtime uses the last verified web build instead of `next dev`
- set `ORGUMENTED_DESKTOP_WEB_MODE=development` only when you explicitly need the dev server
- set `ORGUMENTED_DESKTOP_WEB_REBUILD=1` to force a fresh embedded UI build before launch

Run the Tauri shell:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:dev
```

## 4. Health and Readiness
```bash
curl http://localhost:3100/health
curl http://localhost:3100/ready
curl http://localhost:3100/metrics
curl http://localhost:3100/ingest/latest
curl http://localhost:3100/org/status
```

## 5. Desktop Workflow
The desktop product centers on these workspaces:
- `Ask`
- `Org Sessions`
- `Org Browser`
- `Refresh & Build`
- `Explain & Analyze`
- `Proofs & History`
- `Settings & Diagnostics`

Expected operator flow:
1. Open on `Ask` and confirm current session status.
2. Use `Org Sessions` to connect or switch the active alias.
3. Use `Org Browser` and `Refresh & Build` to retrieve and ingest metadata.
4. Return to `Ask` or `Explain & Analyze` for decision work.
5. Use `Proofs & History` for replay and prior decision lookup.

Current Ask-first behavior:
- the desktop app opens on `Ask`
- raw JSON is available only through the `Raw JSON Inspector`
- the default answer shape is a decision packet, not a raw endpoint payload

## 6. Connect a Sandbox Org
Auth is delegated to Salesforce CLI keychain sessions.

1. Configure `.env` with org settings such as `SF_ALIAS` and `SF_BASE_URL`.
2. Authenticate locally in the same operator environment that runs Orgumented:

```bash
sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default
sf org display --target-org orgumented-sandbox --json
cci org import orgumented-sandbox <sf-username>
cci org info orgumented-sandbox
```

`sf` keychain auth is the attach requirement.
`cci` remains useful for org tasks and diagnostics, but failed `cci org import` no longer blocks desktop session attach.

3. Validate and attach the alias:

```bash
curl http://localhost:3100/org/preflight
curl http://localhost:3100/org/session
curl http://localhost:3100/org/session/aliases
curl "http://localhost:3100/org/session/validate?alias=orgumented-sandbox"
curl -X POST http://localhost:3100/org/session/connect -H 'content-type: application/json' -d '{"alias":"orgumented-sandbox"}'
```

## 7. Retrieve and Refresh Metadata
Selective retrieval is the standard path.

```bash
npm run sf:retrieve
npm run sf:export-user-map
curl -X POST http://localhost:3100/refresh \
  -H 'content-type: application/json' \
  -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'
```

Refresh responses include:
- `snapshotId`
- `semanticDiff`
- `meaningChangeSummary`
- `driftPolicy`
- `driftEvaluation`
- `driftReportPath`

Compare snapshots deterministically:

```bash
curl "http://localhost:3100/refresh/diff/<snapshotA>/<snapshotB>"
```

Runtime org-session controls:

```bash
curl http://localhost:3100/org/session
curl -X POST http://localhost:3100/org/session/switch -H 'content-type: application/json' -d '{"alias":"orgumented-sandbox"}'
curl -X POST http://localhost:3100/org/session/disconnect
```

Metadata browser APIs:

```bash
curl "http://localhost:3100/org/metadata/catalog?limit=200&refresh=true"
curl "http://localhost:3100/org/metadata/members?type=CustomObject&q=Account&limit=1000"
curl -X POST http://localhost:3100/org/metadata/retrieve \
  -H 'content-type: application/json' \
  -d '{"selections":[{"type":"CustomObject","members":["Account"]}],"autoRefresh":true}'
```

Optional staged UI metadata ingestion:

```bash
INGEST_UI_METADATA_ENABLED=true curl -X POST http://localhost:3100/refresh \
  -H 'content-type: application/json' \
  -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'
```

## 8. Query and Analyze

### 8.1 Permissions
```bash
curl "http://localhost:3100/perms?user=sbingham@shulman-hill.com.uat&object=litify_pm__Intake__c"
curl "http://localhost:3100/perms?user=sbingham@shulman-hill.com.uat&object=litify_pm__Intake__c&field=litify_pm__Intake__c.OwnerId"
curl "http://localhost:3100/perms/system?user=sbingham@shulman-hill.com.uat&permission=ApproveUninstalledConnectedApps"
```

### 8.2 Automation
```bash
curl "http://localhost:3100/automation?object=Opportunity"
```

### 8.3 Impact
```bash
curl "http://localhost:3100/impact?field=Opportunity.StageName"
```

### 8.4 Ask
```bash
curl -X POST http://localhost:3100/ask \
  -H 'content-type: application/json' \
  -d '{"query":"What touches Opportunity.StageName?","traceLevel":"standard"}'
```

Ask responses include:
- `trustLevel`
- `policy`
- `metrics`
- `proof`
- evidence and follow-up actions

Lookup a proof:

```bash
curl "http://localhost:3100/ask/proof/<proofId>"
```

Replay deterministically:

```bash
curl -X POST http://localhost:3100/ask/replay \
  -H 'content-type: application/json' \
  -d '{"replayToken":"<replayToken>"}'
```

Validate a policy envelope:

```bash
curl -X POST http://localhost:3100/ask/policy/validate \
  -H 'content-type: application/json' \
  -d '{"groundingThreshold":0.7,"constraintThreshold":0.9,"ambiguityMaxThreshold":0.45,"dryRun":true}'
```

Export trust and proof metrics:

```bash
curl http://localhost:3100/ask/metrics/export
curl http://localhost:3100/ask/trust/dashboard
```

### 8.5 Architecture Decision
```bash
curl -X POST http://localhost:3100/ask/architecture \
  -H 'content-type: application/json' \
  -d '{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName"}'
```

### 8.6 Simulation and Compare
```bash
curl -X POST http://localhost:3100/ask/simulate \
  -H 'content-type: application/json' \
  -d '{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName","profile":"balanced","proposedChanges":[{"action":"modify_field","object":"Opportunity","field":"Opportunity.StageName"}]}'

curl -X POST http://localhost:3100/ask/simulate/compare \
  -H 'content-type: application/json' \
  -d '{"scenarioA":{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName","profile":"strict","proposedChanges":[{"action":"modify_field","object":"Opportunity","field":"Opportunity.StageName"}]},"scenarioB":{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName","profile":"exploratory","proposedChanges":[{"action":"modify_field","object":"Opportunity","field":"Opportunity.StageName"},{"action":"add_automation","object":"Opportunity"}]}}'
```

### 8.7 Meta-Context Adaptation
```bash
curl http://localhost:3100/meta/context
curl -X POST http://localhost:3100/meta/adapt -H 'content-type: application/json' -d '{"dryRun":true}'
curl -X POST http://localhost:3100/meta/adapt -H 'content-type: application/json' -d '{"dryRun":false}'
```

## 9. Validation Commands
```bash
pnpm --filter api test
pnpm --filter web build
pnpm desktop:info
pnpm desktop:build
pnpm desktop:dev
npm run phase12:replay-regression
npm run phase12:replay-load
npm run phase13:metrics-export
npm run phase14:drift-report -- latest latest artifacts/phase14-drift-report.json
npm run phase14:drift-gate
```

## 10. Project Memory MCP
Use this when Codex needs advisory project continuity across many files and moving parts. It is not part of `/ask`, proof generation, or runtime truth.

Start the MCP:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm --filter @orgumented/project-memory-mcp build
npm run mcp:project-memory
```

Optional overrides:

```powershell
$env:ORGUMENTED_PROJECT_MEMORY_PATH="data/project-memory/events.jsonl"
$env:ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT="$env:USERPROFILE\Projects\GitHub\OrgGraph"
```

Codex registration:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
codex mcp add project-memory --env ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT="$PWD" --env ORGUMENTED_PROJECT_MEMORY_PATH="data/project-memory/events.jsonl" -- node "$PWD\packages\project-memory-mcp\dist\index.js"
```

See `docs/runbooks/PROJECT_MEMORY_MCP.md` for operating rules and guardrails.

## 11. Common Troubleshooting

### 11.1 `/perms` returns `unmapped_user`
```bash
npm run sf:export-user-map
```

### 11.2 Readiness points to fixture path instead of retrieved path
```bash
curl -X POST http://localhost:3100/refresh \
  -H 'content-type: application/json' \
  -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'
```

### 11.3 Desktop runtime looks stale after UI or config changes
```bash
pnpm --filter web build
pnpm desktop:build
pnpm desktop:dev
```

## 12. Storage and Drift Operations
```bash
npm run ingest:report
./scripts/phase17-benchmark.sh
```
