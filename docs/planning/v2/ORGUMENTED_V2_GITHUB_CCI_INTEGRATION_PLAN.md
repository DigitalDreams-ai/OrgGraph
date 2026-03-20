# Orgumented v2 GitHub And CCI Integration Plan

Date: March 16, 2026
Status: active support-track planning artifact, with initial Phase 2 PR comment publication now live

Companion docs:
- `docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md`
- `docs/planning/v2/ORGUMENTED_V2_ROADMAP.md`
- `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`
- `docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md`
- `docs/planning/v2/ORGUMENTED_V2_TOOLCHAIN_IMPLEMENTATION_POLICY.md`

## Purpose

Add GitHub to the active v2 plan as a borrowed support plane.

Rule:
- GitHub should replace low-value custom repo, review, CI, and release plumbing.
- Orgumented should keep owning semantic judgment, proof, replay, and trust.

This is not a runtime pivot.
The local desktop semantic runtime remains the product core.

## Architectural Posture

GitHub is:
- the source-control and collaboration plane
- the review and check-reporting plane
- the CI orchestration plane
- the release-distribution plane

GitHub is not:
- the semantic runtime
- the proof/replay source of truth
- the policy engine
- the only execution path for core local workflows

Failure rule:
- GitHub unavailability must not silently widen, unblock, or unconstrain local Orgumented workflows.
- GitHub-backed features may fail closed or become unavailable, but local Ask, Analyze, Proof, and desktop operator workflows must remain explicit about that boundary.

## What GitHub Replaces

| Concern | Replace with GitHub | Keep in Orgumented |
|---|---|---|
| Raw source history and file diff | repository history, compare view, PR diff | semantic diff, evidence diff, change-risk synthesis |
| Review workflow plumbing | pull requests, comments, review threads, required checks | decision-packet generation, approval reasoning, proof links |
| CI orchestration | GitHub Actions, workflow dispatch, check status | deterministic validation rules, benchmark logic, release evidence rules |
| Release asset distribution | GitHub Releases and workflow artifacts | release readiness criteria, rollback contract, proof/replay artifacts |
| Work tracking | Issues and Projects | product-specific wave/backlog semantics where they matter to the runtime |
| Branch / PR state visibility | PR status, check runs, mergeability, branch protection | semantic interpretation of the change under review |

## What GitHub Does Not Replace

GitHub should not replace:
- semantic snapshots
- evidence indexing
- Ask planner/compiler behavior
- deterministic decision packets
- proof and replay artifacts
- policy and trust evaluation
- fail-closed latest-retrieve constraints

Those remain Orgumented moat.

## CCI Inside Orgumented

Yes. A real GitHub repo plus checked-in project files makes broader CCI use reasonable, but only through the engine-side tool-adapter boundary.

Concrete ownership rule:
- GitHub integration does not change the primary Salesforce tool contract.
- `sf` stays primary for org auth and raw metadata IO.
- `cci` expands only as a typed project-aware orchestration layer.

Current typed CCI use already exists:
- `cci version`
- `cci org info <alias>`
- `cci org import ...`
- local CCI project scaffold initialization when needed

Next safe expansion is not "raw shell access from the UI."
It is typed CCI job support inside Orgumented.

### Safe CCI Lanes

| Lane | Runs where | Allowed examples | Rule |
|---|---|---|---|
| local typed jobs | desktop runtime through the Nest engine | org info, alias bridge, project-aware validation tasks, named diagnostics tasks/flows from `cumulusci.yml` | must be allowlisted, typed, logged, and fail closed |
| GitHub Actions jobs | GitHub Actions, triggered from typed workflow inputs | PR validation flows, benchmark publication, release validation, longer-running shared checks | must return typed status back to Orgumented or GitHub checks |

### CCI Safety Rules

1. No arbitrary raw `cci ...` command entry from the UI.
2. Every CCI operation must be represented as a typed engine job with:
   - job type
   - alias / repo / cwd
   - declared mutability
   - timeout
   - structured stdout/stderr capture
3. Read-only or low-risk local jobs can run in the desktop runtime first.
4. Org-mutating, release-affecting, or shared-environment flows should stay in GitHub Actions until wave12 release-readiness proof is closed.
5. Every CCI-backed action must remain auditable in proof/history or job history.
6. No commit-capable metadata flow may default to the Orgumented product repo; explicit user-bound repo binding is required first.

## Safe Migration Phases

### Phase 0: Foundation

Add:
- explicit repo binding config
- GitHub auth boundary
- typed GitHub adapter in the engine

Constraints:
- prefer GitHub App or explicitly scoped token
- keep GitHub auth separate from Salesforce auth
- do not make GitHub mandatory for local desktop bootstrap

### Phase 1: Read-Only Repo Context

Add:
- repository metadata read
- branch / commit / PR metadata read
- changed-file scope read

Use cases:
- scope Ask or review packets to a PR
- show repo/PR context in approval workflows
- correlate retrieved metadata with source diff

Safety:
- read-only first
- no PR mutation yet

