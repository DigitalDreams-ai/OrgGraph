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
Packaged desktop builds now stage a static embedded UI and a bundled local API runtime instead of depending on a live Next route layer at release time.

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

Build the packaged desktop app:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:build
```

Packaged build behavior:
- stages runtime assets under `apps/desktop/src-tauri/runtime/`
- bundles:
  - static UI assets
  - deployed API runtime
  - bundled `node.exe`
  - `config.json` with non-secret Salesforce runtime config snapshot from `.env` plus build-shell overrides
- emits:
  - `apps/desktop/src-tauri/target/release/orgumented-desktop.exe`
  - `apps/desktop/src-tauri/target/release/bundle/msi/Orgumented_0.1.0_x64_en-US.msi`
  - `apps/desktop/src-tauri/target/release/bundle/nsis/Orgumented_0.1.0_x64-setup.exe`

Run the packaged desktop smoke:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:smoke:release
```

The packaged smoke validates:
- shell launch
- bundled API health and readiness
- deterministic Ask proof generation
- live org status retrieval
- alias inventory capture
- session attach proof when local aliases are available

Optional deeper packaged auth proof:

```powershell
$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH="1"
$env:ORGUMENTED_DESKTOP_SMOKE_ALIAS="orgumented-sandbox"
$env:ORGUMENTED_DESKTOP_SMOKE_SWITCH_ALIAS="orgumented-uat"
pnpm desktop:smoke:release
```

Rules:
- `ORGUMENTED_DESKTOP_SMOKE_ALIAS` forces the alias used for packaged attach proof
- `ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH=1` enables packaged alias-switch verification
- `ORGUMENTED_DESKTOP_SMOKE_SWITCH_ALIAS` picks the switch target instead of auto-selecting another discovered alias
- the smoke restores the original session alias or disconnected state before exit
- packaged auth proof requires `SF_INTEGRATION_ENABLED=true` in `.env`, `.env.local`, or the build shell used for `desktop:build`

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
2. Use `Org Sessions` to refresh overview, inspect alias readiness, and connect or switch the active alias.
3. Use `Org Browser` to build the retrieve cart from visible types and members, then move into `Refresh & Build` to ingest and review drift.
4. Return to `Ask` or `Explain & Analyze` for decision work.
5. Use `Proofs & History` for replay and prior decision lookup.

Current Ask-first behavior:
- the desktop app opens on `Ask`
- raw JSON is available only through the `Raw JSON Inspector`
- the default answer shape is a decision packet, not a raw endpoint payload
- review decision packets expose explicit risk score and evidence-coverage signals in the primary card view

Current `Proofs & History` behavior:
- recent proof history loads directly in the workspace as labeled decision entries
- opening a history entry makes that labeled artifact the active proof context
- proof lookup shows structured artifact details instead of requiring raw JSON inspection
- replay shows parity status for:
  - `matched`
  - `corePayloadMatched`
  - `metricsMatched`
- metrics export shows summary counts by snapshot and provider
- raw `proofId` and `replayToken` fields remain available only as an advanced fallback for debugging

Current `Org Sessions` behavior:
- `Refresh Overview` re-syncs tool status, session state, alias inventory, and preflight in one pass
- the selected alias shows readiness state directly in the workspace
- preflight blockers and remediation are listed directly in the desktop UI
- recent auth/session events are listed directly in the workspace
- `Restore Last Session` reconnects the most recent disconnected alias without manual re-selection
- discovered aliases support:
  - select
  - inspect
  - connect
  - switch

Current retrieval handoff behavior:
- `Org Browser` shows the active alias, visible catalog counts, a structured retrieve cart, and the last selected-retrieve result
- `Org Browser` now auto-loads the explorer on first open and prefers live org metadata discovery before any local parse tree has been seeded
- families and individual metadata items use the same checkbox selection model in both grouped search results and family browse
- checking a family row stages that family for retrieve; checking an item row stages just that item
- expanding a family row auto-loads nested members for tree-style browsing
- browser actions now use checked-selection language:
  - `Search Names`
  - `Refresh Explorer`
  - `Load Visible Items`
  - `Retrieve Checked`
- selected types and members are still removable directly in the workspace
- the JSON cart payload remains available only as an advanced read-only preview
- `Open Refresh & Build` moves directly from metadata selection into rebuild and drift review
- `Refresh & Build` keeps the latest Browser retrieve visible as the current rebuild handoff instead of dropping that context at the tab switch
- the latest retrieve handoff and checked selections persist across desktop relaunch so staged rebuild context is preserved
- retrieve handoff now fails closed when the handoff alias does not match the current active alias
- Browser retrieve `autoRefresh` now seeds the default rebuild intent inside `Refresh & Build`
- `Refresh & Build` shows the staged workflow chain for:
  - Browser retrieve
  - Refresh
  - Diff
  - Org retrieve
