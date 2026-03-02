# Orgumented v2 Multi-Agent Task Board

Date: March 2, 2026
Status: active coordination board

## Team Shape

- Coordinator: `orgumented-coordinator`
- Worker 1: `orgumented-worker-planner`
- Worker 2: `orgumented-worker-workflow`
- Verifier: `orgumented-verifier`

## Coordination Rules

- one branch per worker
- one worktree per worker
- no shared worktree edits
- no overlapping replay-sensitive files
- merge order is controlled by the coordinator

## Worktree Layout

| Role | Worktree | Branch | Status |
| --- | --- | --- | --- |
| coordinator | `..\\org-coord` | `dna-multi-agent-operating-model` | merge PR #57 |
| planner worker | `..\\org-pla` | unassigned until coordination kit lands on `main` | standby |
| workflow worker | `..\\org-ui` | unassigned until coordination kit lands on `main` | standby |
| verifier | `..\\org-verify` | `main` or worker branch checkout | standby |

## Active Assignments

### Coordinator

- branch: `dna-multi-agent-operating-model`
- worktree: `..\\org-coord`
- active focus: finish and merge PR `#57` before creating any new worker slice branches or repointing worktrees
- merge order note: no worker branch assignment before PR `#57` is merged and a fresh coordinator branch is cut from updated `main`

### Planner Worker

- branch: unassigned
- worktree: `..\\org-pla`
- slice: pending post-merge assignment for the next planner-only Stage 1 slice
- likely files:
  - `apps/api/src/modules/planner/`
  - `apps/api/src/modules/ask/`
  - `apps/api/test/planner.ts`
  - `apps/api/test/integration.ts`
  - `apps/api/test/phase12-replay-runtime.ts`
- required checks:
  - `typecheck`
  - `api-test`
  - `web-build`
  - `desktop-build`
  - `desktop-smoke`
  - `replay-parity`
- dependency note: create this branch only after updated `main` is available and the worktrees are rebuilt or repointed

### Workflow Worker

- branch: unassigned
- worktree: `..\\org-ui`
- slice: hold until the planner assignment is cut from updated `main`
- likely files:
  - `apps/web/app/workspaces/proofs/`
  - `apps/web/app/workspaces/ask/`
  - `apps/web/app/shell/`
- required checks:
  - `typecheck`
  - `api-test`
  - `web-build`
  - `desktop-build`
  - `desktop-smoke`
- dependency note: stay unassigned until PR `#57` merges and the next coordinator branch is created from updated `main`

### Verifier

- branch: branch-under-test checked out in `..\\org-verify`
- worktree: `..\\org-verify`
- slice: run `scripts/verify-worker-branch.ps1` for every worker branch before PR approval or merge
- likely files:
  - `scripts/verify-worker-branch.ps1`
  - `logs/verify-worker-branch-result.json`
  - `logs/desktop-release-smoke-result.json`
- required checks:
  - `typecheck`
  - `api-test`
  - `web-build`
  - `desktop-build`
  - `desktop-smoke`
  - `replay-parity` when `-SemanticChange` is set
  - `scope-check`
- dependency note: verifier does not fix branches; it only reports `GATE-REPORT` results back to the coordinator

## Coordination Risks

- Existing unmerged Stage 1 branches `dna-analyze-workflow`, `dna-system-diagnostics`, and `dna-human-benchmark-evidence` already touch shared UI shell or documentation paths.
- Treat `apps/web/app/page.tsx`, `docs/USAGE_GUIDE.md`, `docs/CHEATSHEET.md`, `docs/planning/v2/HIGH_RISK_REVIEW_BENCHMARK*.md`, and `scripts/phase17-human-benchmark-*.mjs` as reserved when planner assignment resumes after PR `#57`.
- Stop parallel execution if any worker attempts to widen into Stage 2 policy or approval-support behavior.

## Merge Gate Checklist

- scope remains Stage 1
- replay parity not regressed
- proof identity not regressed
- UI owns no business or policy logic
- packaged desktop parity preserved
- docs updated if behavior changed

## Current Default Merge Order

1. runtime and CI prerequisites
2. planner worker branch
3. workflow worker branch
4. evidence and benchmark follow-ons
