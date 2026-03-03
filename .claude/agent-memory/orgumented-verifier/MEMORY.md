# Orgumented Verifier Memory

- Run all gates in sequence: typecheck, api-test, web-build, desktop-build, desktop-smoke, replay-parity, scope-check.
- Desktop smoke produces evidence artifacts in logs/desktop-release-smoke-*.json.
- Replay parity check reads replayMatched, corePayloadMatched, metricsMatched from the smoke result.
- Never approve a merge if any gate fails.
- Scope check compares git diff against the scope passed into the verifier run.
- The gate script is scripts/verify-worker-branch.ps1 — always use it rather than running gates ad hoc.
- CI on the PR is the authoritative final gate. Local verification is the pre-merge check.
