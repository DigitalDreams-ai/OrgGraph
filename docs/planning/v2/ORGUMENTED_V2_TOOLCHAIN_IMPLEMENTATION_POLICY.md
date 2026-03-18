# Orgumented v2 Toolchain Implementation Policy

Date: March 16, 2026
Status: active implementation policy

Companion docs:
- `docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md`
- `docs/planning/v2/ORGUMENTED_V2_GITHUB_CCI_INTEGRATION_PLAN.md`
- `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`

## Purpose

Define the concrete ownership boundary between:
- `sf`
- `cci`
- local `gh`
- GitHub / GitHub Actions
- Orgumented itself

This policy exists to prevent tool overlap, hidden fallback, and accidental reimplementation of capabilities that already exist in free borrowed tooling.

## Non-Negotiable Rules

1. Salesforce CLI keychain remains the only primary org-auth source of truth.
2. GitHub integration does not change the Salesforce auth model.
3. Raw org read and metadata retrieve behavior defaults to `sf`, not `cci`.
4. `cci` is an orchestration and project-aware job layer, not the default raw auth/retrieve primitive.
5. GitHub is a support plane for repo, review, CI, and release surfaces. It is not the semantic runtime.
6. Orgumented must never commit user-retrieved org metadata into the Orgumented product repository.
7. Any metadata commit-capable workflow must target an explicit user-bound repository, not the product source repo.
8. No UI surface may expose arbitrary raw `cci` or git shell entry.

## Ownership Matrix

| Concern | Primary owner | Secondary owner | Reason |
|---|---|---|---|
| org authorization / alias login | `sf` | none | `sf` is the current authenticated source of truth and the repo already enforces `sf_cli_keychain` as the auth method |
| GitHub sign-in / local repo authorization | local `gh` | env token as explicit override | reuse the standard local GitHub CLI login flow instead of inventing a custom OAuth surface first |
| alias discovery / current-org inspection | `sf` | `cci` for registry visibility only | alias/session truth should come from the authenticated Salesforce CLI state |
| raw metadata list/search/retrieve | `sf` | none by default | raw metadata IO is a direct platform primitive and should stay deterministic and tool-simple |
| future direct org query/read commands | `sf` | typed engine adapters | direct query/read should stay on the raw authenticated CLI path unless a stronger typed adapter is introduced |
| CCI org registry bridge | `cci` | `sf` provides the authenticated alias and username | this is a project-orchestration concern, not a primary auth concern |
| project-aware validation and diagnostics jobs | typed `cci` jobs | Orgumented engine owns allowlist and result typing | `cci` is useful when the task is project-aware and benefits from `cumulusci.yml` |
| shared, mutating, or release-affecting project jobs | GitHub Actions running typed `cci` flows | Orgumented consumes typed status/results | shared/release jobs belong in CI, not in an unconstrained local runtime loop |
| repo history, raw file diff, PR plumbing, checks, releases | GitHub | none | these are low-value custom surfaces to rebuild |
| semantic diff, decision packets, proof, replay, trust | Orgumented | none | these are the product moat and must remain local deterministic logic |

## Concrete Tool Rules

### `sf` Owns

`sf` is the default tool for:
- org login / authorization
- alias discovery
- current-org display and validation
- raw metadata-type listing
- raw metadata-member listing
- raw metadata retrieve into the local project workspace
- future direct read/query primitives unless there is a proven reason to elevate them into a typed engine abstraction

Current implementation examples:
- `sf org login web ...`
- `sf org display ...`
- `sf org list ...`
- `sf project retrieve start ...`

Rule:
- if the task is a direct authenticated read/retrieve against Salesforce, prefer `sf`

### `cci` Owns

`cci` is allowed for:
- org registry bridge and validation
- project-aware validation tasks
- project-aware diagnostics tasks
- named, allowlisted task/flow execution from `cumulusci.yml`
- typed local jobs where the value comes from project context, not from replacing raw `sf` primitives