- `Refresh & Build` shows structured summaries for:
  - latest browser handoff
  - latest refresh
  - latest drift diff
  - latest org-retrieve pipeline

Current `Explain & Analyze` behavior:
- `Permissions` shows access verdict, principals checked, deterministic permission paths, and mapping warnings
- `Diagnose User Mapping` surfaces map freshness, resolved principals, and stale-map warnings in the workspace
- `Automation` shows matched automations, relation coverage, and confidence-scored evidence
- `Impact` shows deterministic impact paths, relation coverage, and score/confidence summaries
- `System Permission` shows grant verdict, mapping status, and grant paths without requiring raw JSON inspection
- the `Raw JSON Inspector` remains available only as a secondary debugging surface

Current `Settings & Diagnostics` behavior:
- runtime health and readiness appear as structured workspace summaries
- org tooling status shows:
  - integration enabled
  - auth mode
  - `sf` installation
  - `cci` installation
  - current alias/session state
- `Meta Context` shows:
  - relation multipliers
  - metrics sample size
  - trusted/refused intent breakdown
- `Meta Adapt` shows the latest run as a before/after summary with context and audit artifact paths
- the `Raw JSON Inspector` remains available only as a secondary debugging surface

## 6. Connect a Sandbox Org
Auth is delegated to Salesforce CLI keychain sessions.

1. Configure `.env` with org settings such as `SF_INTEGRATION_ENABLED=true`, `SF_ALIAS`, and `SF_BASE_URL`.
2. Authenticate locally in the same operator environment that runs Orgumented:

```bash
sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default
sf org display --target-org orgumented-sandbox --json
cd %APPDATA%\Orgumented\sf-project
cci org import orgumented-sandbox orgumented-sandbox
cci org info orgumented-sandbox
```

`sf` keychain auth is the attach requirement.
`cci` remains useful for org tasks and diagnostics, but failed `cci org import` no longer blocks desktop session attach.

3. Validate and attach the alias:

```bash
curl http://localhost:3100/org/preflight
curl http://localhost:3100/org/session
curl http://localhost:3100/org/session/aliases
curl "http://localhost:3100/org/session/history?limit=10"
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
pnpm desktop:smoke:release
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

### 11.4 Packaged desktop runtime verification
```bash
pnpm desktop:build
apps/desktop/src-tauri/target/release/orgumented-desktop.exe
curl http://localhost:3100/ready
```

## 12. Storage and Drift Operations
```bash
npm run ingest:report
pnpm phase17:benchmark
pnpm phase17:benchmark:human:reset
pnpm phase17:benchmark:human:session -- --operator "<name>"
pnpm phase17:benchmark:human:prepare -- --operator "<name>"
pnpm phase17:benchmark:human -- --capture-template logs/high-risk-review-human-capture-template.json --operator "<name>" --baseline-time-ms <ms> --baseline-evidence-steps <n> --baseline-workspace-switches <n> --baseline-raw-json yes --baseline-confidence <1-5> --review-time-ms <ms> --review-evidence-steps <n> --review-workspace-switches <n> --review-raw-json no --review-confidence <1-5>
```

`phase17:benchmark` now targets the active v2 benchmark workflow:
- it compares the fragmented baseline review path against the typed high-risk review packet path
- it writes proxy timing and deterministic replay evidence to `logs/high-risk-review-benchmark.json`
- it auto-launches the packaged desktop runtime if no local API is already ready
- `phase17:benchmark:human:reset` archives stale benchmark artifacts out of the default `logs/` paths before a real operator run starts
- `phase17:benchmark:human:session` runs the grounded desktop smoke, refreshes the proxy benchmark, writes the human capture packet, and prints the exact capture command for the operator
- `phase17:benchmark:human:prepare` writes a fillable capture packet with proof/replay anchors, a proxy-artifact hash, and threshold reminders
- `phase17:benchmark:human` records the operator-observed timing, confidence, raw-JSON dependence, and pass/fail result, and now fails closed unless it is tied to the prepared capture template for the same query and proxy artifact
- `phase17:benchmark:human:finalize` is the preferred closeout path because it publishes canonical results and immediately verifies that the published surface still matches the real human artifact provenance
- `phase17:benchmark:human:verify` fails closed unless the human artifact is real, passed, and still matches the canonical published benchmark results
- `phase17:benchmark:human:status` reports whether Stage 1 human evidence is still missing, synthetic-only, unverified, or fully verified
- the full operator walkthrough lives in `docs/runbooks/HUMAN_BENCHMARK_CAPTURE.md`
