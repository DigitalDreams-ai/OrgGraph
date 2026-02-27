# Incident Triage Runbook

## Scope
Use this when Orgumented returns unexpected 4xx/5xx responses, stale trust metrics, or workflow regressions.

## Fast Triage
1. Check API and web readiness:
   - `curl -s http://localhost:3100/health`
   - `curl -s http://localhost:3100/ready`
   - `curl -s http://localhost:3101/api/ready`
2. Check recent logs:
   - `docker logs --tail 120 orgumented-api`
   - `docker logs --tail 120 orgumented-web`
3. Validate org integration status:
   - `curl -s http://localhost:3100/org/status`
   - `curl -s http://localhost:3100/org/session`
4. Validate trust surface:
   - `curl -s http://localhost:3100/ask/metrics/export`
   - `curl -s http://localhost:3100/ask/trust/dashboard`

## Failure Classes
- `llm_fallback`: LLM request not used; deterministic fallback path executed.
- `policy_refusal`: trust gate refused output.
- `constraint_risk`: conditional trust due low constraint satisfaction.
- `none`: no major failure class assigned.

## Recovery
1. Restore runtime health (container restart/recreate if needed).
2. Rebuild graph from latest retrieved metadata.
3. Re-run known-good smoke set (`scripts/web-smoke.sh`).
4. Verify trust dashboard trends normalize.

## Escalation
Escalate if either condition persists after one full rebuild cycle:
- replay pass rate < 0.80
- proof coverage rate < 0.90
