# Orgumented v2 Slice Evaluation Plan

Date: March 17, 2026  
Scoring authority used: `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`

## Initiative

Assumed initiative under evaluation:
- add bounded GitHub auth and repo-management support to the local desktop runtime

Working description:
- use local `gh` CLI as the GitHub auth and authorization plane
- keep GitHub repo browsing and creation inside the local Nest engine as typed, fail-closed operations
- persist one explicit user-selected GitHub repo binding for future commit-capable metadata workflows
- avoid inventing custom OAuth/App-install machinery in this slice

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
- GitHub Actions dispatch/status ingest
- GitHub release/artifact linkage
- custom OAuth, GitHub App install flow, or hosted callback infrastructure

## Decision

Chosen path:
- Module rebuild / bounded extension

Why:
- existing GitHub support already exists for proof-bound PR comment publication
- the missing capability is auth/session and repo management, not a full subsystem replacement
- local `gh` reuse is the smallest viable path that satisfies the operator need without violating desktop-local runtime rules

## Acceptance Gates

1. Engine exposes typed GitHub session status and login endpoints.
2. Engine can list accessible repos for the authenticated local GitHub user.
3. Engine can create a new repo and persist it as the selected Orgumented repo binding.
4. Engine can validate and switch the selected repo binding explicitly.
5. Connect workspace exposes the GitHub auth/session and repo-management path without embedding GitHub policy logic in the UI.
6. Existing proof-bound PR publication continues to work and can resolve owner/repo from the selected binding when request fields are omitted.
7. Focused API and web regression coverage passes.

## Risks To Control

1. Hidden auth fallback
- must fail closed if neither env token nor authenticated `gh` session is available

2. Product repo contamination
- selected repo binding must remain explicit and local
- this slice must not silently target the Orgumented product repo for future commit-capable flows

3. Interactive login fragility
- login must be treated as a local operator action through `gh`, not a headless server-side OAuth flow

4. UI bloat
- GitHub controls must sit inside the existing Connect workflow with progressive disclosure where needed
