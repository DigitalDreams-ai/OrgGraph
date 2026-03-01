# Storage Runtime Decision

## Decision

- Outcome: **No-Go** on specialized runtime promotion at this time.
- Keep production path **Postgres-first** with existing deterministic contracts.
- Re-evaluate after benchmark thresholds are met with measurable lift.

## Why No-Go Now

- Current stack already has:
  - deterministic replay (`/ask/replay`)
  - backend parity coverage (sqlite/postgres)
  - policy/drift governance and audit artifacts
- Specialized runtime introduces operational and migration risk before proven user-value lift.

## Required Go Thresholds (for future promotion)

- Query latency p95 improvement: **>= 30%**
- Replay latency p95 improvement: **>= 25%**
- Ingest throughput improvement: **>= 40%**
- Memory footprint reduction at equal corpus: **>= 20%**
- Behavioral parity mismatches: **0**

## Benchmark Method

Run:

```bash
./scripts/phase17-benchmark.sh
```

Artifact:

- `artifacts/phase17-benchmark.json`

Tracked metrics:

- `ingestIncrementalMs`
- `queryAutomationMs`
- `queryImpactMs`
- `replayMs`
- `memoryApiMiB`
- `memoryPostgresMiB`

## Optimization Roadmap on Existing Stack

1. Add targeted DB indexes for highest-volume graph traversal paths.
2. Cache stable replay lookups keyed by `replayToken`.
3. Reduce evidence scan overhead using deterministic shard selection.
4. Keep backend parity tests mandatory before any storage changes.

## Promotion Rule

No specialized runtime rollout until:

- benchmark thresholds above are met,
- parity/replay gates remain green,
- rollback runbook is validated in dry-run.
