# Orgumented Cheat Sheet

## Start / Stop
```bash
cd /volume1/data/projects/Orgumented
docker compose -f docker/docker-compose.yml up -d --build
docker compose -f docker/docker-compose.yml down
```

## Health
```bash
curl http://localhost:3100/health
curl http://localhost:3100/ready
curl http://localhost:3100/ingest/latest
curl http://localhost:3101/api/health
curl http://localhost:3101/api/ready
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
npm run sf:auth
curl http://localhost:3100/org/status
npm run sf:retrieve
npm run sf:export-user-map
curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'
```

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
curl -X POST http://localhost:3101/api/query -H 'content-type: application/json' -d '{"kind":"orgConnect","payload":{}}'
curl http://localhost:3100/org/session
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

## Web Proxy (`/api/query`)
```bash
curl -X POST http://localhost:3101/api/query -H 'content-type: application/json' -d '{"kind":"automation","payload":{"object":"Opportunity"}}'
curl -X POST http://localhost:3101/api/query -H 'content-type: application/json' -d '{"endpoint":"impact","params":{"field":"Opportunity.StageName"}}'
```

## Core Test Commands
```bash
npm exec --yes pnpm@9.12.3 -- --filter api test
npm exec --yes pnpm@9.12.3 -- --filter api build
npm run test:web-smoke
npm run test:ui-smoke
# Optional: run smoke against retrieved org metadata instead of fixtures
WEB_SMOKE_USE_SF_PROJECT=1 npm run test:web-smoke
# Optional: require CCI org auth validation in smoke (sandbox/local operator check)
WEB_SMOKE_REQUIRE_ORG_AUTH=1 npm run test:web-smoke
npm run phase7:smoke-live
npm run phase7:snapshot
npm run phase7:regression
npm run ingest:report
npm exec --yes pnpm@9.12.3 -- --filter api test:phase11-proof
npm exec --yes pnpm@9.12.3 -- --filter api test:phase11-sandbox
npm run phase12:replay-regression
npm run phase12:replay-load
npm run phase13:metrics-export
npm run phase14:drift-report -- latest latest artifacts/phase14-drift-report.json
npm run phase14:drift-gate
./scripts/phase17-benchmark.sh
```

## WebUI Tabs
- `Connect`: auth path + session/alias actions
- `Org Browser`: searchable metadata tree + retrieval cart
- `Refresh`: full/incremental refresh + snapshot diff
- `Analyze`: permissions/automation/impact workflows
- `Ask`: deterministic answer + proof envelope + optional elaboration
- `Simulate`: what-if risk scoring + A/B compare
- `Prove`: proof lookup/replay + metrics/trust dashboard
- `System`: diagnostics, meta-context, action telemetry

## Fast Fixes
```bash
# Missing perms mapping
npm run sf:export-user-map

# Re-point runtime to sandbox retrieved metadata
curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'

# Rebuild web if unhealthy
docker compose -f docker/docker-compose.yml up -d --build web
```
