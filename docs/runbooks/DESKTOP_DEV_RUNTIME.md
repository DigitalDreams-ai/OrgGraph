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
- the staged runtime includes:
  - static web entry assets
  - deployed API runtime
  - bundled `node.exe`
- the package build emits:
  - `apps/desktop/src-tauri/target/release/orgumented-desktop.exe`
  - `apps/desktop/src-tauri/target/release/bundle/msi/Orgumented_0.1.0_x64_en-US.msi`
  - `apps/desktop/src-tauri/target/release/bundle/nsis/Orgumented_0.1.0_x64-setup.exe`

Observed packaged proof in current repo state:
- `orgumented-desktop.exe` started the bundled API runtime
- `http://127.0.0.1:3100/ready` returned `200`
- proof log: `logs/desktop-phase4-release.log`

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
