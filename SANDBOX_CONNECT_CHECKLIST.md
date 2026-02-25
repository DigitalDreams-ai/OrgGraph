# Sandbox Connection Checklist (External Client App OAuth)

## 1) Create External Client App in Salesforce Sandbox
- [ ] In Sandbox org: Setup -> App Manager -> New External Client App.
- [ ] Enable OAuth.
- [ ] Set callback URL (must exactly match `SF_REDIRECT_URI`).
- [ ] Add OAuth scopes: `refresh_token`, `api`, `web`.
- [ ] Save and capture `Client ID` and `Client Secret`.

## 2) Configure NAS Environment
- [ ] Confirm login domain: `https://test.salesforce.com`.
- [ ] Set `SF_BASE_URL` to the org host you want to target (quick switch variable).
- [ ] Set `SF_INTEGRATION_ENABLED=true`.
- [ ] Set `SF_AUTH_MODE=oauth_refresh_token`.
- [ ] Set `SF_LOGIN_DOMAIN=https://test.salesforce.com`.
- [ ] Set `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_REDIRECT_URI`.
- [ ] Set `SF_AUTH_CODE_PATH=.secrets/sf-auth-code.txt`.
- [ ] Set `SF_TOKEN_STORE_PATH=.secrets/sf-oauth-token.json`.
- [ ] Ensure `.secrets/` exists.

## 3) Authorize User and Capture Auth Code
- [ ] Generate URL with `npm run sf:oauth:url`.
- [ ] Confirm URL format is:
- [ ] `https://{loginDomain}/services/oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&state=...`
- [ ] Open URL, log in, approve app, copy `code` from redirect.
- [ ] Save only the code value to `.secrets/sf-auth-code.txt`.

## 4) Exchange Auth Code for Tokens
- [ ] Run `npm run sf:oauth:exchange`.
- [ ] Confirm request target is:
- [ ] `POST https://{loginDomain}/services/oauth2/token`
- [ ] Confirm payload includes:
- [ ] `grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, `code`.
- [ ] Confirm `.secrets/sf-oauth-token.json` contains `access_token`, `refresh_token`, `instance_url`.

## 5) Use and Refresh Tokens
- [ ] Run `npm run sf:auth` (uses `grant_type=refresh_token` and rotates access token).
- [ ] Confirm API calls use `Authorization: Bearer {access_token}`.
- [ ] Confirm refresh flow works after access token expiry.

## 6) Run Retrieve + Refresh Pipeline
- [ ] Run `npm run sf:retrieve`.
- [ ] Run `npm run sf:retrieve-refresh`.
- [ ] Capture baseline node/edge/evidence counts.

## 7) Verify OrgGraph Endpoints
- [ ] `GET /ready` returns `status=ready`.
- [ ] `GET /perms` returns expected path for known test user/object.
- [ ] `GET /automation` returns expected automations.
- [ ] `GET /impact` returns expected impact paths.
- [ ] `POST /ask` returns deterministic plan + citations.

## 8) Promotion Gate
- [ ] Sandbox results reviewed and accepted.
- [ ] Manifest scope tuned to avoid noisy retrieval.
- [ ] Rollback plan confirmed.
- [ ] Production credential handling approved.
