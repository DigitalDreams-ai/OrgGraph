# Orgumented v2 Slice Evaluation Plan

Date: March 19, 2026  
Scoring authority used: `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`

## Initiative

Assumed initiative under evaluation:
- extend bounded GitHub support with typed workflow dispatch and status ingest in the local desktop runtime

Working description:
- keep local `gh` CLI as the GitHub auth and authorization plane
- reuse the selected repo binding already present in the engine
- add one typed allowlisted workflow lane for:
  - selected repo binding or explicit owner/repo
  - explicit workflow selection from an engine-owned allowlist
  - explicit ref plus typed optional inputs
  - recent-run status ingest scoped to the same workflow
- surface dispatch and status in Connect without turning GitHub into a runtime dependency
- avoid generic workflow mutation, arbitrary YAML execution, or hidden local fallback in this slice

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
- Wave 12: explicit user-bound repo binding for release and commit-capable workflows

Not in scope for this slice:
- GitHub release/artifact linkage
- arbitrary workflow dispatch outside the engine allowlist
- diff hunk parsing or patch analysis
- custom OAuth, GitHub App install flow, or hosted callback infrastructure

## Decision

Chosen path:
- Module rebuild / bounded extension

Why:
- existing GitHub support already exists for auth, repo binding, repo context, changed-file scope, and proof-bound PR publication
- the missing capability is bounded workflow execution visibility, not a subsystem replacement
- local `gh` reuse plus direct GitHub API reads/writes is the smallest viable path that satisfies the operator need without violating desktop-local runtime rules

## Acceptance Gates

1. Engine exposes a typed GitHub workflow-dispatch endpoint for an explicit allowlisted workflow set.
2. Dispatch resolves owner/repo explicitly or from the selected GitHub repo binding.
3. Dispatch requires an explicit workflow key and ref, and fails closed when either is missing or invalid.
4. Engine exposes a typed recent-run status endpoint for the same allowlisted workflows.
5. Connect workspace exposes workflow dispatch and recent-run status as a secondary support-plane surface without embedding GitHub policy logic in the UI.
6. Existing auth, repo-management, repo-context, changed-file scope, and proof-bound PR publication paths continue to work.
7. Focused API and web regression coverage passes.

## Risks To Control

1. Hidden auth fallback
- must fail closed if neither env token nor authenticated `gh` session is available

2. Scope creep
- this slice must stay inside an explicit workflow allowlist
- no arbitrary workflow mutation, YAML editing, or patch analysis should leak in under the Actions heading

3. Product repo contamination
- selected repo binding must remain explicit and local
- this slice must not silently target the Orgumented product repo for future commit-capable flows

4. UI bloat
- workflow dispatch and recent-run status must sit inside the existing Connect workflow with a calm secondary support-plane surface
