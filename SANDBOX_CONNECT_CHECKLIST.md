# Sandbox Connection Checklist (External Client App OAuth)

## 1) Create External Client App in Salesforce Sandbox
- [x] In Sandbox org: Setup -> App Manager -> New External Client App.
- [x] Enable OAuth.
- [x] Set callback URL (must exactly match `SF_REDIRECT_URI`).
- [x] Add OAuth scopes: `refresh_token`, `api`, `web`.
- [x] Save and capture `Client ID` and `Client Secret`.

## 2) Configure NAS Environment
- [x] Confirm login domain: `https://test.salesforce.com`.
- [x] Set `SF_BASE_URL` to the org host you want to target (quick switch variable).
- [x] Set `SF_INTEGRATION_ENABLED=true`.
- [x] Set `SF_AUTH_MODE=oauth_refresh_token`.
- [x] Set `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_REDIRECT_URI`.
- [x] Set `SF_AUTH_CODE_PATH=.secrets/sf-auth-code.txt`.
- [x] Set `SF_TOKEN_STORE_PATH=.secrets/sf-oauth-token.json`.
- [x] Ensure `.secrets/` exists.

## 3) Authorize User and Capture Auth Code
- [x] Generate URL with `npm run sf:oauth:url`.
- [ ] Confirm URL format is:
- [ ] `https://{loginDomain}/services/oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&state=...`
- [x] Open URL, log in, approve app, copy `code` from redirect.
- [x] Save only the code value to `.secrets/sf-auth-code.txt`.

## 4) Exchange Auth Code for Tokens
- [x] Run `npm run sf:oauth:exchange`.
- [ ] Confirm request target is:
- [ ] `POST https://{loginDomain}/services/oauth2/token`
- [ ] Confirm payload includes:
- [ ] `grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, `code`.
- [x] Confirm `.secrets/sf-oauth-token.json` contains `access_token`, `refresh_token`, `instance_url`.

## 5) Use and Refresh Tokens
- [x] Run `npm run sf:auth` (uses `grant_type=refresh_token` and rotates access token).
- [ ] Confirm API calls use `Authorization: Bearer {access_token}`.
- [x] Confirm refresh flow works after access token expiry.

## 6) Run Retrieve + Refresh Pipeline
- [x] Run `npm run sf:retrieve`.
- [x] Run `npm run sf:retrieve-refresh`.
- [x] Capture baseline node/edge/evidence counts.

## 7) Verify OrgGraph Endpoints
- [x] `GET /ready` returns `status=ready`.
- [ ] `GET /perms` returns expected path for known test user/object.
- [x] `GET /automation` returns expected automations.
- [x] `GET /impact` returns expected impact paths.
- [x] `POST /ask` returns deterministic plan + citations.

## 8) Promotion Gate
- [ ] Sandbox results reviewed and accepted.
- [ ] Manifest scope tuned to avoid noisy retrieval.
- [ ] Rollback plan confirmed.
- [ ] Production credential handling approved.
