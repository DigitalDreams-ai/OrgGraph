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
`SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_TOKEN_STORE_PATH`
6. Confirm rollback artifacts exist in `data/refresh/restore-points/<stamp>`
7. Confirm operator sign-off on validation outputs and append promotion log:
`ORGUMENTED_OPERATOR=<name> npm run phase8:promotion-log -- promoted`

## Rollback Procedure
1. Stop stack:
`docker compose -f docker/docker-compose.yml down`
2. Restore known-good snapshot:
`npm run phase8:restore-point:apply -- <restore-point-stamp>`
3. Start stack with previous image tag or previous commit:
`docker compose -f docker/docker-compose.yml up -d`
4. Verify:
- `GET /ready`
- `GET /perms` known-positive check

## Secrets Rotation Procedure
1. Rotate credentials for the active auth mode (legacy External Client App today; CCI-based auth after Phase 18 migration).
2. Update `.env` values for required auth keys (`SF_CLIENT_ID` / `SF_CLIENT_SECRET` for legacy OAuth path).
3. Re-auth and refresh token store:
- `npm run sf:oauth:url`
- `npm run sf:oauth:exchange`
- `npm run sf:auth`
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
