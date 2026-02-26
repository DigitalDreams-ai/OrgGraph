# Meta-Context Adaptation Runbook

Phase 16 introduces deterministic adaptation of relation ranking priors.

## Endpoints

- `GET /meta/context`
  - Returns active relation multipliers and adaptation provenance.
- `POST /meta/adapt`
  - Runs deterministic adaptation from `ASK_METRICS_PATH`.
  - Body: `{"dryRun": true|false}`.

## Typical Workflow

1. Export current metrics:
```bash
curl -s http://localhost:3100/ask/metrics/export
```

2. Preview adaptation without changing runtime state:
```bash
curl -s -X POST http://localhost:3100/meta/adapt \
  -H 'content-type: application/json' \
  -d '{"dryRun":true}'
```

3. Apply adaptation:
```bash
curl -s -X POST http://localhost:3100/meta/adapt \
  -H 'content-type: application/json' \
  -d '{"dryRun":false}'
```

4. Verify active priors:
```bash
curl -s http://localhost:3100/meta/context
```

## Determinism Notes

- Adaptation formulas are explicit and bounded (`0.8` to `1.25` multipliers).
- Inputs are from append-only ask metrics records.
- Every run writes an audit artifact under `data/meta/audit/`.
- Same metrics input + policy yields identical multiplier outputs.
