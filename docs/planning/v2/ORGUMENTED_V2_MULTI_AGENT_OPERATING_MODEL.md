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
- `.claude/agents/orgumented-verifier.md`
- `.codex/roles/orgumented-coordinator.md`
- `.codex/roles/orgumented-worker-planner.md`
- `.codex/roles/orgumented-worker-workflow.md`
- `.codex/roles/orgumented-verifier.md`
- `docs/planning/v2/ORGUMENTED_V2_MULTI_AGENT_TASK_BOARD.md`
- `docs/planning/v2/ORGUMENTED_V2_CODEX_MULTI_AGENT_RUNBOOK.md`
- `scripts/setup-orgumented-multi-agent-worktrees.ps1`
- `scripts/start-orgumented-codex-role.ps1`
- `scripts/verify-worker-branch.ps1`

Codex note:
- Codex uses this model through multiple separate sessions, not through built-in subagent spawning inside one session

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
- keep MCP project-memory current (primary owner)

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

## Standard Team Shape

The default operating team has four roles:

| Role | Agent | Worktree | Purpose |
|------|-------|----------|---------|
| Orchestrator | `orgumented-coordinator` | `../org-coord` | Plans slices, assigns work, controls merge order |
| Planner Worker | `orgumented-worker-planner` | `../org-pla` | Planner/compiler and Ask semantic-contract work |
| Workflow Worker | `orgumented-worker-workflow` | `../org-ui` | Desktop workflow parity and operator ergonomics |
| Verifier | `orgumented-verifier` | `../org-verify` | Runs gate pipeline, posts gate reports, assesses merge readiness |

The verifier is always present. It is not optional.

### Reduced team shapes

**Two-role shape** (tightly coupled work):
- one feature worker + verifier

**Extended team shapes** (substantial scope):
- add Runtime/CI Worker (`../org-rt`) when desktop packaging or CI changes are substantial
- add Benchmark/Evidence Worker (`../org-bmk`) when evidence capture or docs are substantial

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
- `scripts/start-orgumented-codex-role.ps1`

Setup:

```powershell
# Create all worktrees (standard team shape)
scripts/setup-orgumented-multi-agent-worktrees.ps1

# Or manually:
git worktree add ..\org-coord main
git worktree add ..\org-pla main
git worktree add ..\org-ui main
git worktree add ..\org-verify main
```

Then create the branch inside each worker worktree:

```powershell
cd ..\org-pla
git switch -c dna-planner-review-family-v2
```

Then launch the role-specific Codex session:

```powershell
scripts/start-orgumented-codex-role.ps1 -Role coordinator
scripts/start-orgumented-codex-role.ps1 -Role planner
scripts/start-orgumented-codex-role.ps1 -Role workflow
scripts/start-orgumented-codex-role.ps1 -Role verifier
```

Teardown after completion:

```powershell
scripts/setup-orgumented-multi-agent-worktrees.ps1 -Teardown
```

Worktree rules:
- one worktree per worker
- no concurrent edits in the same worktree
- do not reuse a dirty worktree for a new slice
- delete the worktree after merge or abandonment

Suggested naming:
- `org-coord` (coordinator)
- `org-pla` (planner worker)
- `org-ui` (workflow worker)
- `org-verify` (verifier)
- `org-rt` (runtime worker, if needed)
- `org-bmk` (benchmark worker, if needed)

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

## Concrete Gate Criteria

The verifier runs these gates via `scripts/verify-worker-branch.ps1`. All must pass before merge.

| Gate | Command | Pass Criteria | Required For |
|------|---------|---------------|--------------|
| Typecheck | `pnpm -r typecheck` | Exit code 0 | All branches |
| API Tests | `pnpm --filter api test` | All tests pass, exit code 0 | All branches |
| Web Build | `pnpm --filter web build` | Exit code 0 | All branches |
| Desktop Build | `pnpm desktop:build` | Exit code 0 | All branches |
| Desktop Smoke | `pnpm desktop:smoke:release` | `logs/desktop-release-smoke-result.json` has `status=passed` | All branches |
| Replay Parity | Smoke result fields | `replayMatched=true` AND `corePayloadMatched=true` AND `metricsMatched=true` | Semantic branches only |
| Scope Check | `git diff --name-only main...<branch>` | All files within declared `files-owned` | All branches |

Additional planner-specific checks:
- `apps/api/test/planner.ts` passes
- `apps/api/test/integration.ts` passes
- `apps/api/test/phase12-replay-runtime.ts` passes

Additional workflow-specific checks:
- no raw JSON dependence introduced where Stage 1 workflow parity forbids it
- no UI ownership of policy or decision logic

### Three-layer verification

1. **Worker local verification** — the worker runs the relevant subset before declaring complete
2. **Verifier gate pipeline** — the verifier runs the full `scripts/verify-worker-branch.ps1` before the PR is opened or approved
3. **CI pipeline** — `.github/workflows/ci.yml` runs on the PR as the authoritative final gate

All three must pass before merge.

