# Orgumented v2 Slice Evaluation Plan

Date: March 18, 2026  
Scoring authority used: `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`

## Initiative

Assumed initiative under evaluation:
- extend bounded GitHub support with read-only repo / branch / PR context in the local desktop runtime

Working description:
- keep local `gh` CLI as the GitHub auth and authorization plane
- reuse the selected repo binding already present in the engine
- add typed read-only repository context endpoints for:
  - repo metadata
  - recent branches
  - open pull requests
- surface the context in Connect without turning GitHub into a runtime dependency
- avoid mutation, Actions dispatch, and changed-file scope in this slice

## Intended Stage Alignment

Primary intended stage:
- Stage 1 support-plane hardening

Why:
- this does not change Orgumented semantic truth, proof, replay, or decision logic
- it removes low-value custom platform work and prepares the user-bound repo path already called out in the v2 roadmap

## Wave Mapping

Primary wave alignment:
- Wave 11: bug burn-down and CI / support-plane quality lock

Secondary support:
- Wave 7: read-only repo / branch / PR context support-track gate
- Wave 12: explicit user-bound repo binding for release and commit-capable workflows

Not in scope for this slice:
- GitHub Actions dispatch/status ingest
- GitHub release/artifact linkage
- changed-file scope read
- custom OAuth, GitHub App install flow, or hosted callback infrastructure

## Decision

Chosen path:
- Module rebuild / bounded extension

Why:
- existing GitHub support already exists for auth, repo binding, and proof-bound PR publication
- the missing capability is typed read-only repo context, not a subsystem replacement
- local `gh` reuse plus direct GitHub API reads is the smallest viable path that satisfies the operator need without violating desktop-local runtime rules

## Acceptance Gates

1. Engine exposes a typed read-only GitHub repo-context endpoint.
2. Repo context resolves owner/repo explicitly or from the selected GitHub repo binding.
3. Repo context returns repository metadata, recent branches, and open PR summaries without mutating GitHub state.
4. Connect workspace exposes the repo context as a secondary read-only surface without embedding GitHub policy logic in the UI.
5. Existing auth, repo-management, and proof-bound PR publication paths continue to work.
6. Focused API and web regression coverage passes.

## Risks To Control

1. Hidden auth fallback
- must fail closed if neither env token nor authenticated `gh` session is available

2. Scope creep
- this slice must stay read-only
- no workflow dispatch, mutation, or changed-file ingestion should leak in under the repo-context heading

3. Product repo contamination
- selected repo binding must remain explicit and local
- this slice must not silently target the Orgumented product repo for future commit-capable flows

4. UI bloat
- GitHub controls must sit inside the existing Connect workflow with a calm secondary evidence surface
