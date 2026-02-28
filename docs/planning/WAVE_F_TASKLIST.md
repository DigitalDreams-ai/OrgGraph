# Wave F Tasklist - Desktop Foundation and Runtime Cutover

Objective: move Orgumented onto a desktop-native runtime foundation before further product UX work.

## Scope
- Establish Tauri as the desktop shell.
- Keep Next.js for UI and NestJS for the semantic engine.
- Deprecate Docker as a product runtime.
- Replace container-shaped auth/runtime assumptions with local CLI-backed alias workflows.
- Define local app data, logging, and diagnostic boundaries.

## Tasks
- [ ] Add a desktop transition section to all primary planning references.
- [ ] Stand up Tauri shell scaffold for Orgumented desktop.
- [ ] Define local process lifecycle for launching and stopping the NestJS engine.
- [ ] Define local app data root and storage paths for graph, evidence, proofs, logs, and history.
- [ ] Create a single tool-adapter boundary around `sf` and `cci`.
- [ ] Implement local alias discovery from `sf org list --json`.
- [ ] Implement local alias validation from `sf org display --target-org <alias> --json`.
- [ ] Implement attach/switch/disconnect session flows without Docker/runtime indirection.
- [ ] Remove browser-broker, VNC, and other headless browser auth experiments from the target design and active runtime plan.
- [ ] Remove remaining primary-doc instructions that treat Docker as required product runtime.
- [ ] Define operator diagnostics for missing `sf`, missing `cci`, invalid alias, and disconnected session states.
- [ ] Define local dev/test strategy after Docker product-runtime deprecation.

## Exit Gates
- [ ] Desktop shell launches successfully.
- [ ] Local NestJS engine runs under desktop-managed lifecycle.
- [ ] Operator can discover at least one locally authenticated alias through Orgumented desktop.
- [ ] Operator can attach an existing alias without using Docker, browser brokers, or legacy auth paths.
- [ ] Local app data, logs, and proof paths are explicit and functioning.
- [ ] Docker is documented as migration/dev scaffolding only, not target runtime.

## Dependencies
- `docs/planning/DESKTOP_ARCHITECTURE.md`
- `docs/planning/DESKTOP_TRANSITION_PLAN.md`
- `docs/planning/LEGACY_REMOVAL_REGISTER.md`
- `docs/planning/REUSE_REFACTOR_DELETE_MATRIX.md`
- `docs/planning/DESKTOP_UX_BLUEPRINT.md`

## Evidence Required
- desktop shell startup artifact
- local engine startup artifact
- alias discovery sample
- alias attach sample
- updated docs showing Docker deprecation as product runtime
