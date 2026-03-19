# Sandbox Connection Checklist (Salesforce CLI Keychain)

## 1) Local runtime prerequisites
- [ ] `sf` CLI available locally (`sf --version`)
- [ ] `cci` available locally (`cci version`)
- [ ] local API runtime running and healthy
- [ ] alias can be displayed locally (`sf org display --target-org <alias> --json`)

## 2) Environment baseline
- [ ] `SF_INTEGRATION_ENABLED=true`
- [ ] `SF_ALIAS=orgumented-sandbox` (or target alias)
- [ ] `SF_BASE_URL=https://test.salesforce.com` (or org login URL)

## 3) Authenticate alias locally
- [ ] Run:
  - `sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default`
- [ ] Verify:
  - `sf org display --target-org orgumented-sandbox --json`
- [ ] Import alias into cci (run from Orgumented sf-project path):
  - `cd %APPDATA%\Orgumented\sf-project`
  - `cci org import orgumented-sandbox orgumented-sandbox`
- [ ] Verify cci alias:
  - `cci org info orgumented-sandbox`

## 4) Validate Orgumented session
- [ ] `curl http://localhost:3100/org/preflight`
- [ ] `curl http://localhost:3100/org/session`
- [ ] `curl http://localhost:3100/org/session/aliases`
- [ ] `curl "http://localhost:3100/org/session/validate?alias=orgumented-sandbox"`
- [ ] Confirm `aliasAuthenticated=true`, `cciAliasAvailable=true`, and session `connected`

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

## 7) Legacy note
