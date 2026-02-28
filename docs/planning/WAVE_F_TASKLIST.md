# Wave F Tasklist - Desktop Foundation and Runtime Cutover

Objective: move Orgumented onto a desktop-native runtime foundation before further product UX work.

## Scope
- Establish Tauri as the desktop shell.
- Target Windows only for desktop runtime support.
- Keep Next.js as the embedded desktop UI layer and NestJS as the semantic engine.
- Deprecate Docker as a product runtime.
- Replace container-shaped auth/runtime assumptions with local CLI-backed alias workflows.
- Define local app data, logging, and diagnostic boundaries.

## Tasks
- [x] Add a desktop transition section to all primary planning references.
- [x] Stand up Tauri shell scaffold for Orgumented desktop.
- [x] Define local process lifecycle for launching and stopping the NestJS engine.
- [x] Define local app data root and storage paths for graph, evidence, proofs, logs, and history.
- [x] Create a single tool-adapter boundary around `sf` and `cci`.
- [x] Implement local alias discovery from `sf org list --json`.
- [x] Implement local alias validation from `sf org display --target-org <alias> --json`.
- [x] Implement attach/switch/disconnect session flows without Docker/runtime indirection.
- [x] Remove browser-broker, VNC, and other headless browser auth experiments from the target design and active runtime plan.
- [x] Remove remaining primary-doc instructions that treat Docker or hosted web runtime as the active product path.
- [x] Define operator diagnostics for missing `sf`, missing `cci`, invalid alias, and disconnected session states.
- [x] Define local dev/test strategy for the standalone Windows desktop runtime.

## Exit Gates
- [ ] Desktop shell launches successfully on Windows.
- [x] Local NestJS engine runs under desktop-managed lifecycle.
- [ ] Operator can discover at least one locally authenticated alias through Orgumented desktop on Windows.
- [ ] Operator can attach an existing alias without using Docker, browser brokers, or legacy auth paths on Windows.
- [x] Local app data, logs, and proof paths are explicit and functioning.
- [x] Active docs treat the standalone Windows desktop app as the only product runtime.

## Dependencies
- `docs/planning/DESKTOP_ARCHITECTURE.md`
- `docs/planning/DESKTOP_TRANSITION_PLAN.md`
- `docs/planning/LEGACY_REMOVAL_REGISTER.md`
- `docs/planning/REUSE_REFACTOR_DELETE_MATRIX.md`
- `docs/planning/DESKTOP_UX_BLUEPRINT.md`

## Evidence Required
- Windows desktop package artifact (`.msi` or `.exe`)
- Windows desktop shell startup artifact
- local engine startup artifact
- alias discovery sample
- alias attach sample
- updated docs showing Docker deprecation as product runtime
- Windows MCP verification summary for the desktop operator toolchain (`github` and `project-memory`)
