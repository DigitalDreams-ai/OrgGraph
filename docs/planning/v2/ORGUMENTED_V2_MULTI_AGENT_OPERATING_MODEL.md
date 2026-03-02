# Orgumented v2 Multi-Agent Operating Model

Date: March 2, 2026
Status: active operating pattern for parallel agent work

## Purpose

This document defines how Orgumented should use multiple coding agents without violating:
- deterministic replay guarantees
- proof integrity
- desktop runtime convergence
- UI to engine boundary discipline

It is not a free-form swarm model.

It is a controlled branch-and-worktree model with:
- one orchestrator
- multiple narrow worker roles
- one integration and replay gate

Concrete repo kit:
- `.claude/agents/orgumented-coordinator.md`
- `.claude/agents/orgumented-worker-planner.md`
- `.claude/agents/orgumented-worker-workflow.md`
- `docs/planning/v2/ORGUMENTED_V2_MULTI_AGENT_TASK_BOARD.md`
- `scripts/setup-orgumented-multi-agent-worktrees.ps1`

## Operating Rule

Parallel agents are allowed only when:
- each agent owns a narrow slice
- each slice has a separate branch
- each branch has a separate worktree
- one orchestrator owns scope and merge order
- replay and packaged desktop checks remain binding before merge

No two agents should edit the same working tree at the same time.

## Orchestrator Role

The orchestrator is the control point.

Responsibilities:
- choose the active Stage 1 slice or sub-slices
- define acceptance gates before implementation starts
- assign branch names and worktree locations
- keep slices small enough to merge independently
- prevent Stage 2, Stage 3, or Stage 4 drift
- decide merge order
- stop parallel work when replay or runtime convergence is at risk

The orchestrator does not optimize for maximum parallelism.
The orchestrator optimizes for:
- safe isolation
- mergeability
- deterministic verification

Required outputs from the orchestrator:
- slice description
- owner agent
- branch name
- worktree path
- required tests
- merge dependency notes

## Worker Roles

The recommended worker set is small.

### 1. Planner Worker

Owns:
- planner/compiler depth
- typed intent routing
- deterministic query-family compilation

Typical files:
- `apps/api/src/modules/planner/`
- `apps/api/src/modules/ask/`
- `apps/api/test/planner.ts`
- `apps/api/test/integration.ts`
- `apps/api/test/phase12-replay-runtime.ts`

Hard boundary:
- no UI workflow changes unless inseparable from planner contract verification

### 2. Desktop Workflow Worker

Owns:
- workspace usability
- operator workflow state
- Stage 1 workflow parity

Typical files:
- `apps/web/app/workspaces/`
- `apps/web/app/shell/`
- `docs/USAGE_GUIDE.md`
- `docs/CHEATSHEET.md`

Hard boundary:
- no policy logic
- no trust logic
- no planner logic

### 3. Runtime and CI Worker

Owns:
- packaged desktop runtime behavior
- dev and packaged parity
- CI and smoke workflow efficiency

Typical files:
- `apps/desktop/`
- `scripts/desktop-release-smoke.ps1`
- `.github/workflows/`
- runtime bootstrap and launch wiring

Hard boundary:
- no semantic planner claims
- no UI business logic

### 4. Benchmark and Evidence Worker

Owns:
- benchmark artifacts
- proof-linked workflow evidence
- benchmark publication discipline
- operator runbooks for evidence capture

Typical files:
- `docs/planning/v2/HIGH_RISK_REVIEW_BENCHMARK*.md`
- `scripts/phase17-*.mjs`
- `logs/` generation paths

Hard boundary:
- no benchmark claims without grounded artifacts

### 5. Integration and Verification Worker

Owns:
- replay and packaged desktop verification
- branch integration rehearsal
- merge-readiness assessment

Typical files:
- tests
- smoke scripts
- release and runbook docs when verification behavior changes

Hard boundary:
- does not widen scope
- does not absorb feature ownership from workers

## Recommended Team Shapes

### Two-agent shape

Use when work is tightly coupled:
- one feature worker
- one verification and integration worker

### Three-agent shape

Use when slices are clean:
- planner worker
- desktop workflow worker
- runtime and verification worker

### Four-agent shape

Use only when evidence or docs are substantial:
- planner worker
- desktop workflow worker
- runtime and CI worker
- benchmark and evidence worker

