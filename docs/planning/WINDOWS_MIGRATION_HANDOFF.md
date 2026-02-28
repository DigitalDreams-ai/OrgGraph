# Windows Migration Handoff

Status: active handoff for moving Orgumented desktop work from the Synology NAS to a Windows workstation.

## Current Branch
- `wave-f`

## Current Direction
- Product runtime target: Windows desktop only
- Desktop shell: Tauri
- UI framework: Next.js
- Semantic engine: NestJS
- Auth source of truth: local Salesforce CLI keychain
- `cci`: supported local tool, not primary auth owner
- Docker: migration/dev scaffolding only, not product runtime

## Recent Commits
1. `5253e16` `feat(api): make desktop path defaults windows-aware`
2. `e2fa08f` `docs(desktop): scope transition to windows runtime`
3. `c3d6a65` `docs(runtime): align operator docs with desktop transition`
4. `4899176` `feat(desktop): add local dev runtime orchestrator`
5. `16cd8ff` `feat(org): verify local session lifecycle and diagnostics`
6. `cbfec43` `docs(wave-f): mark tauri scaffold complete`
7. `2ed6a15` `feat(desktop): scaffold tauri shell workspace`
8. `ce63a16` `feat(org): add alias discovery and validation endpoints`
9. `3a6451c` `docs(wave-f): mark alias inventory slice complete`
10. `e719076` `feat(api): add runtime path policy and org cli adapter boundary`
11. `5d9582c` `docs(project-memory): refresh baseline for desktop transition`

## What Is Already Done

### Wave F foundation completed
- Desktop planning set created and aligned to the roadmap.
- Tauri shell scaffold added under `apps/desktop`.
- Local desktop dev runtime orchestrator added.
- Runtime path policy added to the API.
- Default desktop app-data behavior is now Windows-aware.
- Single `sf` / `cci` adapter boundary added in the API.
- Local alias discovery endpoint added.
- Local alias validation endpoint added.
- Attach / switch / disconnect session flows added.
- Operator diagnostics improved for:
  - missing `sf`
  - missing `cci`
  - invalid alias
  - disconnected session
- Primary docs now treat desktop/local CLI runtime as the preferred path.
- Desktop transition is now explicitly scoped to Windows only.

### Key files already in place
- Desktop shell:
  - `apps/desktop/package.json`
  - `apps/desktop/scripts/dev-runtime.mjs`
  - `apps/desktop/src-tauri/tauri.conf.json`
- Runtime path policy:
  - `apps/api/src/common/path.ts`
  - `apps/api/src/config/runtime-paths.service.ts`
- Org CLI boundary and session flows:
  - `apps/api/src/modules/org/org-tool-adapter.service.ts`
  - `apps/api/src/modules/org/org.service.ts`
  - `apps/api/src/modules/org/org.controller.ts`
  - `apps/api/src/modules/org/org.types.ts`
- Validation tests:
  - `apps/api/test/runtime-paths.ts`
  - `apps/api/test/org-service.ts`

## What Was Verified On The NAS

### Verified successfully
1. API validation
- `pnpm --filter api test:validation`
- passed

2. Runtime path test
- `pnpm --filter api exec ts-node --transpile-only test/runtime-paths.ts`
- passed

3. Desktop runtime orchestrator
- command used:
  - `ORGUMENTED_DESKTOP_API_PORT=3200 ORGUMENTED_DESKTOP_WEB_PORT=3201 timeout 20s node apps/desktop/scripts/dev-runtime.mjs`
- verified:
  - API builds successfully
  - Nest starts successfully
  - org session routes are exposed
  - Next dev server starts successfully
  - processes shut down cleanly under timeout

### What was not verified on the NAS
- Real Tauri desktop shell launch as a product runtime target
- Real Windows WebView2 behavior
- Real Windows local `sf` / `cci` integration
- Real Windows alias attach through the desktop shell

This is expected because the NAS is not the target desktop platform.

## Remaining Wave F Work
Wave F is not finished.

