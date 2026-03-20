# Orgumented v2 Slice Evaluation Plan

Date: March 19, 2026  
Scoring authority used: `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`

## Initiative

Assumed initiative under evaluation:
- extend bounded GitHub support with typed release-artifact linkage for Wave 12 evidence

Working description:
- keep local `gh` CLI as the GitHub auth and authorization plane
- reuse the selected repo binding already present in the engine
- expose a typed workflow-artifact read path in the engine for allowlisted workflows
- surface recent artifact links in Connect without widening local semantic execution
- wire canonical release evidence to record GitHub artifact workflow/run/download links
- keep this as release-evidence linkage, not GitHub Releases publishing or release creation

## Intended Stage Alignment

Primary intended stage:
- Stage 1 support-plane hardening

Why:
- this does not change Orgumented semantic truth, proof, replay, or decision logic
- it removes low-value custom platform work and prepares the user-bound repo path already called out in the v2 roadmap

## Wave Mapping

Primary wave alignment:
- Wave 12: release readiness and operator proof

Secondary support:
- Wave 11: keep the allowlisted support plane typed and bounded

Not in scope for this slice:
- GitHub release creation or tag publication
- first commit-capable metadata export/publication implementation
- diff hunk parsing or patch analysis
- custom OAuth, GitHub App install flow, or hosted callback infrastructure

## Decision

Chosen path:
- Module rebuild / bounded extension

Why:
- existing GitHub support already exists for auth, repo binding, repo context, changed-file scope, workflow lanes, and proof-bound PR publication
- the missing capability is release-facing artifact linkage from the canonical evidence record, not broader GitHub platform expansion
- typed workflow artifact reads plus release-evidence fields close a real Wave 12 gate without pretending GitHub replaces local proof identity

## Acceptance Gates

1. Engine exposes a typed workflow-artifact read endpoint for allowlisted workflows.
2. Artifact reads remain repo-bound and workflow-allowlisted.
3. Connect workspace exposes recent artifacts as a calm secondary support-plane surface.
4. Canonical release evidence records GitHub artifact workflow/run/download linkage explicitly.
5. Release evidence checker understands the new GitHub artifact fields.
6. Existing auth, repo-management, repo-context, changed-file scope, workflow dispatch, and proof-bound PR publication paths continue to work.
7. Focused API, web, and release-evidence regression coverage passes.

## Risks To Control

1. Hidden auth fallback
- must fail closed if neither env token nor authenticated `gh` session is available

2. Scope creep
- this slice must stay on release-artifact linkage only
- no GitHub Release publishing or broad workflow browsing should leak in here

3. Artifact ambiguity
- release docs must record which workflow/run/artifact backed the candidate
- the slice must not imply GitHub artifacts replace local proof or replay storage

4. UI bloat
- release-artifact linkage must sit inside the existing GitHub Actions surface with a calm secondary support-plane presentation