Do not exceed four active workers on Orgumented without a strong reason.

## Branch Rules

Every worker gets:
- one branch
- one coherent slice
- one PR

Branch rules:
- branch from updated `main`
- do not branch from another open worker branch unless the orchestrator explicitly declares the dependency
- use branch names that describe the slice, for example:
  - `dna-planner-review-family-v2`
  - `dna-browser-retrieve-parity`
  - `dna-runtime-smoke-hardening`
  - `dna-benchmark-human-evidence`

Do not:
- mix multiple slices in one branch
- share a branch across workers
- stack unrelated work on an open PR branch

## Worktree Rules

Use `git worktree` so every worker has isolated files and node state.

The repository bootstrap script is:
- `scripts/setup-orgumented-multi-agent-worktrees.ps1`

Recommended shape:

```powershell
git worktree add ..\\org-pla main
git worktree add ..\\org-ui main
git worktree add ..\\org-rt main
git worktree add ..\\org-bmk main
```

Then create the branch inside each worktree:

```powershell
git switch -c dna-planner-review-family-v2
```

Worktree rules:
- one worktree per worker
- no concurrent edits in the same worktree
- do not reuse a dirty worktree for a new slice
- delete the worktree after merge or abandonment

Suggested naming:
- `org-pla`
- `org-ui`
- `org-rt`
- `org-bmk`
- `org-int`

## Slice Selection Rules

A slice is valid for parallel execution only if:
- it is implementable in roughly 2 to 6 weeks
- it has explicit acceptance gates
- replay protection is defined
- measurable lift or clear contract improvement exists
- it does not require the same files as another active slice

Do not parallelize:
- multiple planner slices in the same prompt family
- multiple runtime slices that change the same bootstrap path
- multiple workers editing the same proof or replay contract

## Merge Order Rules

Default merge order:
1. runtime and CI prerequisites
2. planner/compiler slices
3. desktop workflow slices
4. benchmark and evidence slices

Why:
- runtime changes define the safe validation path
- planner changes define the semantic contract
- UI follows those contracts
- evidence should be captured after the product path is stable

## Merge Gates

Every worker PR must pass:
- scope review by the orchestrator
- local verification for touched areas
- CI validation when applicable
- documentation alignment if behavior changed

Minimum per-slice merge gate:
- clean branch diff
- one coherent concern
- no undocumented contract change

## Replay Gates

Any slice that touches semantic runtime behavior must pass:
- deterministic replay parity
- stable proof artifact integrity
- no nondeterministic timestamps in decision logic
- fail-closed behavior on constraint or grounding failure

Required commands for semantic or runtime slices:
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`

Required additional checks for planner slices:
- `apps/api/test/planner.ts`
- `apps/api/test/integration.ts`
- `apps/api/test/phase12-replay-runtime.ts`

Required additional checks for workflow slices:
- no raw JSON dependence introduced where Stage 1 workflow parity forbids it
- no UI ownership of policy or decision logic

## PR Rules

Each worker opens a PR only when:
- the slice is coherent
- the documented acceptance gates are met
- docs are updated if behavior changed

PR body should include:
- slice purpose
- constraints
- verification commands
- risks
- explicit statement about whether replay semantics changed

The orchestrator or integration worker should comment on:
- merge dependency order
- whether the slice blocks other worker branches

## Stop Conditions

Pause multi-agent execution immediately if:
- replay parity fails on any worker branch
- two slices collide on the same planner/runtime contract
- runtime divergence between dev and packaged desktop increases
- a worker begins implementing Stage 2 or governance claims during a Stage 1 slice
- integration cost starts exceeding the expected speed gain

## Expected Benefit

For Orgumented, realistic gain is:
- about `1.3x` to `2.0x` faster

Higher gains are unlikely because:
- planner, proof, and runtime work remain tightly coupled
- replay gates still serialize integration

The model is successful only if:
- throughput increases
- merge pain stays controlled
- replay integrity does not regress

## Bottom Line

Orgumented should use multiple agents like a disciplined engineering team:
- one orchestrator
- a few narrow workers
- isolated branches and worktrees
- strict merge order
- replay and packaged desktop gates before merge

If those controls are not present, single-agent execution is safer.
