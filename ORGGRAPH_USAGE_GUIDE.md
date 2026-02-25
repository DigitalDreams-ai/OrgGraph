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

## 8. Query OrgGraph

### 8.1 Permissions
```bash
curl "http://localhost:3100/perms?user=sbingham@shulman-hill.com.uat&object=litify_pm__Intake__c"
curl "http://localhost:3100/perms?user=sbingham@shulman-hill.com.uat&object=litify_pm__Intake__c&field=litify_pm__Intake__c.OwnerId"
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
  -d '{"query":"What touches Opportunity.StageName?"}'
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

### 10.3 Web container unhealthy
Rebuild and restart:
```bash
docker compose -f docker/docker-compose.yml up -d --build web
```

### 10.4 Validate full web flow quickly
```bash
npm run test:web-smoke
```
