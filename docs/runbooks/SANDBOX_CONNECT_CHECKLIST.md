# Sandbox Connection Checklist (Salesforce CLI Keychain)

## 1) Runtime prerequisites
- [ ] `sf` CLI available in API runtime (`docker exec orgumented-api sf --version`)
- [ ] API container running and healthy
- [ ] keychain volumes mounted (`/root/.sf`, `/root/.sfdx`)

## 2) Environment baseline
- [ ] `SF_INTEGRATION_ENABLED=true`
- [ ] `SF_ALIAS=orgumented-sandbox` (or target alias)
- [ ] `SF_BASE_URL=https://test.salesforce.com` (or org login URL)

## 3) Authenticate alias in runtime
- [ ] Run:
  - `docker exec -it orgumented-api sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default`
- [ ] Verify:
  - `docker exec orgumented-api sf org display --target-org orgumented-sandbox --json`

## 4) Validate Orgumented session
- [ ] `curl http://localhost:3100/org/preflight`
- [ ] `curl http://localhost:3100/org/session`
- [ ] Confirm `aliasAuthenticated=true` and session `connected`

## 5) Retrieve + refresh
- [ ] `npm run sf:retrieve`
- [ ] `npm run sf:retrieve-refresh`

## 6) Verify behavior
- [ ] `curl http://localhost:3100/ready`
- [ ] `npm run sf:export-user-map`
- [ ] `/perms` known-positive validation
- [ ] `/automation` known-positive validation
- [ ] `/impact` known-positive validation
- [ ] `/ask` known-positive validation
