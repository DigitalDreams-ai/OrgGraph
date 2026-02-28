# Orgumented Usage Guide

## 1. What Orgumented Does
Orgumented builds a deterministic graph from Salesforce metadata and answers:
- Who can edit what (`/perms`)
- What automation runs on an object (`/automation`)
- What might be impacted by a field change (`/impact`)
- Natural-language queries with evidence (`/ask`)

## 2. Runtime Shape
- Product shell: Tauri desktop application
- Embedded UI dev server: `http://localhost:3101`
- Local engine API: `http://localhost:3100`

## 3. Start the Desktop Runtime
Development runtime:
```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
$env:ORGUMENTED_DESKTOP_API_PORT="3200"
$env:ORGUMENTED_DESKTOP_WEB_PORT="3201"
node apps/desktop/scripts/dev-runtime.mjs
```

Standalone desktop shell:
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

## 6. Connect Sandbox Org (Salesforce CLI Keychain)
Auth is delegated to Salesforce CLI keychain sessions.

1. Configure `.env` with org settings (`SF_ALIAS`, `SF_BASE_URL`, etc.).
2. Authenticate locally in the same operator environment that runs Orgumented:
```bash
sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default
sf org display --target-org orgumented-sandbox --json
cci org import orgumented-sandbox <sf-username>
cci org info orgumented-sandbox
```
3. Validate alias session:
```bash
curl http://localhost:3100/org/preflight
curl http://localhost:3100/org/session
curl http://localhost:3100/org/session/aliases
curl "http://localhost:3100/org/session/validate?alias=orgumented-sandbox"
```
4. Run:
```bash
npm run sf:auth
```

## 7. Retrieve and Ingest Sandbox Metadata
Avoid package.xml-all retrieval as default operator behavior.
Use selective retrieval scope where possible.
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

### 7.1 Runtime Org Session Controls
Current runtime session status:
```bash
curl http://localhost:3100/org/session
```

Switch active runtime alias:
```bash
curl -X POST http://localhost:3100/org/session/switch \
  -H 'content-type: application/json' \
  -d '{"alias":"orgumented-sandbox"}'
```

Reconnect/validate auth using the active alias:
```bash
curl -X POST http://localhost:3100/org/retrieve \
  -H 'content-type: application/json' \
  -d '{"runAuth":true,"runRetrieve":false,"autoRefresh":false}'
```
If `runRetrieve=true`, `/org/retrieve` now requires explicit `selections` (same contract as `/org/metadata/retrieve`).

Disconnect active runtime session:
```bash
curl -X POST http://localhost:3100/org/session/disconnect
```

## 8. Query Orgumented

### 8.0 Desktop Product Workflow
The Tauri desktop app uses an embedded workflow-first UI:
- `Connect`
- `Org Browser`
- `Refresh & Build`
- `Analyze`
- `Ask`
- `Proofs & Metrics`
- `System`

Operator flow:
1. Connect alias/session in `Connect`.
2. Browse and select metadata in `Org Browser`.
3. Retrieve selected metadata and refresh graph.
4. Run deterministic checks in `Analyze` and `Ask`.
5. Inspect replay/proof/metrics in `Proofs & Metrics`.

Desktop UI quality gates in this phase include:
- desktop browser screenshot proof: `artifacts/phase25-workflow-ui.png`
- mobile browser screenshot proof: `artifacts/phase25-mobile-ui.png`
- embedded UI smoke script: `npm run test:ui-smoke`

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

### 8.3a Metadata Browser APIs
Refresh/load metadata type summaries (cache-aware):
```bash
curl "http://localhost:3100/org/metadata/catalog?limit=200&refresh=true"
```

Load members for one metadata type (lazy-load path):
```bash
curl "http://localhost:3100/org/metadata/members?type=CustomObject&q=Account&limit=1000"
```

