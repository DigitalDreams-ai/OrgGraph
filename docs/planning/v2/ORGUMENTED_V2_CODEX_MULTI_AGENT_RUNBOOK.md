# Orgumented v2 Codex Runbook

Date: March 2, 2026
Status: active Codex execution runbook

## Default Mode

Use:
- one primary Codex session
- one optional verifier Codex session

Do not start a permanent coordinator/planner/workflow/verifier swarm by default.

## Primary Agent Workflow

The primary Codex session should:
1. read `AGENTS.md`
2. read the active v2 planning surface:
   - `docs/planning/v2/README.md`
   - `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`
   - `docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md`
3. create one branch from updated `main`
4. implement the smallest coherent slice
5. run the relevant local gates
6. update docs if behavior changed
7. open or update the PR

## Optional Verifier Workflow

Use a second Codex session only when you want an independent verification pass.

The verifier session should:
1. stay out of feature implementation
2. verify the branch with:

```powershell
scripts/verify-worker-branch.ps1 -Branch <branch> [-WorkerName primary] [-ScopeFiles "<scope1>,<scope2>"] [-SemanticChange]
```

3. report the result as:

```text
GATE-REPORT:
  branch: <branch-name>
  gates:
    typecheck: pass | fail
    api-test: pass | fail
    web-build: pass | fail
    desktop-build: pass | fail
    desktop-smoke: pass | fail
    replay-parity: pass | fail | skipped
    scope-check: pass | warn | skipped
  merge-ready: yes | no
  blockers: <list or none>
  evidence:
    - logs/verify-worker-branch-result.json
    - logs/desktop-release-smoke-result.json
```

## Handoff Format

When the primary agent is ready for verification:

```text
COMPLETE:
  branch: <branch-name>
  slice-goal: <one sentence>
  files-touched:
    - <paths>
  local-gates-passed:
    - <gate list>
  semantic-change: yes | no
  verifier-requested: yes | no
```

## Project-Memory

Project-memory is optional continuity only.

Use only:
- `list_records`
- `get_record`
- `put_record`
- `append_event`
- `link_records`
- `mark_stale`
- `prune_expired`

Do not use:
- `list_mcp_resources`
- `list_mcp_resource_templates`

If project-memory fails, continue using repo state and PR state.

## What Was Retired

These are no longer the default repo workflow:
- coordinator worktree bootstrap
- planner worker worktree bootstrap
- workflow worker worktree bootstrap
- role-launch scripts for always-on agent teams
- task-board-driven worker idling for every slice

If parallelism is needed later, choose it intentionally for a specific task. Do not treat it as the standing default.

## Bottom Line

For Orgumented, the practical Codex workflow is:
- one primary session
- optional verifier session
- one branch
- one PR
- deterministic and packaged-desktop gates before merge
