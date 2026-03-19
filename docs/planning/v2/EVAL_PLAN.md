# Orgumented v2 Slice Evaluation Plan

Date: March 19, 2026  
Scoring authority used: `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`

## Initiative

Assumed initiative under evaluation:
- extend bounded GitHub support with read-only pull-request changed-file scope in the local desktop runtime

Working description:
- keep local `gh` CLI as the GitHub auth and authorization plane
- reuse the selected repo binding already present in the engine
- add one typed read-only pull-request file-scope endpoint for:
  - selected repo binding or explicit owner/repo
  - explicit pull request selection
  - changed-file metadata only
- surface the file scope in Connect without turning GitHub into a runtime dependency
- avoid mutation, Actions dispatch, and diff/patch parsing in this slice

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
- Wave 7: repo-backed review context support-track gate
- Wave 12: explicit user-bound repo binding for release and commit-capable workflows

Not in scope for this slice:
- GitHub Actions dispatch/status ingest
- GitHub release/artifact linkage
- diff hunk parsing or patch analysis
- custom OAuth, GitHub App install flow, or hosted callback infrastructure

## Decision

Chosen path:
- Module rebuild / bounded extension

Why:
- existing GitHub support already exists for auth, repo binding, repo context, and proof-bound PR publication
- the missing capability is typed changed-file scope read, not a subsystem replacement
- local `gh` reuse plus direct GitHub API reads is the smallest viable path that satisfies the operator need without violating desktop-local runtime rules

## Acceptance Gates

1. Engine exposes a typed read-only GitHub PR file-scope endpoint.
2. File scope resolves owner/repo explicitly or from the selected GitHub repo binding.
3. File scope requires an explicit `pullNumber` and fails closed when it is missing or invalid.
4. File scope returns changed-file metadata deterministically without mutating GitHub state.
5. Connect workspace exposes the file scope as a secondary read-only surface without embedding GitHub policy logic in the UI.
6. Existing auth, repo-management, repo-context, and proof-bound PR publication paths continue to work.
7. Focused API and web regression coverage passes.

## Risks To Control

1. Hidden auth fallback
- must fail closed if neither env token nor authenticated `gh` session is available

2. Scope creep
- this slice must stay read-only
- no workflow dispatch, mutation, or patch analysis should leak in under the file-scope heading

3. Product repo contamination
- selected repo binding must remain explicit and local
- this slice must not silently target the Orgumented product repo for future commit-capable flows

4. UI bloat
- changed-file scope must sit inside the existing Connect workflow with a calm secondary evidence surface
