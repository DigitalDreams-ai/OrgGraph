# Sandbox Connection Checklist (External Client App OAuth)

## Before Codex Can Run Live Retrieve
- [ ] Confirm target sandbox org and login domain (`https://test.salesforce.com` for sandbox).
- [ ] Create External Client App (Setup -> App Manager -> New External Client App).
- [ ] Enable OAuth and set callback URL (must match `SF_REDIRECT_URI`).
- [ ] Add scopes: `refresh_token`, `api`, `web`.
- [ ] Capture `Client ID` and `Client Secret`.
- [ ] Confirm integration user has metadata retrieve permissions.
- [ ] Confirm NAS can reach Salesforce OAuth/API endpoints.

## Local Secrets & Env on NAS
- [ ] Set `SF_INTEGRATION_ENABLED=true`.
- [ ] Set `SF_AUTH_MODE=oauth_refresh_token`.
- [ ] Set `SF_LOGIN_DOMAIN=https://test.salesforce.com`.
- [ ] Set `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_REDIRECT_URI`.
- [ ] Set `SF_AUTH_CODE_PATH=.secrets/sf-auth-code.txt`.
- [ ] Set `SF_TOKEN_STORE_PATH=.secrets/sf-oauth-token.json`.
- [ ] Ensure `.secrets/` exists.

## One-Time Authorization Code Bootstrap
- [ ] Run `npm run sf:oauth:url`.
- [ ] Open URL, login, approve app, capture `code` from callback URL.
- [ ] Save only the auth code value to `.secrets/sf-auth-code.txt`.
- [ ] Run `npm run sf:oauth:exchange` to create token store JSON.

## First Retrieval (Sandbox)
- [ ] Run `npm run sf:auth` (uses refresh token, rotates access token).
- [ ] Run `npm run sf:retrieve`.
- [ ] Run `npm run sf:retrieve-refresh`.
- [ ] Capture baseline node/edge/evidence counts from response.

## Verification
- [ ] `GET /ready` returns `status=ready`.
- [ ] `GET /perms` returns expected path for known test user/object.
- [ ] `GET /automation` returns expected automations.
- [ ] `GET /impact` returns expected impact paths.
- [ ] `POST /ask` returns deterministic plan + citations.

## Promotion Gate (to Production Org)
- [ ] Sandbox results reviewed and accepted.
- [ ] Manifest scope tuned to avoid noisy retrieval.
- [ ] Rollback plan confirmed.
- [ ] Production credential handling approved.
