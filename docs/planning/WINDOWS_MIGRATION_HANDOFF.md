# Windows Migration Handoff

Status: active Wave F handoff for the Windows desktop cutover.
Last updated: February 28, 2026.

## Current Branch
- `wave-f`

## Current Direction
- Product runtime target: Windows desktop only
- Desktop shell: Tauri
- UI framework: Next.js embedded in Tauri
- Semantic engine: NestJS
- Auth source of truth: local Salesforce CLI keychain
- `cci`: supported local tool, not primary auth owner
- Product form: standalone desktop application, not a hosted web app

## Verified Baseline As Of February 28, 2026

### Repo and planning alignment
- `BLUE_OCEAN_EXECUTION_PLAN.md` and `BLUE_OCEAN_PHASE_ROADMAP.md` both point to a Windows-only desktop target for Waves F-G.
- `WAVE_F_TASKLIST.md` now shows two open product gates:
  1. alias discovery through Orgumented desktop on Windows
  2. alias attach through Orgumented desktop on Windows

### Already completed in Wave F
- Tauri shell scaffold exists under `apps/desktop`.
- Desktop dev runtime orchestrator exists under `apps/desktop/scripts/dev-runtime.mjs`.
- Windows desktop packaging now succeeds via `pnpm desktop:build`.
- Windows-aware runtime path defaults are in place.
- Single `sf` / `cci` tool-adapter boundary exists in the API.
- Alias discovery, validation, attach, switch, and disconnect session flows exist in the API.
- Operator diagnostics cover missing `sf`, missing `cci`, invalid alias, and disconnected session states.
- Primary planning/docs now treat desktop and local CLI runtime as the preferred path.

### Verified previously on the NAS
- `pnpm --filter api test:validation`
- `pnpm --filter api exec ts-node --transpile-only test/runtime-paths.ts`
- `ORGUMENTED_DESKTOP_API_PORT=3200 ORGUMENTED_DESKTOP_WEB_PORT=3201 timeout 20s node apps/desktop/scripts/dev-runtime.mjs`

Those NAS checks only prove local engine/orchestrator viability. They do not satisfy the Windows-only Wave F product gates.

## Windows Machine Findings

### MCP findings
- Codex on this machine originally carried browser-oriented MCP tooling that is not required for the standalone desktop app.
- Cursor on this machine originally had browser-oriented MCPs plus `github`, and `github` used a hardcoded bearer token in `C:\Users\sean\.cursor\mcp.json`.
- No working `project-memory` MCP registration existed for the Windows repo.
- No separate `postgres` MCP is required for the default Wave F desktop workflow.
- In the current Codex session, `project-memory` exposes no MCP resources/templates, so continuity updates must be treated as store-backed rather than interactive resource browsing.

### MCP decisions for the Windows desktop toolchain
- Required by default:
  - `github`
  - `project-memory`
- Optional only when the client lacks direct workspace file access:
  - `filesystem`
- Optional and on-demand only:
  - `postgres`

Rationale:
- Wave F/G work is desktop-local and Windows-first.
- Postgres remains relevant for storage/parity work, but not for the core Windows desktop cutover.

## Changes Applied For The Handoff

### Repo changes
- Added committed Cursor project MCP config at `.cursor/mcp.json` for `project-memory`.
- Replaced the shell-only `project-memory` launcher with a cross-platform Node launcher:
  - `scripts/project-memory-mcp.mjs`
- Updated `npm run mcp:project-memory` to use the cross-platform launcher.
- Updated the `project-memory` smoke test to use the new launcher.
- Updated planning and operator docs to be Windows-first for desktop runtime and MCP setup.
- Updated `AGENTS.md` so only the standalone desktop MCP baseline is treated as default.

### Local machine config changes expected
1. Move GitHub MCP auth out of plaintext config and into a user environment variable.
2. Keep only `github` in user-level Cursor config.
3. Let repo-local `.cursor/mcp.json` supply `project-memory`.
4. Add `project-memory` and `github` to Codex MCP config on Windows.
5. Do not restore browser-oriented or legacy runtime MCPs to the default setup.
6. Do not add `docker`, `chrome-devtools`, `playwright`, `postgres`, or `filesystem` MCPs back to the default Windows desktop configuration unless a specific task proves the need.

## Required Windows Verification Steps

### Verified in this Windows session
```powershell
pnpm --filter web build
pnpm --filter api test
pnpm --filter @orgumented/project-memory-mcp test
pnpm desktop:build
node apps/desktop/scripts/dev-runtime.mjs
pnpm desktop:dev
```

