# WebUI Troubleshooting and Debug Runbook

## Purpose
Use this runbook when WebUI actions fail, look inconsistent, or return generic error banners.

## Fast Diagnostic Sequence
1. Confirm services:
- `curl -s http://localhost:3100/health && echo`
- `curl -s http://localhost:3100/ready && echo`
- `curl -s http://localhost:3101/api/ready && echo`

2. Confirm org toolchain in API container:
- `docker exec orgumented-api sh -lc 'which cci && cci version && which sf && sf --version'`

3. Confirm org status API:
- `curl -s -X POST http://localhost:3101/api/query -H 'content-type: application/json' -d '{"kind":"orgStatus","payload":{}}'`

4. Inspect recent API logs:
- `docker logs --tail 200 orgumented-api`

5. Re-test failing UI action and capture raw JSON from WebUI Result panel.

## Common Failure Patterns

### 1) Connect Org / Switch Alias / Retrieve Selected fails
Typical error:
- `SF_RETRIEVE_FAILED`
- reason: `No authenticated org for alias ...`

Meaning:
- Tools are installed, but no authenticated session exists for the alias in container runtime.

Checks:
- `orgStatus` payload `session.status`
- API logs for `OrgService` auth/retrieve path

Fix:
- Authenticate org first in same runtime/container.
- Then retry `Check Session` -> `Connect Org` -> `Retrieve Selected`.

Important:
- Current Connect tab selector (`CumulusCI`, `SF CLI`, `Magic Link`) is operator UI state; it does not by itself switch backend auth mode.

### 2) Permissions returns false for a user known to have access
Typical indicators:
- `mappingStatus: unmapped_user`
- warnings about missing principals

Meaning:
- User principal map lacks mapping for queried email, or wrong map path loaded.

Checks:
- Verify `USER_PROFILE_MAP_PATH`
- Verify user exists in mapped principal JSON with exact email key
- Verify graph is built from current org metadata, not fallback fixtures

Fix:
- Re-export/update user principal map
- Refresh/rebuild graph
- Re-run `/perms` query

### 3) Ask feels brittle
Meaning:
- Intent routing and deterministic path extraction are strict; unsupported phrasings may underperform.

Checks:
- Compare raw `/ask` payload with `/impact` and `/automation` results directly
- Confirm confidence/policy fields in response

Fix direction:
- Add query normalization/paraphrase layer (LLM optional) before deterministic planner
- Keep deterministic evidence/proof as hard requirement

### 4) Proofs & Metrics errors (`replayToken or proofId is required`)
Meaning:
- Button was executed without required inputs.

Required fields:
- `Get Proof`: `proofId`
- `Replay Proof`: `replayToken` or `proofId`
- `Export Metrics`: no input required

UX note:
- This is currently valid backend behavior but poor UI guidance.

### 5) Copy JSON appears broken
Meaning:
- Browser clipboard permission may be blocked for non-secure context or policy.

Current behavior:
- UI now includes clipboard API fallback to `execCommand('copy')`.

Validation:
- Click `Copy JSON`
- Paste into local text editor

## Deterministic Sanity Checks
Run these to confirm the runtime itself is healthy and consistent:
- `curl -s "http://localhost:3100/automation?object=Opportunity"`
- `curl -s "http://localhost:3100/impact?field=Opportunity.StageName"`
- `curl -s -X POST http://localhost:3100/ask -H 'content-type: application/json' -d '{"query":"What touches Opportunity.StageName?"}'`

## Evidence to Attach to Bug Reports
Include all of:
1. Failing action name
2. Raw JSON payload from Result panel
3. `orgStatus` payload
4. `docker logs --tail 200 orgumented-api`
5. Current branch and commit
6. Timestamp

## Recommended Debug Priority
1. Runtime/install issues (sf/cci missing)
2. Auth/session issues (alias not authenticated)
3. Data/mapping issues (`user-profile-map` and refresh source)
4. UX validation gaps (missing required proof inputs)
5. NLP/planner quality improvements
