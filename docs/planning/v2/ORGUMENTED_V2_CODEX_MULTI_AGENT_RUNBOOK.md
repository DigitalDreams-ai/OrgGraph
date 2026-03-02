# Orgumented v2 Codex Multi-Agent Runbook

Date: March 2, 2026
Status: active Codex execution runbook

## Purpose

This runbook adapts the Orgumented multi-agent model to Codex.

Codex limitation:
- this session cannot natively spawn and supervise true subagents from inside one running agent

Codex-compatible answer:
- run multiple Codex sessions
- one session per worktree
- one role prompt per session
- one coordinator session controls assignment and merge order

This preserves the operating model without pretending Codex has a built-in swarm runtime.

## Standard Team Shape

Use four separate Codex sessions:

| Role | Worktree | Branch Pattern | Prompt File |
|------|----------|----------------|-------------|
| Coordinator | `../org-coord` | `dna-coordination-*` | `.codex/roles/orgumented-coordinator.md` |
| Planner Worker | `../org-pla` | `dna-planner-*` | `.codex/roles/orgumented-worker-planner.md` |
| Workflow Worker | `../org-ui` | `dna-workflow-*` | `.codex/roles/orgumented-worker-workflow.md` |
| Verifier | `../org-verify` | `main` or worker branch checkout | `.codex/roles/orgumented-verifier.md` |

The verifier is mandatory.

## Bootstrap

From the repo root:

```powershell
scripts/setup-orgumented-multi-agent-worktrees.ps1
```

This creates:
- `../org-coord`
- `../org-pla`
- `../org-ui`
- `../org-verify`

Then create worker branches inside the worker worktrees:

```powershell
Set-Location ..\org-pla
git switch -c dna-planner-<slice>

Set-Location ..\org-ui
git switch -c dna-workflow-<slice>
```

## Launching Codex Sessions

Use the helper script:

```powershell
scripts/start-orgumented-codex-role.ps1 -Role coordinator
scripts/start-orgumented-codex-role.ps1 -Role planner
scripts/start-orgumented-codex-role.ps1 -Role workflow
scripts/start-orgumented-codex-role.ps1 -Role verifier
```

To preview commands without launching:

```powershell
scripts/start-orgumented-codex-role.ps1 -Role coordinator -PrintOnly
```

## Coordinator Workflow

The coordinator session must:
1. read:
   - `AGENTS.md`
   - `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`
   - `docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md`
   - `docs/planning/v2/ORGUMENTED_V2_MULTI_AGENT_OPERATING_MODEL.md`
   - `docs/planning/v2/ORGUMENTED_V2_MULTI_AGENT_TASK_BOARD.md`
2. choose narrow Stage 1 slices only
3. assign one branch and one worktree per worker
4. write assignments in the task board
5. update project-memory if available
6. block overlap on replay-sensitive files

Coordinator assignment format:

```text
ASSIGN:
  worker: orgumented-worker-planner | orgumented-worker-workflow
  branch: dna-<area>-<capability>
  worktree: ../org-<suffix>
  base: main
  slice-goal: <one-sentence outcome>
  files-owned:
    - <paths>
  files-forbidden:
    - <paths>
  required-gates:
    - typecheck
    - api-test
    - web-build
    - desktop-build
    - desktop-smoke
    - replay-parity (if semantic change)
  merge-order: <number>
  merge-dependency: <branch or none>
  stop-if:
    - <condition>
```

## Worker Workflow

Each worker session must:
1. stay inside assigned files
2. implement the smallest coherent slice
3. run local gates before reporting complete
4. update docs if behavior changed
5. avoid touching verification scripts without assignment

Worker completion format:

```text
COMPLETE:
  worker: <worker-name>
  branch: <branch-name>
  commits: <count>
  local-gates-passed:
    - <gate list>
  semantic-change: yes | no
  ready-for-verification: yes
```

## Verifier Workflow

The verifier session must:
1. stay out of feature implementation
2. checkout or fetch the worker branch
3. run:

```powershell
scripts/verify-worker-branch.ps1 -Branch <branch> -WorkerName <worker> -ScopeFiles "<scope1>,<scope2>" [-SemanticChange]
```

4. capture:
   - `logs/verify-worker-branch-result.json`
   - `logs/desktop-release-smoke-result.json` when smoke ran
5. post a structured gate report back to the coordinator

Verifier gate report format:

```text
GATE-REPORT:
  branch: <branch-name>
  worker: <worker-name>
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

## Merge Flow

Recommended merge order:
1. runtime and CI prerequisites
2. planner/compiler slices
3. workflow slices
4. benchmark or evidence slices

A worker branch is mergeable only when:
- local worker gates passed
- verifier gate report says `merge-ready: yes`
- CI is green

## Session Recovery

If a Codex session closes, restart it in the same worktree:

```powershell
codex resume --last -C <worktree>
```

If a branch is abandoned:
- close the PR
- mark the task-board row abandoned
- mark project-memory stale if available
- remove the worktree after cleanup

## What This Does Not Do

This runbook does not give Codex a true built-in multi-agent orchestration runtime.

It gives Codex:
- separate role prompts
- isolated worktrees
- explicit handoff protocol
- one verifier gate script
- one coordinator-controlled merge discipline

That is enough to run Orgumented like a disciplined multi-agent engineering team.
