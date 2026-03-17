# Semantic Drift Triage

## Purpose
Provide a deterministic root-cause workflow when semantic drift changes exceed budget.

## Inputs
- Snapshot IDs (`from`, `to`) from `/refresh` response or `/ingest/latest`.
- Drift artifact path from `driftReportPath`.

## 1. Capture Baseline Drift Report
```bash
cd "$env:USERPROFILE\\Projects\\GitHub\\Orgumented"
./scripts/phase14-drift-report.sh latest latest artifacts/phase14-drift-report.json
```

## 2. Compare Two Snapshots
```bash
curl "http://localhost:3100/refresh/diff/<snapshotA>/<snapshotB>"
```

Inspect:
- `semanticDiff.changedNodeTypeCounts`
- `semanticDiff.changedRelationCounts`
- `driftEvaluation.violations`
- `reportTemplate.topChangedScus`
- `reportTemplate.impactedPaths`

## 3. Determine Change Class
- Expected (planned metadata updates)
- Benign (non-risky structural churn)
- Unsafe (policy-impacting or high-blast-radius drift)

## 4. Handle Benign False Positives
Add allowlist values via runtime config:
- `DRIFT_ALLOWLIST_NODE_TYPES`
- `DRIFT_ALLOWLIST_RELATIONS`

Re-run refresh and diff.

## 5. Handle Unsafe Drift
- Keep gate enabled (`DRIFT_BUDGET_ENFORCE_ON_REFRESH=true`)
- Reduce scope of metadata changes
- Re-run `POST /refresh`
- Verify the gate passes and violations clear

## 6. CI Verification
CI executes:
```bash
./scripts/phase14-drift-gate.sh artifacts/phase14-drift-gate.json
```

This fails the pipeline if drift policy is out of budget.

