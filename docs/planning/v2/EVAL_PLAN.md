# Orgumented v2 Slice Evaluation Plan

Date: March 19, 2026  
Scoring authority used: `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`

## Initiative

Assumed initiative under evaluation:
- extend bounded GitHub support with explicit repo-binding safety for future commit-capable metadata workflows

Working description:
- keep local `gh` CLI as the GitHub auth and authorization plane
- reuse the selected repo binding already present in the engine
- expose a typed repo-binding safety read path in the engine and Connect workspace
- resolve the Orgumented product repo identity from config or local `origin`
- mark the binding blocked when the selected repo is missing or points at the product repo
- keep this as a support-plane safety surface without turning GitHub into a runtime dependency
- avoid adding actual commit/push metadata publication in this slice

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
- first commit-capable metadata export/publication implementation
- diff hunk parsing or patch analysis
- custom OAuth, GitHub App install flow, or hosted callback infrastructure

## Decision

Chosen path:
- Module rebuild / bounded extension

Why:
- existing GitHub support already exists for auth, repo binding, repo context, changed-file scope, workflow lanes, and proof-bound PR publication
- the missing capability is execution-visible repo-binding safety, not a subsystem replacement
- local repo-binding inspection plus product-repo identity resolution is the smallest viable path that turns the current docs-only policy into an engine-enforced gate

## Acceptance Gates

1. Engine exposes a typed repo-binding status endpoint for the selected repo.
2. Product repo identity resolves from explicit config or the local `origin` remote.
3. The binding is blocked when no selected repo exists.
4. The binding is blocked when the selected repo equals the Orgumented product repo.
5. Connect workspace exposes binding readiness as a calm secondary support-plane surface without adding new primary workflow chrome.
6. Existing auth, repo-management, repo-context, changed-file scope, workflow dispatch, and proof-bound PR publication paths continue to work.
7. Focused API and web regression coverage passes.

## Risks To Control

1. Hidden auth fallback
- must fail closed if neither env token nor authenticated `gh` session is available

2. Scope creep
- this slice must stay on repo-binding safety only
- no commit/push metadata publication should leak in before the first real commit-capable flow is deliberately chosen

3. Product repo contamination
- selected repo binding must remain explicit and local
- this slice must mark the Orgumented product repo as blocked for future commit-capable flows

4. UI bloat
- repo-binding safety must sit inside the existing Connect workflow with a calm secondary support-plane surface
