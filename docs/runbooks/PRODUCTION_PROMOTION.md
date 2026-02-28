# Production Promotion Gate

## Purpose
Define the go/no-go process for promoting Orgumented from sandbox metadata to production org metadata.

## Go / No-Go Criteria
- `GET /ready` is `status=ready` and source path points to retrieved org metadata.
- `npm run phase7:smoke-live` passes on sandbox.
- `npm run phase7:regression` passes against baseline snapshot threshold.
- `/perms`, `/automation`, `/impact`, `/ask` have at least one known-positive and one known-negative validation case reviewed.
- No new parser warnings that materially change operator conclusions.

## Pre-Promotion Checklist
1. Run promotion dry-run:
`npm run phase8:promotion-dry-run`
2. Create restore point:
`npm run phase8:restore-point:create`
3. Capture baseline snapshot:
`npm run phase7:snapshot`
4. Validate latest ingest summary:
`npm run ingest:report`
5. Confirm secrets are current and scoped:
`SF_ALIAS`, `SF_BASE_URL`, and Salesforce CLI keychain session for alias
6. Confirm rollback artifacts exist in `data/refresh/restore-points/<stamp>`
7. Confirm operator sign-off on validation outputs and append promotion log:
`ORGUMENTED_OPERATOR=<name> npm run phase8:promotion-log -- promoted`

## Rollback Procedure
1. Stop the local desktop runtime.
2. Restore known-good snapshot:
`npm run phase8:restore-point:apply -- <restore-point-stamp>`
3. Restart the desktop runtime from the previous known-good commit.
4. Verify:
- `GET /ready`
- `GET /perms` known-positive check

## Secrets Rotation Procedure
1. Keep `.env` auth config minimal and explicit:
- `SF_ALIAS=<org-alias>`
- `SF_BASE_URL=<instance-url>`
2. Authenticate alias in runtime using Salesforce CLI keychain:
- `sf org login web --alias <alias> --instance-url <url> --set-default`
3. Verify runtime session:
- `sf org display --target-org <alias> --json`
4. Run live smoke:
`npm run phase7:smoke-live`

## Production Cadence
- Manual cadence (recommended now): run retrieve + refresh on demand before major analysis sessions.
- Optional scheduled cadence (later): daily retrieve + incremental refresh with alerting on regression threshold failures.

## Retention + Alerts
- Prune restore-point and promotion-log artifacts:
`ORGUMENTED_RETENTION_DAYS=30 npm run phase8:retention-prune`
- Optional alert hook for smoke/regression scripts:
`ORGUMENTED_ALERT_WEBHOOK_URL=https://...`

## Monthly Accuracy Review
1. Select 10-20 representative business questions.
2. Run `/perms`, `/automation`, `/impact`, `/ask` and store artifacts.
3. Record precision findings and parser warning trends.
4. Create follow-up issues for ontology/parsing improvements before next promotion.
