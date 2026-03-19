# Storage Rollback & Disaster Recovery

This runbook covers storage/runtime rollback for Orgumented.

## Baseline Safety

- Keep the stable backend explicit for the current release.
- Keep SQLite restore available because it is the local-first baseline.
- Maintain fresh backups for:
  - active graph store
  - refresh artifacts (`data/refresh/*`)
  - ask proof/metrics (`data/ask/*`)

## Rollback Trigger Conditions

- parity mismatch in CI (`backend-parity` failure)
- replay mismatch in production checks
- sustained latency/memory regression after storage change
- data-change anomalies

## Immediate Rollback Steps

1. Set backend to stable baseline:
```bash
GRAPH_BACKEND=sqlite
```
2. Recreate API service:
```bash
restart the local runtime after restoring the previous storage configuration
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

1. Restore the active graph store from the latest verified backup.
2. Restore `data/refresh`, `data/ask`, and `data/evidence` artifacts.
3. Run full refresh:
```bash
curl -s -X POST http://localhost:3100/refresh \
  -H 'content-type: application/json' \
  -d '{"mode":"full"}'
```
4. Re-run smoke:
```bash
pnpm desktop:smoke:release
```

## Post-Incident Requirements

- Save root cause and recovery timeline.
- Attach parity/replay evidence.
- Block storage promotion until corrective action is merged and verified.