Current state:
- local GitHub session status/login is now live through the engine using local `gh`
- Connect workspace can now:
  - inspect GitHub auth state
  - authorize GitHub locally
  - list accessible repos
  - create a new repo
  - select one explicit repo binding for later repo-backed workflows
- Connect workspace can now load read-only selected repo context for:
  - repository metadata
  - recent branches
  - open pull requests
- Connect workspace can now load read-only changed-file scope for an explicit pull request against:
  - the selected repo binding
  - or explicit owner/repo when provided
- diff hunk parsing and higher-order diff interpretation are still intentionally out of scope for this phase

### Phase 2: Publish Review Output Back To GitHub

Add:
- PR comments or check-run summaries
- proof/replay links and decision-packet summaries
- benchmark publication summaries where relevant

Current state:
- initial PR comment publication is now live through `/github/pr/comment-review-packet`
- publication is idempotent per `proofId` and preserves `proofId`, `replayToken`, snapshot/policy provenance, recommendation summary, evidence gaps, and next actions
- check-run publication is still optional future extension

Use cases:
- post Orgumented review output directly on the PR
- keep decision packets in the normal engineering review surface

Safety:
- publication must be idempotent
- no merge blocking until packet quality is trusted

### Phase 3: Typed Workflow Dispatch

Add:
- `workflow_dispatch` or equivalent typed workflow trigger path
- status polling / status ingest
- structured mapping from workflow result to Orgumented state

Use cases:
- dispatch GitHub Actions validation
- dispatch CCI-backed project validation flows
- read results back into Orgumented or PR checks

Safety:
- typed inputs only
- explicit workflow allowlist
- no hidden fallback to local unconstrained execution if dispatch fails

Current state:
- typed workflow lanes are now live for the selected repo binding:
  - load engine-owned allowlisted workflows
  - dispatch allowlisted workflows through GitHub Actions with an explicit ref
  - read back recent `workflow_dispatch` runs for those workflows
- explicit repo-binding safety is now live in the engine and Connect workspace for future commit-capable metadata workflows:
  - selected repo binding is inspected directly from local Orgumented state
  - product repo identity is resolved from `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` or the local `origin` remote
  - commit-capable metadata binding is blocked when the selected repo is missing or matches the Orgumented product repo
- the current allowlist is intentionally narrow:
  - `ci_validate`
  - `runtime_nightly`
  - `scripts_lint`
  - `workflow_lint`
  - no arbitrary workflow selection outside that typed set
  - no YAML mutation
  - no hidden fallback to local shell execution
- broader allowlisted workflows, benchmark publication dispatch, and check-run publication are still future slices

### Phase 4: Release And Artifact Discipline

Add:
- GitHub Release integration
- artifact links from release evidence
- workflow artifact references inside canonical release records

Use cases:
- connect packaged desktop artifacts, smoke output, and release evidence
- keep release-ready artifacts visible in the repo-native release surface

Safety:
- GitHub artifact links complement local proof/replay storage
- they do not replace local proof identity

### Phase 5: Optional Collaboration Extensions

Later, only if useful:
- Issues / Projects linkage
- lightweight status dashboards
- notification surfaces

These are not Stage 1 gates.

## Wave Mapping

GitHub integration is a cross-wave support track.
It does not replace the locked wave order.

Primary wave ownership:
- wave7: publish decision packets into PR review surfaces
- wave11: move CI/reporting orchestration and workflow dispatch into GitHub-native checks
- wave12: connect release evidence and packaged artifacts to GitHub release surfaces

CCI expansion ownership:
- local typed CCI job expansion can proceed in parallel where it helps existing desktop workflows
- shared, longer-running, or release-affecting CCI flows should be routed through wave11/wave12 GitHub Actions integration

## Acceptance Gates

This support track is only valid if all of the following stay true:

1. Core local workflows still work without GitHub.
2. GitHub integration failure does not cause silent unconstrained fallback.
3. PR publication is idempotent and traceable.
4. Workflow dispatch uses typed inputs and typed results.
5. CCI expansion stays inside the engine/tool-adapter boundary.
6. No policy or semantic decision logic moves into the UI or into GitHub Actions YAML.

## Immediate Planned Moves

1. Extend the allowlist only where the workflow is operator-safe and typed beyond the current CI/runtime/lint set.
2. Extend PR-facing decision-packet publication from proof-bound comments into broader repo/PR-context-aware workflows.
3. Wire the binding-safety gate into the first commit-capable metadata export/publication path so policy becomes execution-enforced, not only observable.
4. Add benchmark-publication-specific typed workflow lanes where they replace low-value manual CI invocation.
5. Release artifact and evidence linkage in wave12.
Current state:
- typed artifact linkage is now live for allowlisted workflows through the engine and Connect workspace
- canonical release evidence now records GitHub artifact workflow/run/download fields explicitly
- GitHub Release publication itself remains optional future work; this slice is evidence linkage only
6. Gradual typed CCI expansion locally, with mutating/release flows kept in GitHub Actions until release proof is stronger.
