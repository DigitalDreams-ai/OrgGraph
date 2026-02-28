# Orgumented Cheat Sheet

## Start / Stop
Desktop development runtime:
```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
$env:ORGUMENTED_DESKTOP_API_PORT="3200"
$env:ORGUMENTED_DESKTOP_WEB_PORT="3201"
node apps/desktop/scripts/dev-runtime.mjs
```

Optional runtime flags:
```powershell
$env:ORGUMENTED_DESKTOP_WEB_MODE="development"
$env:ORGUMENTED_DESKTOP_WEB_REBUILD="1"
```

Standalone desktop shell:
```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:dev
```

Packaged desktop build:
```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:build
```

Packaged runtime expectation:
- `desktop:build` stages a bundled runtime under `apps/desktop/src-tauri/runtime/`
- release shell launches with bundled static UI assets and bundled API runtime

Desktop launch expectation:
- app opens on `Ask`
- use `Org Sessions` to connect/switch aliases
- use `Raw JSON Inspector` only for secondary payload inspection

## Health
```bash
curl http://localhost:3100/health
curl http://localhost:3100/ready
curl http://localhost:3100/ingest/latest
curl http://localhost:3100/org/session/aliases
curl "http://localhost:3100/org/session/validate?alias=orgumented-sandbox"
curl http://localhost:3100/org/status
```

## Local Fixture Refresh
```bash
curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{}'
```
Response includes `snapshotId`, `semanticDiff`, `meaningChangeSummary`, `driftPolicy`, `driftEvaluation`.

## Snapshot Drift Diff
```bash
curl "http://localhost:3100/refresh/diff/<snapshotA>/<snapshotB>"
```

## Sandbox Retrieve + Refresh
```bash
sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default
sf org display --target-org orgumented-sandbox --json
cci org import orgumented-sandbox <sf-username>
cci org info orgumented-sandbox
npm run sf:auth
curl http://localhost:3100/org/status
npm run sf:retrieve
npm run sf:export-user-map
curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full","rebaseline":true}'
curl http://localhost:3100/ready
```

Current attach rule:
- `sf` keychain auth is sufficient for `org/session/connect`
- `cci` import failures are warnings, not attach blockers

## Enable Staged UI Metadata Ingestion
```bash
INGEST_UI_METADATA_ENABLED=true curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'
```

## Query Endpoints
```bash
curl "http://localhost:3100/perms?user=sbingham@shulman-hill.com.uat&object=litify_pm__Intake__c"
curl "http://localhost:3100/perms/system?user=sbingham@shulman-hill.com.uat&permission=ApproveUninstalledConnectedApps"
curl "http://localhost:3100/automation?object=Opportunity"
curl "http://localhost:3100/impact?field=Opportunity.StageName"
curl -X POST http://localhost:3100/ask -H 'content-type: application/json' -d '{"query":"What touches Opportunity.StageName?"}'
curl -X POST http://localhost:3100/ask/architecture -H 'content-type: application/json' -d '{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName"}'
curl -X POST http://localhost:3100/ask/simulate -H 'content-type: application/json' -d '{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName","profile":"balanced","proposedChanges":[{"action":"modify_field","object":"Opportunity","field":"Opportunity.StageName"}]}'
curl -X POST http://localhost:3100/ask/simulate/compare -H 'content-type: application/json' -d '{"scenarioA":{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName","profile":"strict","proposedChanges":[{"action":"modify_field","object":"Opportunity","field":"Opportunity.StageName"}]},"scenarioB":{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName","profile":"exploratory","proposedChanges":[{"action":"modify_field","object":"Opportunity","field":"Opportunity.StageName"},{"action":"add_automation","object":"Opportunity"}]}}'
curl http://localhost:3100/org/session
curl http://localhost:3100/org/session/aliases
curl "http://localhost:3100/org/session/validate?alias=orgumented-sandbox"
curl -X POST http://localhost:3100/org/session/connect -H 'content-type: application/json' -d '{"alias":"orgumented-sandbox"}'
curl -X POST http://localhost:3100/org/session/switch -H 'content-type: application/json' -d '{"alias":"orgumented-sandbox"}'
curl -X POST http://localhost:3100/org/session/disconnect
curl "http://localhost:3100/org/metadata/catalog?q=opportunity&limit=50&refresh=true"
curl "http://localhost:3100/org/metadata/members?type=CustomObject&q=Account&limit=1000"
curl -X POST http://localhost:3100/org/metadata/retrieve -H 'content-type: application/json' -d '{"selections":[{"type":"CustomObject","members":["Account"]}],"autoRefresh":true}'
curl http://localhost:3100/meta/context
curl -X POST http://localhost:3100/meta/adapt -H 'content-type: application/json' -d '{"dryRun":true}'
curl -X POST http://localhost:3100/meta/adapt -H 'content-type: application/json' -d '{"dryRun":false}'
curl "http://localhost:3100/ask/proof/<proofId>"
curl -X POST http://localhost:3100/ask/replay -H 'content-type: application/json' -d '{"replayToken":"<replayToken>"}'
curl -X POST http://localhost:3100/ask -H 'content-type: application/json' -d '{"query":"What touches Opportunity.StageName?","traceLevel":"full","mode":"deterministic"}'
curl -X POST http://localhost:3100/ask/policy/validate -H 'content-type: application/json' -d '{"groundingThreshold":0.7,"constraintThreshold":0.9,"ambiguityMaxThreshold":0.45,"dryRun":true}'
curl http://localhost:3100/ask/metrics/export
curl http://localhost:3100/ask/trust/dashboard
```

