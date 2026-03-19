# Org Integration Runbook (Salesforce CLI Keychain)

## Purpose
Connect Orgumented to a Salesforce org using Salesforce CLI keychain sessions only.

Primary direction:
- use local CLI state
- use local alias/session attach flows

## Auth Model
- Single supported auth model: `sf_cli_keychain`
- UI/API session connect validates an existing `sf` keychain alias and bridges to `cci`.

## Required Runtime Settings
- `SF_INTEGRATION_ENABLED=true`
- `SF_ALIAS=orgumented-sandbox` (or your alias)
- `SF_BASE_URL=https://test.salesforce.com` (or org login URL)
- `SF_PROJECT_PATH=data/sf-project`
- `SF_PARSE_PATH=data/sf-project/force-app/main/default`

## One-Time Runtime Setup
1. Ensure the local runtime has `sf` CLI and `cci` installed.
2. Authenticate locally in the same operator environment where Orgumented desktop/runtime will run:
   - `sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default`
3. Bridge the `sf` alias into the local CCI org registry (run from the Orgumented sf-project path):
   - `cd %APPDATA%\Orgumented\sf-project`
   - `cci org import orgumented-sandbox orgumented-sandbox`
4. Validate both tools locally:
   - `sf org display --target-org orgumented-sandbox --json`
   - `cci org info orgumented-sandbox`

## Execution Flow
1. Validate session:
   - `curl http://localhost:3100/org/session`
   - `curl http://localhost:3100/org/session/aliases`
   - `curl "http://localhost:3100/org/session/validate?alias=orgumented-sandbox"`
   - `curl http://localhost:3100/org/preflight`
   - Confirm `cciInstalled=true` and `cciAliasAvailable=true`
2. Retrieve metadata using selectors:
   - `npm run sf:retrieve`
   - Optional selector override:
     - `SF_RETRIEVE_SELECTORS='CustomObject:Account,Flow,PermissionSet' npm run sf:retrieve`
3. Refresh graph/evidence:
   - `npm run sf:retrieve-refresh`
   - Or explicitly rebaseline after switching from fixtures to retrieved org metadata:
     - `curl -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{"fixturesPath":"data/sf-project/force-app/main/default","mode":"full","rebaseline":true}'`
4. Export user principal map:
   - `npm run sf:export-user-map`

Alternative API trigger (`/org/retrieve` now requires explicit selections when `runRetrieve=true`):
- `POST /org/retrieve` with
  - `{ "runAuth": true, "runRetrieve": true, "autoRefresh": true, "selections": [{ "type": "CustomObject", "members": ["Account"] }] }`
- Or use dedicated selective path:
  - `POST /org/metadata/retrieve` with
    - `{ "selections": [{ "type": "CustomObject", "members": ["Account"] }], "autoRefresh": true }`

Session connect API (no retrieve):
- `POST /org/session/connect` body:
  - `{ "alias":"orgumented-sandbox" }`

## Validation Checks
After retrieve + refresh:
1. `GET /ready`
   - Expect `checks.fixtures.sourcePath=/app/data/sf-project/force-app/main/default`
2. `GET /metrics`
3. `GET /perms?user=<known-user>&object=<known-object>`
4. `GET /automation?object=<known-object>`
5. `GET /impact?field=<known-object.field>`
6. `POST /ask` with known query
