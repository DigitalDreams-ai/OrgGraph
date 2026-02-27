# Org Integration Runbook (Salesforce CLI Keychain)

## Purpose
Connect Orgumented to a Salesforce org using Salesforce CLI keychain sessions only.

## Auth Model
- Single supported auth model: `sf_cli_keychain`
- UI/API session connect supports three keychain-backed bootstrap inputs:
  - `sfdxAuthUrl`
  - `accessToken + instanceUrl`
  - `frontdoorUrl` (magic link with `sid`)
- JWT flow is not implemented.

## Required Runtime Settings
- `SF_INTEGRATION_ENABLED=true`
- `SF_ALIAS=orgumented-sandbox` (or your alias)
- `SF_BASE_URL=https://test.salesforce.com` (or org login URL)
- `SF_PROJECT_PATH=data/sf-project`
- `SF_PARSE_PATH=data/sf-project/force-app/main/default`

## One-Time Runtime Setup
1. Ensure API runtime has `sf` CLI and `cci` installed.
2. Ensure keychain paths are persisted in docker compose (`/root/.sf`, `/root/.sfdx`).
3. Authenticate in the same runtime where API executes:
   - `docker exec -it orgumented-api sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default`
4. Bridge sf alias into CCI org registry:
   - `docker exec orgumented-api cci org import orgumented-sandbox <sf-username>`

## Execution Flow
1. Validate session:
   - `curl http://localhost:3100/org/session`
   - `curl http://localhost:3100/org/preflight`
   - Confirm `cciInstalled=true` and `cciAliasAvailable=true`
2. Retrieve metadata using selectors:
   - `npm run sf:retrieve`
   - Optional selector override:
     - `SF_RETRIEVE_SELECTORS='CustomObject:Account,Flow,PermissionSet' npm run sf:retrieve`
3. Refresh graph/evidence:
   - `npm run sf:retrieve-refresh`
4. Export user principal map:
   - `npm run sf:export-user-map`

Alternative API trigger (`/org/retrieve` now requires explicit selections when `runRetrieve=true`):
- `POST /org/retrieve` with
  - `{ "runAuth": true, "runRetrieve": true, "autoRefresh": true, "selections": [{ "type": "CustomObject", "members": ["Account"] }] }`
- Or use dedicated selective path:
  - `POST /org/metadata/retrieve` with
    - `{ "selections": [{ "type": "CustomObject", "members": ["Account"] }], "autoRefresh": true }`

Session connect API (no retrieve):
- `POST /org/session/connect` body examples:
  - `{ "alias":"orgumented-sandbox", "sfdxAuthUrl":"force://..." }`
  - `{ "alias":"orgumented-sandbox", "accessToken":"00D...!AQEA...", "instanceUrl":"https://...salesforce.com" }`
  - `{ "alias":"orgumented-sandbox", "frontdoorUrl":"https://.../secur/frontdoor.jsp?sid=..." }`

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
