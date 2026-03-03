# Orgumented v2 Execution Board

Date: March 2, 2026
Status: active execution board

## Default Mode

- primary agent drives the current slice
- verifier is optional and invoked only when useful
- no standing coordinator/planner/workflow swarm

## Current Rule

Use this board only for:
- current slice visibility
- verifier handoff state
- merge-readiness notes

Do not use it as a mandatory blocker for single-agent execution.

## Current Slice

- source of truth: `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`
- branch: set by the active implementation branch
- verifier state: idle until explicitly requested

## Verifier Handoff

When the primary agent wants an independent verification pass, add:

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

Then the verifier returns:

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

## Cleanup Note

The older multi-worktree coordination board is retired.

If a task truly needs parallel execution later, document that explicitly for that task rather than reviving the full swarm model by default.