Selective retrieve without package.xml-first flow:
```bash
curl -X POST http://localhost:3100/org/metadata/retrieve \
  -H 'content-type: application/json' \
  -d '{"selections":[{"type":"CustomObject","members":["Account"]}],"autoRefresh":true}'
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
- `llm.tokenUsage`, `llm.estimatedCostUsd`: returned when `llm_assist` executes successfully
- metrics are also persisted over time at `ASK_METRICS_PATH` (default: `data/ask/metrics.jsonl`)

LLM guardrails are enforced with deterministic fallback reasons:
- `ASK_LLM_MAX_LATENCY_MS` (default `12000`)
- `LLM_MAX_OUTPUT_TOKENS` (default `400`, hard cap for output)
- `ASK_LLM_COST_BUDGET_USD` (default `0.02`)

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

## 9. Project Memory MCP

Use this when Codex needs advisory project continuity across many files and moving parts.
It does not participate in `/ask`, proof generation, or runtime truth.

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

Register it in Cursor with the committed `.cursor/mcp.json`.

Register it in Codex with:
```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
codex mcp add project-memory --env ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT="$PWD" --env ORGUMENTED_PROJECT_MEMORY_PATH="data/project-memory/events.jsonl" -- node "$PWD\packages\project-memory-mcp\dist\index.js"
```

Available tools:
- `put_record`
- `append_event`
- `get_record`
- `list_records`
- `mark_stale`
- `link_records`
- `summarize_scope`
- `prune_expired`
- `seed_orgumented_baseline`
- `summarize_orgumented_waves`

Record types supported:
- `work_item`
- `decision_note`
- `repo_map`
- `verification_result`
- `risk_item`
- `handoff_note`
- `runtime_observation`

Orgumented-specific helpers:
- `seed_orgumented_baseline`: seed repo-map records for API runtime, operator surfaces, desktop transition architecture, ontology, and planning.
- `summarize_orgumented_waves`: read `docs/planning/WAVE_A_TASKLIST.md` through `WAVE_G_TASKLIST.md` and return deterministic task/exit-gate counts.

See `docs/runbooks/PROJECT_MEMORY_MCP.md` for operating rules and guardrails.
Export now includes:
- `bySnapshot`: trust and meaning metrics rollups
- `byProvider`: provider/model success, error rate, latency, token, and estimated cost rollups

Replay validation scripts:
```bash
npm run phase12:replay-regression
npm run phase12:replay-load
```

### 8.5 Ask Architecture Decision
```bash
curl -X POST http://localhost:3100/ask/architecture \
  -H 'content-type: application/json' \
  -d '{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName"}'
```

Response includes deterministic engines:
- `engines.permissionBlastRadius`
- `engines.automationCollision`
- `engines.releaseRisk`
- `composite.trustLevel`, `composite.topRiskDrivers`, `composite.replayToken`

### 8.6 Ask Simulation and Compare
```bash
curl -X POST http://localhost:3100/ask/simulate \
  -H 'content-type: application/json' \
  -d '{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName","profile":"balanced","proposedChanges":[{"action":"modify_field","object":"Opportunity","field":"Opportunity.StageName"}]}'

curl -X POST http://localhost:3100/ask/simulate/compare \
  -H 'content-type: application/json' \
  -d '{"scenarioA":{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName","profile":"strict","proposedChanges":[{"action":"modify_field","object":"Opportunity","field":"Opportunity.StageName"}]},"scenarioB":{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName","profile":"exploratory","proposedChanges":[{"action":"modify_field","object":"Opportunity","field":"Opportunity.StageName"},{"action":"add_automation","object":"Opportunity"}]}}'
```

### 8.7 Trust Dashboard
```bash
curl http://localhost:3100/ask/trust/dashboard
```
Includes replay/pass proxy rate, proof coverage, drift snapshot trend, and failure classes.

### 8.8 Meta-Context Adaptation
```bash
curl http://localhost:3100/meta/context
curl -X POST http://localhost:3100/meta/adapt -H 'content-type: application/json' -d '{"dryRun":true}'
curl -X POST http://localhost:3100/meta/adapt -H 'content-type: application/json' -d '{"dryRun":false}'
```

`/meta/adapt` writes deterministic audit artifacts and updates relation multipliers used by analysis ranking.

## 10. Embedded UI Query Proxy
The embedded Next.js proxy supports either `kind` or `endpoint`, and either `payload` or `params`.

```bash
curl -X POST http://localhost:3101/api/query \
  -H 'content-type: application/json' \
  -d '{"kind":"impact","payload":{"field":"Opportunity.StageName"}}'

curl -X POST http://localhost:3101/api/query \
  -H 'content-type: application/json' \
  -d '{"endpoint":"perms","params":{"user":"sbingham@shulman-hill.com.uat","object":"litify_pm__Intake__c"}}'
```

## 11. Common Troubleshooting

### 11.1 `/perms` returns `unmapped_user`
```bash
npm run sf:export-user-map
```
Then retry `/perms`.

### 11.2 Readiness points to fixture path instead of retrieved path
Run live refresh again:
```bash
curl -X POST http://localhost:3100/refresh \
  -H 'content-type: application/json' \
  -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'
```
If refresh state was produced from a different runtime context, `/ready` now automatically falls back to current runtime path resolution.

### 11.3 Embedded UI runtime unhealthy
Restart the desktop runtime and re-run:
```bash
npm run test:web-smoke
```

### 11.4 Validate the desktop-backed flow quickly
```bash
npm run test:web-smoke
# Optional: opt-in to smoke against retrieved org metadata
WEB_SMOKE_USE_SF_PROJECT=1 npm run test:web-smoke
```

## 12. Extended Validation Harness
```bash
npm run phase7:smoke-live
npm run phase7:snapshot
npm run phase7:regression
npm run ingest:report
npm run phase14:drift-report -- latest latest artifacts/phase14-drift-report.json
npm run phase14:drift-gate
./scripts/phase17-benchmark.sh
```

Benchmark output artifact:
- `artifacts/phase17-benchmark.json`
