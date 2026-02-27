# Org Integration Runbook (Salesforce CLI Keychain)

## Purpose
Connect Orgumented to a Salesforce org using Salesforce CLI keychain sessions only.

## Auth Model
- Single supported auth model: `sf_cli_keychain`
- No OAuth refresh-token flow, SFDX URL flow, or JWT flow in Orgumented runtime

## Required Runtime Settings
- `SF_INTEGRATION_ENABLED=true`
- `SF_ALIAS=orgumented-sandbox` (or your alias)
- `SF_BASE_URL=https://test.salesforce.com` (or org login URL)
- `SF_PROJECT_PATH=data/sf-project`
- `SF_MANIFEST_PATH=manifest/package.xml`
- `SF_PARSE_PATH=data/sf-project/force-app/main/default`

## One-Time Runtime Setup
1. Ensure API runtime has `sf` CLI installed.
2. Ensure keychain paths are persisted in docker compose (`/root/.sf`, `/root/.sfdx`).
3. Authenticate in the same runtime where API executes:
   - `docker exec -it orgumented-api sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default`

## Execution Flow
1. Validate session:
   - `curl http://localhost:3100/org/session`
   - `curl http://localhost:3100/org/preflight`
2. Retrieve metadata:
   - `npm run sf:retrieve`
3. Refresh graph/evidence:
   - `npm run sf:retrieve-refresh`
4. Export user principal map:
   - `npm run sf:export-user-map`

Alternative API trigger:
- `POST /org/retrieve` with `{ "runAuth": true, "runRetrieve": true, "autoRefresh": true }`

## Validation Checks
After retrieve + refresh:
1. `GET /ready`
2. `GET /metrics`
3. `GET /perms?user=<known-user>&object=<known-object>`
4. `GET /automation?object=<known-object>`
5. `GET /impact?field=<known-object.field>`
6. `POST /ask` with known query

## LLM Provider Switch (No Rebuild)
1. Update provider in `config/api.docker.json` (`openai` or `anthropic`).
2. Keep keys in `.env`.
3. Recreate API only:
   - `docker compose -f docker/docker-compose.yml up -d --no-deps --force-recreate api`
4. Verify `/ask` returns expected provider in `llm.provider`.
