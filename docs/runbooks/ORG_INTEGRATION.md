# Org Integration Runbook (Sandbox First)

## Purpose
This runbook connects OrgGraph to a Salesforce sandbox, retrieves metadata, and refreshes graph/evidence from retrieved source.

## Safety Rules
- Use sandbox first. Do not start with production.
- Keep secrets only in `.secrets/` and never commit them.
- Validate endpoint behavior after each retrieve before promoting.

## Required Environment Variables
- `SF_INTEGRATION_ENABLED=true`
- `SF_AUTH_MODE=oauth_refresh_token` (recommended)
- `SF_ALIAS=orggraph-sandbox`
- `SF_PROJECT_PATH=data/sf-project`
- `SF_MANIFEST_PATH=manifest/package.xml`
- `SF_PARSE_PATH=data/sf-project/force-app/main/default`

External Client App OAuth mode:
- `SF_BASE_URL=https://test.salesforce.com` (single switch value for org host)
- `SF_CLIENT_ID=<external-client-app-consumer-key>`
- `SF_CLIENT_SECRET=<external-client-app-consumer-secret>`
- `SF_REDIRECT_URI=<same-callback-url-configured-in-external-client-app>`
- `SF_AUTH_CODE_PATH=.secrets/sf-auth-code.txt`
- `SF_TOKEN_STORE_PATH=.secrets/sf-oauth-token.json`

JWT mode:
- `SF_CLIENT_ID=<connected-app-client-id>`
- `SF_JWT_KEY_PATH=<path-to-server-key>`
- `SF_USERNAME=<integration-user>`

## Initial Setup
1. Ensure `sf` CLI is installed and in `PATH`.
2. Create secrets path:
`mkdir -p .secrets`
3. Create an External Client App in the sandbox org:
- Setup -> App Manager -> New External Client App
- Enable OAuth
- Set callback URL to your `SF_REDIRECT_URI`
- Add scopes: `refresh_token`, `api`, `web`
4. Generate authorize URL:
`npm run sf:oauth:url`
5. Open URL in browser, sign in, capture `code`, and save to:
`.secrets/sf-auth-code.txt`
6. Exchange code for token store:
`npm run sf:oauth:exchange`
7. Confirm retrieve manifest:
`manifest/package.xml`

## Execution Flow
1. Authenticate:
`npm run sf:auth`
2. Retrieve metadata:
`npm run sf:retrieve`
3. Refresh graph/evidence:
`npm run sf:retrieve-refresh`
4. Export org user principal map for `/perms`:
`npm run sf:export-user-map`

Alternative single API trigger:
`POST /org/retrieve` with `{ "runAuth": true, "runRetrieve": true, "autoRefresh": true }`

## Validation Checks
After retrieve + refresh:
1. `GET /ready`
2. `GET /metrics`
3. `GET /perms?user=<known-user>&object=<known-object>`
   - If response includes `mappingStatus=unmapped_user`, run `npm run sf:export-user-map` and retry.
4. `GET /automation?object=<known-object>`
5. `GET /impact?field=<known-object.field>`
6. `POST /ask` with a known query

## LLM Provider Switch (No Rebuild)
To switch between OpenAI and Anthropic quickly:
1. Set provider default in `config/api.docker.json`:
- `LLM_PROVIDER=openai` or `LLM_PROVIDER=anthropic`
2. Keep secrets in `.env`:
- `OPENAI_API_KEY=...`
- `ANTHROPIC_API_KEY=...`
3. Recreate API only (no image rebuild):
`docker compose -f docker/docker-compose.yml up -d --no-deps --force-recreate api`
4. Verify:
`POST /ask` with `{ "mode": "llm_assist" }` and check `llm.provider` + `llm.used`.

## Rollback
If retrieve/refresh fails:
1. Keep previous deployed image and config.
2. Restore known-good `data/orggraph.db` and evidence index backup if needed.
3. Re-run with narrower manifest scope.