Observed proof:
- embedded UI production build passes
- API validation, parser, and integration suites pass
- `project-memory` MCP tests pass
- desktop installers are produced at:
  - `apps/desktop/src-tauri/target/release/bundle/msi/Orgumented_0.1.0_x64_en-US.msi`
  - `apps/desktop/src-tauri/target/release/bundle/nsis/Orgumented_0.1.0_x64-setup.exe`
- direct desktop runtime proof succeeded with:
  - `http://127.0.0.1:3001` returning `200`
  - `http://127.0.0.1:3100/ready` returning `200`
- Tauri shell proof succeeded with:
  - `tauri dev` reaching `Running target\\debug\\orgumented-desktop.exe`
  - Windows process `orgumented-desktop.exe`
  - visible window title `Orgumented`

### 1. Tooling and desktop prerequisites
```powershell
Set-Location "C:\Users\sean\Projects\GitHub\OrgGraph"
node --version
pnpm --version
sf --version
cci version
cargo --version
rustc --version
pnpm desktop:info
```

Expected:
- Node, pnpm, sf, cci, cargo, and rustc all resolve
- `pnpm desktop:info` reports Tauri/WebView2 readiness

### 2. Local CLI auth baseline
```powershell
sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default
sf org display --target-org orgumented-sandbox --json
cci org import orgumented-sandbox <sf-username>
cci org info orgumented-sandbox
```

### 3. Local desktop-transition runtime without Docker
```powershell
Set-Location "C:\Users\sean\Projects\GitHub\OrgGraph"
$env:ORGUMENTED_DESKTOP_API_PORT="3200"
$env:ORGUMENTED_DESKTOP_WEB_PORT="3201"
node apps/desktop/scripts/dev-runtime.mjs
```

Then verify:
```powershell
curl http://127.0.0.1:3200/org/session
curl http://127.0.0.1:3200/org/session/aliases
curl "http://127.0.0.1:3200/org/session/validate?alias=orgumented-sandbox"
curl http://127.0.0.1:3200/org/preflight
```

### 4. Launch the real Tauri shell on Windows
```powershell
Set-Location "C:\Users\sean\Projects\GitHub\OrgGraph"
pnpm desktop:dev
```

Status:
- shell launch is now proven on Windows
- the remaining Wave F product-runtime work is org-session UX proof inside the shell

### 5. Verify Windows MCPs
```powershell
Set-Location "C:\Users\sean\Projects\GitHub\OrgGraph"
pnpm --filter @orgumented/project-memory-mcp build
pnpm --filter @orgumented/project-memory-mcp test
codex mcp list
codex mcp get project-memory
codex mcp get github
```

Expected Windows MCP state:
- `project-memory`: enabled in Codex and available in Cursor via `.cursor/mcp.json`
- `github`: enabled in Codex and Cursor without a plaintext token in config files

## Immediate Next Implementation Slice After Environment Is Stable
1. Surface alias inventory directly in the desktop shell UX.
2. Prove alias discovery through the shell against a real local alias.
3. Prove alias attach through the shell.
4. Record those org-session proof artifacts and close the remaining Wave F exit gates.

Do not start the major Wave G UX migration before those proofs exist.

## Important References
- `docs/planning/BLUE_OCEAN_EXECUTION_PLAN.md`
- `docs/planning/BLUE_OCEAN_PHASE_ROADMAP.md`
- `docs/planning/DESKTOP_ARCHITECTURE.md`
- `docs/planning/DESKTOP_TRANSITION_PLAN.md`
- `docs/planning/WAVE_F_TASKLIST.md`
- `docs/planning/WAVE_G_TASKLIST.md`
- `docs/runbooks/DESKTOP_DEV_RUNTIME.md`
- `docs/runbooks/PROJECT_MEMORY_MCP.md`

## Operating Notes
- Do not spend more time on Linux/macOS desktop runtime blockers.
- Do not re-introduce legacy auth paths.
- Do not treat Docker as a first-class runtime or default MCP dependency again.
- Do not keep GitHub tokens in plaintext MCP config files.
- Do not begin the large desktop UX overhaul before alias discovery and attach are proven through the Windows shell.

## Resume Objective
Resume from Wave F on Windows with this objective:
- prove the desktop shell and real local org session lifecycle on the target platform
- prove the Windows MCP/tooling baseline is stable
- then continue into the Ask-first desktop UX work
