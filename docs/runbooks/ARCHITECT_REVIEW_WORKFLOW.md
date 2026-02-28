# Architect Review Workflow

This runbook defines how to use the Phase 15 architecture decision engines with deterministic replay.

## 1) Prerequisites

- API is running and healthy:
  - `curl -s http://localhost:3100/ready`
- Graph is refreshed from current metadata snapshot:
  - `curl -s -X POST http://localhost:3100/refresh -H 'content-type: application/json' -d '{"mode":"full"}'`

## 2) Run Architecture Decision

Use the architect decision endpoint with explicit user/object/field scope:

```bash
curl -s -X POST http://localhost:3100/ask/architecture \
  -H 'content-type: application/json' \
  -d '{"user":"jane@example.com","object":"Opportunity","field":"Opportunity.StageName"}'
```

## 3) Interpret Output

The response includes three deterministic engines:

- `engines.permissionBlastRadius`
  - Quantifies granted access spread and returns concrete permission paths.
- `engines.automationCollision`
  - Ranks overlapping automation/impact sources and relation overlap.
- `engines.releaseRisk`
  - Computes risk level/score from blast radius + collision + semantic diff magnitude.

Composite output:

- `composite.trustLevel` (`trusted|conditional|refused`)
- `composite.topRiskDrivers` (ranked deterministic drivers)
- `composite.replayToken` and `composite.snapshotId` for reproducibility

## 4) Review Discipline

- Treat `proofPaths` and `topCollisions` as first-class evidence.
- If trust level is `refused` or `conditional`, require explicit mitigation before release.
- Always record `replayToken` and `snapshotId` in release notes.

## 5) Regression Check

After parser or ontology changes, rerun:

```bash
pnpm --filter api test
```

If decision output changes unexpectedly for same snapshot, treat as regression.