Still open:
1. Desktop shell launches successfully on Windows.
2. Operator can discover at least one locally authenticated alias through Orgumented desktop on Windows.
3. Operator can attach an existing alias without Docker, browser brokers, or legacy auth paths on Windows.

## Recommended Immediate Next Steps On Windows

### 1. Clone repo and switch to the right branch
```bash
git clone <repo-url>
cd OrgGraph
git checkout wave-f
pnpm install
```

### 2. Install local prerequisites on Windows
- Node.js 20+
- `pnpm`
- Rust toolchain
- Salesforce CLI (`sf`)
- CumulusCI `3.78.0`
- Microsoft Edge WebView2 Runtime

### 3. Verify local tooling
```bash
node --version
pnpm --version
sf --version
cci version
cargo --version
rustc --version
pnpm desktop:info
```

### 4. Authenticate locally on Windows
```bash
sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default
sf org display --target-org orgumented-sandbox --json
cci org import orgumented-sandbox <sf-username>
cci org info orgumented-sandbox
```

### 5. Verify local desktop-transition runtime without Docker
```bash
ORGUMENTED_DESKTOP_API_PORT=3200 ORGUMENTED_DESKTOP_WEB_PORT=3201 node apps/desktop/scripts/dev-runtime.mjs
```
Then verify:
```bash
curl http://127.0.0.1:3200/org/session
curl http://127.0.0.1:3200/org/session/aliases
curl "http://127.0.0.1:3200/org/session/validate?alias=orgumented-sandbox"
curl http://127.0.0.1:3200/org/preflight
```

### 6. Launch the Tauri shell on Windows
```bash
pnpm desktop:dev
```
This is the first real Wave F product-runtime gate.

## Recommended Next Implementation Slice After Move
After the repo is running on Windows, the next correct slice is:
1. Add Windows readiness diagnostics into the desktop shell/runtime.
2. Surface alias inventory directly in the desktop shell UX.
3. Prove alias attach through the shell.
4. Record Wave F artifacts and close the remaining exit gates.

Do not jump to a large UI overhaul before those gates pass.

## MCP Migration Notes
If Codex/Cursor is moved to Windows, MCPs should be treated as environment-bound.

### Expected to work after reconfiguration
- `filesystem`
- `github`
- `project-memory`

### May need additional setup or may matter less
- `docker`
- `postgres`

### Required migration actions
1. Copy/update Codex config on Windows.
2. Repoint MCP paths to the Windows repo location.
3. Migrate `project-memory` store if continuity is wanted:
   - `data/project-memory/events.jsonl`
4. Re-test MCPs one by one.

## Project Memory Context
`project-memory` is active and already updated for the desktop transition.

Current advisory work item:
- `pmem_a8e3cf1a66f0aec3d50f7486` `Wave F desktop foundation slice`

Current baseline reflects:
- API runtime
- Operator surfaces
- Desktop transition architecture
- Ontology package
- Planning and wave governance

## Important Planning References
- `docs/planning/BLUE_OCEAN_EXECUTION_PLAN.md`
- `docs/planning/BLUE_OCEAN_PHASE_ROADMAP.md`
- `docs/planning/DESKTOP_ARCHITECTURE.md`
- `docs/planning/DESKTOP_TRANSITION_PLAN.md`
- `docs/planning/LEGACY_REMOVAL_REGISTER.md`
- `docs/planning/REUSE_REFACTOR_DELETE_MATRIX.md`
- `docs/planning/DESKTOP_UX_BLUEPRINT.md`
- `docs/planning/WAVE_F_TASKLIST.md`
- `docs/planning/WAVE_G_TASKLIST.md`

## Operating Notes
- Do not spend more time on Linux/macOS desktop runtime issues.
- Do not re-introduce legacy auth paths.
- Do not treat Docker as a first-class product runtime again.
- Do not begin the major desktop UI overhaul before alias discovery and attach work through the Windows shell is proven.

## Resume Point
Resume from Wave F on Windows with this objective:
- prove the desktop shell and real local org session lifecycle on the target platform, then continue into the fresh Ask-first desktop UX.
