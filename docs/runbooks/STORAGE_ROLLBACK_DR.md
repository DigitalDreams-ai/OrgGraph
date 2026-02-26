# Storage Rollback & Disaster Recovery

This runbook covers storage/runtime rollback for Orgumented.

## Baseline Safety

- Keep `GRAPH_BACKEND=postgres` as production default.
- Keep SQLite parity path available for emergency restore.
- Maintain fresh backups for:
  - Postgres DB
  - refresh artifacts (`data/refresh/*`)
  - ask proof/metrics (`data/ask/*`)

## Rollback Trigger Conditions

- parity mismatch in CI (`backend-parity` failure)
- replay mismatch in production checks
- sustained latency/memory regression after storage change
- data migration anomalies

## Immediate Rollback Steps

1. Set backend to stable baseline:
```bash
GRAPH_BACKEND=postgres
```
2. Recreate API service:
```bash
docker compose -f docker/docker-compose.yml up -d --force-recreate api
```
3. Validate health/readiness:
```bash
curl -s http://localhost:3100/health
curl -s http://localhost:3100/ready
```
4. Run deterministic replay check:
```bash
curl -s -X POST http://localhost:3100/ask \
  -H 'content-type: application/json' \
  -d '{"query":"What touches Opportunity.StageName?"}' | jq -r '.proof.replayToken'
```
Then:
```bash
curl -s -X POST http://localhost:3100/ask/replay \
  -H 'content-type: application/json' \
  -d '{"replayToken":"<token>"}'
```

## DR Restore

1. Restore Postgres from latest verified backup.
2. Restore `data/refresh`, `data/ask`, and `data/evidence` artifacts.
3. Run full refresh:
```bash
curl -s -X POST http://localhost:3100/refresh \
  -H 'content-type: application/json' \
  -d '{"mode":"full"}'
```
4. Re-run smoke:
```bash
npm run test:web-smoke
```

## Post-Incident Requirements

- Save root cause and recovery timeline.
- Attach parity/replay evidence.
- Block storage promotion until corrective action is merged and verified.