## Handoff Protocol

Four structured messages govern the coordination lifecycle.

### 1. Assignment (coordinator -> worker)

```
ASSIGN:
  worker: orgumented-worker-planner | orgumented-worker-workflow
  branch: dna-<area>-<capability>
  worktree: ../org-<suffix>
  base: main
  slice-goal: [one sentence describing the outcome]
  files-owned:
    - [directories/files the worker may touch]
  files-forbidden:
    - [directories/files the worker must not touch]
  required-gates:
    - typecheck
    - api-test
    - web-build
    - desktop-build
    - desktop-smoke
    - replay-parity (if semantic change)
  merge-order: [1|2|3|4]
  merge-dependency: [branch name or "none"]
  stop-if:
    - [stop conditions specific to this slice]
```

### 2. Completion (worker -> coordinator)

```
COMPLETE:
  worker: [agent-name]
  branch: [branch-name]
  commits: [count]
  local-gates-passed:
    - [list of what the worker ran locally]
  semantic-change: yes | no
  ready-for-verification: yes
```

### 3. Gate Report (verifier -> coordinator)

```
GATE-REPORT:
  branch: [branch-name]
  worker: [agent-name]
  gates:
    typecheck: pass | fail
    api-test: pass | fail
    web-build: pass | fail
    desktop-build: pass | fail
    desktop-smoke: pass | fail
    replay-parity: pass | fail | skipped
    scope-check: pass | warn | skipped
  merge-ready: yes | no
  blockers: [list or "none"]
  evidence: [list of artifact paths]
```

### 4. Merge Decision (coordinator)

```
MERGE:
  branch: [branch-name]
  order: [number in merge sequence]
  pr: [PR URL]
  gate-report: [reference to gate report]
  approved: yes
```

## PR Integration

### Worker PR body template

```markdown
## Slice
[one-sentence slice goal from assignment]

## Worker
[agent name]

## Branch
[branch name]

## Files Changed
[list of changed files]

## Scope Compliance
- [ ] All changes within declared files-owned
- [ ] No files from files-forbidden list touched

## Semantic Impact
- [ ] Changes semantic runtime behavior: yes/no
- [ ] Replay parity verified locally: yes/no/not-applicable

## Local Verification
- [ ] pnpm -r typecheck
- [ ] pnpm --filter api test
- [ ] pnpm --filter web build

## Replay Statement
[Explicit statement about whether replay semantics changed]
```

### Verifier PR review comment format

```markdown
## Gate Report: [branch-name]

| Gate | Status | Details |
|------|--------|---------|
| Typecheck | PASS/FAIL | [error count or clean] |
| API Tests | PASS/FAIL | [X passed, Y failed] |
| Web Build | PASS/FAIL | [clean or error summary] |
| Desktop Build | PASS/FAIL | [clean or error summary] |
| Desktop Smoke | PASS/FAIL | [result artifact path] |
| Replay Parity | PASS/FAIL/SKIP | [matched status] |
| Scope Check | PASS/WARN/SKIP | [any out-of-scope files] |

### Merge Readiness: READY / NOT READY
[If not ready, list specific blockers]

### Evidence Artifacts
- [list of log/json artifact paths]
```

The orchestrator or verifier should also comment on:
- merge dependency order
- whether the slice blocks other worker branches

## Project-Memory Discipline

The coordinator is the primary owner of MCP project-memory. The verifier also writes `verification_result` records.

### Record lifecycle

| Event | Agent | Record Type | Action |
|-------|-------|-------------|--------|
| Slice assigned | Coordinator | `work_item` | `put_record` status=`todo` |
| Worker starts | Coordinator | `work_item` | `put_record` status=`in_progress` |
| Worker completes | Coordinator | `work_item` | `put_record` status=`done` |
| Merge decision | Coordinator | `decision_note` | `put_record` with rationale |
| Gate pipeline run | Verifier | `verification_result` | `put_record` with pass/fail per gate |
| Agent handoff | Coordinator | `handoff_note` | `put_record` with context and next checks |
| Risk identified | Coordinator | `risk_item` | `put_record` with severity and mitigation |
| Slice abandoned | Coordinator | `work_item` | `mark_stale` |
| Session start | Coordinator | — | `list_records` to load current state |
| Session end | Coordinator | — | `prune_expired` to clean up |

### Rules

- Project-memory is advisory only (per `AGENTS.md` section 13). Repository state is canonical.
- If project-memory and the task board disagree, the task board wins.
- Always include `sourceRefs` linking to the branch, PR, or doc.
- Use `link_records` to connect verification results to work items.
- Mark records `stale` or `superseded` promptly. Do not let stale records accumulate.
- Never block coordination on project-memory failures.

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
- one orchestrator that plans and assigns slices
- a few narrow workers that each own one isolated branch and worktree
- one verifier that runs the full gate pipeline and posts structured gate reports
- strict merge order controlled by the orchestrator
- all merges go through PRs with verifier gate reports and CI validation

If those controls are not present, single-agent execution is safer.
