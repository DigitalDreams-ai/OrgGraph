# Orgumented v2 Agent Operating Model

Date: March 2, 2026
Status: active execution model

## Purpose

Orgumented does not benefit from a continuously running swarm of coordinator, planner, workflow, and verifier agents.

The default operating model is:
- one primary implementation agent
- one optional verifier agent
- one branch per coherent slice
- one PR per coherent slice

This keeps the workflow aligned with the real constraints of the repo:
- deterministic replay gates serialize integration anyway
- planner, proof, and runtime work are tightly coupled
- branch/worktree churn can easily cost more time than it saves

Parallel agent execution is now treated as exceptional, not default.

## Default Team Shape

### 1. Primary Agent

Owns:
- planning the active slice against the v2 control surface
- implementation
- local verification
- documentation updates
- PR creation

The primary agent may touch:
- engine code
- UI code
- runtime code
- docs

but must still obey all architectural boundaries in `AGENTS.md`.

### 2. Verifier Agent

Owns:
- independent gate execution when requested
- replay and packaged-desktop verification
- structured merge-readiness output

The verifier does not implement features.

## What Is No Longer Default

The following are retired as the normal operating model:
- always-on coordinator session
- always-on planner worker session
- always-on workflow worker session
- dedicated worktree per role
- task-board-driven worker idling before every slice

Those controls were safe, but too expensive in operator attention and too easy to stall on stale state.

## Branch Rules

Default rule:
- one active branch for one coherent slice

Recommended sequence:
1. sync `main`
2. create one new branch from updated `main`
3. implement the slice
4. run local gates
5. open a PR
6. use verifier only if independent verification is needed before merge

Do not:
- keep multiple always-on side branches unless a human explicitly decides the parallel gain is worth the overhead
- split one small slice across multiple live agents by default

## Verification Rules

Primary agent minimum before handoff:
- relevant package tests
- `pnpm --filter web build` if UI changed
- `pnpm --filter api test` if engine changed
- `pnpm desktop:build` for runtime-affecting work
- `pnpm desktop:smoke:release` for runtime or semantic changes

Verifier is used when:
- the user explicitly wants an independent verification pass
- a branch is replay-sensitive or runtime-sensitive enough to justify a second pass
- a PR is about to merge and an independent gate run adds real confidence

The verifier uses:
- `scripts/verify-worker-branch.ps1`

## Handoff Protocol

The simplified handoff format is:

### 1. Primary Agent Completion

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

### 2. Verifier Gate Report

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

## Optional Parallelism Rule

Parallel execution is allowed only when:
- the user explicitly asks for it
- the slices are clearly independent
- the expected gain is worth the coordination cost

Even then, use at most:
- one primary feature agent
- one verifier

Do not restore the full coordinator/planner/workflow/verifier swarm as the default repo workflow.

## Project-Memory Rule

Project-memory remains advisory only.

Use only direct record tools when needed:
- `list_records`
- `get_record`
- `put_record`
- `append_event`
- `link_records`
- `mark_stale`
- `prune_expired`

Do not call:
- `list_mcp_resources`
- `list_mcp_resource_templates`

against `project-memory`.

Repository state is canonical.

## Stop Conditions

Pause and correct if:
- replay parity regresses
- deterministic proof identity regresses
- UI starts owning business or policy logic
- runtime divergence between dev and packaged desktop increases
- coordination overhead exceeds the value of the extra agent

## Bottom Line

Orgumented should now run like this:
- one primary agent drives the slice end to end
- one verifier is invoked only when useful
- branches stay narrow
- replay and packaged smoke remain binding

That is the default until a specific task proves it truly benefits from more parallelism.
