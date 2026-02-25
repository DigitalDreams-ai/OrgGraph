# Org Integration Runbook (Sandbox First)

## Purpose
This runbook connects OrgGraph to a Salesforce sandbox, retrieves metadata, and refreshes graph/evidence from retrieved source.

## Safety Rules
- Use sandbox first. Do not start with production.
- Keep secrets only in `.secrets/` and never commit them.
- Validate endpoint behavior after each retrieve before promoting.

## Required Environment Variables
- `SF_INTEGRATION_ENABLED=true`
- `SF_AUTH_MODE=sfdx_url` or `jwt`
- `SF_ALIAS=orggraph-sandbox`
- `SF_PROJECT_PATH=data/sf-project`
- `SF_MANIFEST_PATH=manifest/package.xml`
- `SF_PARSE_PATH=data/sf-project/force-app/main/default`

SFDX URL mode:
- `SF_AUTH_URL_PATH=.secrets/sandbox.sfdx-url.txt`

JWT mode:
- `SF_CLIENT_ID=<connected-app-client-id>`
- `SF_JWT_KEY_PATH=<path-to-server-key>`
- `SF_USERNAME=<integration-user>`
- `SF_INSTANCE_URL=https://test.salesforce.com`

## Initial Setup
1. Ensure `sf` CLI is installed and in `PATH`.
2. Create secrets path:
`mkdir -p .secrets`
3. Add credentials for selected auth mode.
4. Confirm retrieve manifest:
`manifest/package.xml`

## Execution Flow
1. Authenticate:
`npm run sf:auth`
2. Retrieve metadata:
`npm run sf:retrieve`
3. Refresh graph/evidence:
`npm run sf:retrieve-refresh`

Alternative single API trigger:
`POST /org/retrieve` with `{ "runAuth": true, "runRetrieve": true, "autoRefresh": true }`

## Validation Checks
After retrieve + refresh:
1. `GET /ready`
2. `GET /metrics`
3. `GET /perms?user=<known-user>&object=<known-object>`
4. `GET /automation?object=<known-object>`
5. `GET /impact?field=<known-object.field>`
6. `POST /ask` with a known query

## Rollback
If retrieve/refresh fails:
1. Keep previous deployed image and config.
2. Restore known-good `data/orggraph.db` and evidence index backup if needed.
3. Re-run with narrower manifest scope.