## Core Test Commands
```bash
npm exec --yes pnpm@9.12.3 -- --filter api test
npm exec --yes pnpm@9.12.3 -- --filter api build
pnpm --filter web build
pnpm desktop:info
pnpm desktop:build
pnpm desktop:dev
npm run ingest:report
npm run phase12:replay-regression
npm run phase12:replay-load
npm run phase13:metrics-export
npm run phase14:drift-report -- latest latest artifacts/phase14-drift-report.json
npm run phase14:drift-gate
./scripts/phase17-benchmark.sh
npm run mcp:project-memory
pnpm --filter @orgumented/project-memory-mcp test
```

## Desktop App Workspaces
- `Ask`: deterministic answer packet and follow-up actions
- `Org Sessions`: auth path plus alias discovery, attach, and switching
- `Org Browser`: searchable metadata tree and retrieval cart
- `Refresh & Build`: retrieval, refresh, drift, and rebuild status
- `Explain & Analyze`: permissions, automation, and impact workflows
- `Proofs & History`: proof lookup, replay, and trust history
- `Settings & Diagnostics`: runtime status, logs, and meta-context controls

## Fast Fixes
```bash
# Missing perms mapping
npm run sf:export-user-map

# Re-point runtime to sandbox retrieved metadata
curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full","rebaseline":true}'

# Restart the standalone desktop shell after UI changes
pnpm desktop:dev

# Verify packaged shell runtime locally
pnpm desktop:build
apps/desktop/src-tauri/target/release/orgumented-desktop.exe
curl http://localhost:3100/ready
```

## Project Memory MCP
```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm --filter @orgumented/project-memory-mcp build
npm run mcp:project-memory
```

Optional env:
```powershell
$env:ORGUMENTED_PROJECT_MEMORY_PATH="data/project-memory/events.jsonl"
$env:ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT="$env:USERPROFILE\Projects\GitHub\OrgGraph"
```

Cursor project config is committed at `.cursor/mcp.json`.

Codex registration:
```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
codex mcp add project-memory --env ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT="$PWD" --env ORGUMENTED_PROJECT_MEMORY_PATH="data/project-memory/events.jsonl" -- node "$PWD\packages\project-memory-mcp\dist\index.js"
```

Orgumented-specific tools:
- `seed_orgumented_baseline`
- `summarize_orgumented_waves`
