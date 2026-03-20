# Release Artifact Paths

Use this file as the canonical path reference for packaged desktop release evidence.

All paths are relative to the repository root:

`C:\Users\sean\Projects\GitHub\Orgumented`

## Packaged Desktop Outputs

Desktop executable:

- `apps/desktop/src-tauri/target/release/orgumented-desktop.exe`

Installer outputs:

- `apps/desktop/src-tauri/target/release/bundle/msi/Orgumented_0.1.0_x64_en-US.msi`
- `apps/desktop/src-tauri/target/release/bundle/nsis/Orgumented_0.1.0_x64-setup.exe`

Packaged runtime API bundle:

- `apps/desktop/src-tauri/target/release/runtime/api/main.cjs`

## Smoke Artifacts

Smoke JSON:

- latest matching file under `logs/desktop-release-smoke-*.json`

Smoke logs:

- latest matching file under `logs/desktop-release-smoke.*.log`

Common examples:

- `logs/desktop-release-smoke.stdout.log`
- `logs/desktop-release-smoke.stderr.log`
- `logs/desktop-release-smoke.json`
- `logs/desktop-release-smoke-result.json`
- `logs/desktop-release-smoke-ingest-latest.json`
- `logs/desktop-release-smoke-refresh-summary.json`
- `logs/desktop-release-smoke-refresh-diff.json`
- `logs/desktop-release-smoke-org-pipeline.json`

## GitHub Actions Artifact Links

Use Connect -> GitHub Actions -> `Load Artifacts` to capture repo-native workflow artifact links for the selected repo binding.

Recommended release-evidence linkage:

- workflow key that produced the artifact (`ci_validate` or `runtime_nightly`)
- GitHub Actions run URL
- artifact name
- artifact download URL

Recommended rollback-target linkage:

- last known-good GitHub artifact URL for the installer/smoke evidence bundle used as the rollback reference

## Real-Org Operator Proof Artifacts

Canonical proof results log:

- `docs/planning/v2/REAL_ORG_OPERATOR_PROOF_RESULTS.md`

Clean-machine worksheet:

- `docs/runbooks/CLEAN_MACHINE_OPERATOR_PROOF.md`

Real-org quickstart:

- `docs/runbooks/REAL_ORG_DESKTOP_QUICKSTART.md`

## Required Release Evidence References

Every release candidate should record:

1. packaged executable path
2. installer path actually used for validation
3. smoke JSON path
4. smoke log path
5. real-org operator proof result location
6. rollback target installer path
7. rollback target smoke artifact path
8. GitHub artifact workflow key
9. GitHub artifact run URL
10. GitHub artifact download URL
11. rollback target GitHub artifact URL

If any of these paths are unknown, the release evidence is incomplete.

