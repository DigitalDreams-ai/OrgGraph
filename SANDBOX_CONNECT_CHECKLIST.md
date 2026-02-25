# Sandbox Connection Checklist (User Actions)

## Before Codex Can Run Live Retrieve
- [ ] Confirm target sandbox org (name + login URL).
- [ ] Choose auth mode:
  - [ ] `sfdx_url` (recommended first run)
  - [ ] `jwt` (for unattended long-term)
- [ ] Provide required credentials/secrets locally on NAS:
  - [ ] `.secrets/sandbox.sfdx-url.txt` (if `sfdx_url`)
  - [ ] Connected app client id + server key + username (if `jwt`)
- [ ] Confirm integration user has metadata retrieve permissions.
- [ ] Confirm whitelist/network policy allows NAS -> Salesforce API.

## Environment Configuration
- [ ] Set `SF_INTEGRATION_ENABLED=true`
- [ ] Set `SF_AUTH_MODE`
- [ ] Set `SF_ALIAS=orggraph-sandbox`
- [ ] Verify `SF_MANIFEST_PATH=manifest/package.xml`
- [ ] Verify `SF_PROJECT_PATH` and `SF_PARSE_PATH`

## First Retrieval (Sandbox)
- [ ] Run `npm run sf:auth`
- [ ] Run `npm run sf:retrieve`
- [ ] Run `npm run sf:retrieve-refresh`
- [ ] Capture output for first-run baseline (node/edge/evidence counts)

## Verification
- [ ] `GET /ready` returns `status=ready`
- [ ] `GET /perms` returns expected path for known test user/object
- [ ] `GET /automation` returns expected automations
- [ ] `GET /impact` returns expected impact paths
- [ ] `POST /ask` returns deterministic plan + citations

## Promotion Gate (to Production Org)
- [ ] Sandbox results reviewed and accepted
- [ ] Manifest scope tuned to avoid noisy retrieval
- [ ] Rollback plan confirmed
- [ ] Production credential handling approved