Current implementation examples:
- `cci version`
- `cci org info <alias>`
- `cci org import <source> <alias>`

Rule:
- if the task depends on project configuration, named flows, or project-aware orchestration, `cci` is a candidate

### GitHub / GitHub Actions Own

Local `gh` owns:
- interactive GitHub login / authorization on the operator machine
- local authenticated GitHub user context
- local fallback token resolution when a dedicated `GITHUB_TOKEN` override is not configured

GitHub owns:
- repository history and compare surfaces
- pull requests and review threads
- checks / required status surfaces
- workflow orchestration
- release artifact distribution

GitHub Actions is the preferred place for:
- shared validation flows
- benchmark publication
- longer-running `cci` jobs
- release-affecting or mutating project jobs

Rule:
- if the task is shared, review-facing, CI-facing, or release-facing, prefer GitHub / GitHub Actions
- if the task is local GitHub sign-in or local repo selection, prefer `gh`

## What Must Not Move To `cci`

The following must not be replatformed to `cci` as the default path:
- primary org authorization
- primary alias truth
- default raw metadata retrieve
- hidden background auth fallback
- unconstrained freeform operator command execution

Reason:
- this would blur the auth boundary, weaken determinism, and make the project-aware orchestration layer masquerade as the raw platform primitive

## What May Expand Into Typed `cci` Jobs

Safe early candidates:
- named validation jobs
- named diagnostics jobs
- project sanity checks
- controlled source-format or project-configuration inspections
- low-risk read-only tasks that already exist as stable `cci` task/flow units

Required properties of every typed `cci` job:
- allowlisted job type
- explicit mutability classification
- explicit timeout
- explicit cwd / repo binding
- structured stdout/stderr capture
- structured success/failure result
- audit trail in Orgumented history or job records

## Repository Destination Policy

Orgumented product repo:
- may contain product code
- may contain synthetic fixtures and test metadata intentionally maintained by the product team
- must not be the destination for user-retrieved org metadata

User metadata commit-capable workflows:
- must target a user-selected GitHub repository or another explicitly bound non-product workspace
- must never default to the Orgumented source repository
- must fail closed if no explicit destination repo/workspace is bound

This means:
- local retrieve into an app-data or runtime workspace is allowed
- semantic ingest from that runtime workspace is allowed
- commit/push of retrieved user metadata must go to the user-bound repo, not this product repo

## Safe Migration Sequence

### Phase 1: Keep Current Auth And Retrieve Contract

- keep `sf` as primary auth source
- keep `sf` as raw metadata retrieve path
- keep `cci` as alias bridge and project-aware support tooling

### Phase 2: Add Typed Local `cci` Job Registry

- define named job types
- add mutability classification
- add audit/log capture
- keep jobs read-only or low-risk first

### Phase 3: Add Explicit Repo Binding

- require a bound user repo before any commit-capable metadata workflow
- reject commit/push actions when only the Orgumented product repo is present
- keep runtime workspaces and source repos separate

### Phase 4: Route Shared And Release-Affecting Jobs Through GitHub Actions

- dispatch typed workflows from Orgumented
- ingest typed status back into Orgumented
- keep local semantic workflows independent when GitHub is unavailable

## Immediate Implementation Decisions

Effective now:
1. Org auth stays `sf`-first.
2. Metadata retrieve stays `sf`-first.
3. `cci` remains valid for alias bridge and typed project-aware jobs.
4. GitHub integration does not authorize orgs and does not replace `sf`.
5. No future metadata commit feature may target the Orgumented product repo by default.

## Bottom Line

The concrete tool policy is:
- `sf` for auth and raw Salesforce IO
- typed `cci` for project-aware orchestration
- GitHub / GitHub Actions for repo, review, CI, and release plumbing
- Orgumented for semantic judgment, proof, replay, and trust
