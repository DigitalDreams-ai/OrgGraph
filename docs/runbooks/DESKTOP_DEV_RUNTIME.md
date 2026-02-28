# Desktop Dev Runtime

Purpose: run Orgumented in the standalone Windows desktop-transition model.

## Current Direction
- Product target: desktop-native
- Supported desktop OS: Windows only
- UI framework: Next.js
- engine: NestJS
- shell: Tauri
- auth source of truth: local Salesforce CLI keychain

## Windows Prerequisites
1. `pnpm`
2. Node.js 20+
3. Salesforce CLI (`sf`)
4. CumulusCI (`cci`)
5. Rust toolchain (`cargo`, `rustc`)
6. Microsoft Edge WebView2 runtime

Non-goal for product support:
- Linux desktop runtime
- macOS desktop runtime

## Check Desktop Shell Readiness

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:info
```

Expected target reality on Windows:
- Rust toolchain present
- Tauri CLI present
- WebView2 runtime available

## Run Local Dev Runtime Without Docker

This starts:
- NestJS engine on a local port
- production-backed embedded UI on a local port

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
$env:ORGUMENTED_DESKTOP_API_PORT="3200"
$env:ORGUMENTED_DESKTOP_WEB_PORT="3201"
node apps/desktop/scripts/dev-runtime.mjs
```

Observed proof in current repo state:
- API builds, then starts from `dist/main.js`
- Web starts from the last verified production build
- On Windows, the runtime seeds standard local CLI paths for `sf`, `cci`, and Rust tooling
- both processes shut down cleanly on `SIGTERM`

Default runtime behavior:
- production mode is the default for desktop verification
- `apps/web` is built ahead of time and served by the standalone Next server artifact
- set `ORGUMENTED_DESKTOP_WEB_MODE=development` only when you intentionally need `next dev`
- set `ORGUMENTED_DESKTOP_WEB_REBUILD=1` when you want the runtime to force a fresh UI build before launch

## Run Tauri Dev Shell

On the supported Windows desktop runtime:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:dev
```

Observed proof in current repo state:
- `tauri dev` launches `target\debug\orgumented-desktop.exe`
- Windows shows an `Orgumented` desktop window
- Tauri now launches the local runtime through `node ./scripts/dev-runtime.mjs`
- the embedded UI no longer depends on `next dev` for the primary Windows proof path

## Build Packaged Desktop Runtime

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:build
```

Current packaged build behavior:
- `beforeBuildCommand` stages a packaged runtime under `apps/desktop/src-tauri/runtime/`
- `runtime/manifest.json` explicitly declares the packaged Node binary, API entry, web entry, and config entry used by the shell
- the staged runtime includes:
  - static web entry assets
  - bundled API entry at `runtime/api/main.cjs`
  - bundled `node.exe`
  - `config.json` with non-secret Salesforce runtime config snapshot from `.env` and current shell overrides
- packaged build preflight stops stale packaged desktop processes before restaging on Windows
- build-only API baggage is pruned from the staged runtime before Tauri bundles it
- only the native `better-sqlite3` dependency set remains under `runtime/api/node_modules`
- the package build emits:
  - `apps/desktop/src-tauri/target/release/orgumented-desktop.exe`
  - `apps/desktop/src-tauri/target/release/bundle/msi/Orgumented_0.1.0_x64_en-US.msi`
  - `apps/desktop/src-tauri/target/release/bundle/nsis/Orgumented_0.1.0_x64-setup.exe`

Observed packaged proof in current repo state:
- `orgumented-desktop.exe` started the bundled API runtime
- `http://127.0.0.1:3100/ready` returned `200`
- proof log: `logs/desktop-phase4-release.log`

## Run Packaged Desktop Smoke

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm desktop:build
pnpm desktop:smoke:release
```

Smoke artifacts:
- `logs/desktop-release-smoke.stdout.log`
- `logs/desktop-release-smoke.stderr.log`
- `logs/desktop-release-smoke-health.json`
- `logs/desktop-release-smoke-ready.json`
- `logs/desktop-release-smoke-ask.json`
- `logs/desktop-release-smoke-org-status.json`
- `logs/desktop-release-smoke-session-before.json`
- `logs/desktop-release-smoke-session-aliases.json`
- `logs/desktop-release-smoke-session-connect.json`
- `logs/desktop-release-smoke-session-after-connect.json`
- `logs/desktop-release-smoke-session-restore.json`
- `logs/desktop-release-smoke-result.json`

Current packaged smoke proof:
- shell launch succeeded
- `healthStatus=ok`
- `readyStatus=ready`
- Ask returned a deterministic proof ID
- alias inventory is captured from `/org/session/aliases`
- when local aliases are available, the smoke verifies `POST /org/session/connect` and restores the original session state before shutdown
- cleanup now retries until packaged `orgumented-desktop.exe` and bundled `node.exe` are actually gone

Optional deeper packaged auth proof:

```powershell
$env:ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH="1"
$env:ORGUMENTED_DESKTOP_SMOKE_ALIAS="orgumented-sandbox"
$env:ORGUMENTED_DESKTOP_SMOKE_SWITCH_ALIAS="orgumented-uat"
pnpm desktop:smoke:release
```

Rules:
- `ORGUMENTED_DESKTOP_SMOKE_ALIAS` chooses the alias used for attach proof
- if not set, the smoke prefers the current active alias, then the runtime active alias, then the first discovered alias
- `ORGUMENTED_DESKTOP_SMOKE_VERIFY_SWITCH=1` asks the smoke to verify alias switching as well
- `ORGUMENTED_DESKTOP_SMOKE_SWITCH_ALIAS` chooses the switch target explicitly
- when switch verification is requested, the smoke restores the original session alias or disconnected state before exit
- packaged runtime auth proof depends on `SF_INTEGRATION_ENABLED=true` in `.env`, `.env.local`, or the build shell

## Local Org Auth

Authenticate locally, not in Docker:

```powershell
sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default
sf org display --target-org orgumented-sandbox --json
cci org import orgumented-sandbox <sf-username>
cci org info orgumented-sandbox
```

Current operator rule:
- `sf` keychain auth is the attach requirement
- `cci` remains a supported local tool, but a failed `cci org import` does not block desktop session attach

## Local Session Validation Endpoints

With the API running locally:

```powershell
curl http://127.0.0.1:3200/org/session
curl http://127.0.0.1:3200/org/session/aliases
curl "http://127.0.0.1:3200/org/session/validate?alias=orgumented-sandbox"
curl http://127.0.0.1:3200/org/preflight
```

Wave F proof captured on February 28, 2026:
- local runtime on Windows resolved real aliases from `sf org list --json`
- attach succeeded for alias `shulman-dev2`
- session state returned `connected` with `activeAlias=shulman-dev2`

## Non-Target Environments

Repo development and planning can happen outside Windows, but the supported product runtime is the Windows desktop shell only.
Linux-specific Tauri launch blockers do not block the product path unless they also reproduce on Windows.
