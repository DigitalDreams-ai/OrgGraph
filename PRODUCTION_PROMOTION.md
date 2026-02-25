# Production Promotion Gate

## Purpose
Define the go/no-go process for promoting OrgGraph from sandbox metadata to production org metadata.

## Go / No-Go Criteria
- `GET /ready` is `status=ready` and source path points to retrieved org metadata.
- `npm run phase7:smoke-live` passes on sandbox.
- `npm run phase7:regression` passes against baseline snapshot threshold.
- `/perms`, `/automation`, `/impact`, `/ask` have at least one known-positive and one known-negative validation case reviewed.
- No new parser warnings that materially change operator conclusions.

## Pre-Promotion Checklist
1. Capture baseline snapshot:
`npm run phase7:snapshot`
2. Validate latest ingest summary:
`npm run ingest:report`
3. Confirm secrets are current and scoped:
`SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_TOKEN_STORE_PATH`
4. Confirm rollback artifacts exist:
- previous `data/orggraph.db`
- previous `data/evidence/index.json`
- previous image tags
5. Confirm operator sign-off on validation outputs.

## Rollback Procedure
1. Stop stack:
`docker compose -f docker/docker-compose.yml down`
2. Restore known-good `data/orggraph.db` and `data/evidence/index.json`.
3. Start stack with previous image tag or previous commit:
`docker compose -f docker/docker-compose.yml up -d`
4. Verify:
- `GET /ready`
- `GET /perms` known-positive check

## Secrets Rotation Procedure
1. Rotate External Client App secret in Salesforce.
2. Update `.env` values for `SF_CLIENT_ID` / `SF_CLIENT_SECRET`.
3. Re-auth and refresh token store:
- `npm run sf:oauth:url`
- `npm run sf:oauth:exchange`
- `npm run sf:auth`
4. Run live smoke:
`npm run phase7:smoke-live`

## Production Cadence
- Manual cadence (recommended now): run retrieve + refresh on demand before major analysis sessions.
- Optional scheduled cadence (later): daily retrieve + incremental refresh with alerting on regression threshold failures.

