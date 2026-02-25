# OrgGraph Cheat Sheet

## Start / Stop
```bash
cd /volume1/data/projects/OrgGraph
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

## Sandbox Retrieve + Refresh
```bash
npm run sf:auth
npm run sf:retrieve
npm run sf:export-user-map
curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'
```

## Query Endpoints
```bash
curl "http://localhost:3100/perms?user=sbingham@shulman-hill.com.uat&object=litify_pm__Intake__c"
curl "http://localhost:3100/automation?object=Opportunity"
curl "http://localhost:3100/impact?field=Opportunity.StageName"
curl -X POST http://localhost:3100/ask -H 'content-type: application/json' -d '{"query":"What touches Opportunity.StageName?"}'
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
npm run phase7:smoke-live
npm run phase7:snapshot
npm run phase7:regression
npm run ingest:report
```

## Fast Fixes
```bash
# Missing perms mapping
npm run sf:export-user-map

# Re-point runtime to sandbox retrieved metadata
curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full"}'

# Rebuild web if unhealthy
docker compose -f docker/docker-compose.yml up -d --build web
```
