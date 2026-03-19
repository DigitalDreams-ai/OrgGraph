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
Set-Location "$env:USERPROFILE\Projects\GitHub\Orgumented"
pnpm desktop:info
```

Expected target reality on Windows:
- Rust toolchain present
- Tauri CLI present
- WebView2 runtime available

## Run Local Dev Runtime

This starts:
- NestJS engine on a local port
- production-backed embedded UI on a local port

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\Orgumented"
$env:ORGUMENTED_DESKTOP_API_PORT="3200"
$env:ORGUMENTED_DESKTOP_WEB_PORT="3201"
node apps/desktop/scripts/dev-runtime.mjs
```

Observed proof in current repo state:
- API builds, then starts from `dist/main.js`
- Web starts from the last verified production build
- On Windows, the runtime seeds standard local CLI paths for `sf`, `cci`, and Rust tooling
- desktop-managed API startup now defaults `ORGUMENTED_BOOTSTRAP_ON_STARTUP=true`
- when the runtime graph/evidence state is empty, the API bootstraps from the fixture baseline before reporting readiness
- both processes shut down cleanly on `SIGTERM`

Default runtime behavior:
- production mode is the default for desktop verification
- `apps/web` is built ahead of time and served by the standalone Next server artifact
- set `ORGUMENTED_DESKTOP_WEB_MODE=development` only when you intentionally need `next dev`
- set `ORGUMENTED_DESKTOP_WEB_REBUILD=1` when you want the runtime to force a fresh UI build before launch

## Run Tauri Dev Shell

On the supported Windows desktop runtime:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\Orgumented"
pnpm desktop:dev
```

Observed proof in current repo state:
- `tauri dev` launches `target\debug\orgumented-desktop.exe`
- Windows shows an `Orgumented` desktop window
- Tauri now launches the local runtime through `node ./scripts/dev-runtime.mjs`
- the embedded UI no longer depends on `next dev` for the primary Windows proof path
- desktop-managed web startup now logs:
  - `[desktop-runtime] preparing desktop-managed api on 127.0.0.1:3100 and starting web on 127.0.0.1:3001 (mode=production, directApiMode=1, apiBase=http://127.0.0.1:3100)`
- `http://127.0.0.1:3100/ready` returned `200` during the same `pnpm desktop:dev` smoke
- proof logs:
  - `logs/dna-runtime-ownership-desktop-dev.stdout.log`
  - `logs/dna-runtime-ownership-desktop-dev.stderr.log`

Current operator rule:
- desktop-managed development should run in direct-engine mode by default
- the standalone Next server is expected to serve UI assets only, not to be the normal desktop operator API boundary
- the `apps/web/app/api/` adapter tree is retired from the desktop runtime path

## Build Packaged Desktop Runtime

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\Orgumented"
pnpm desktop:build
```

Current packaged build behavior:
- `beforeBuildCommand` stages a packaged runtime under `apps/desktop/src-tauri/runtime/`
- `runtime/manifest.json` explicitly declares the packaged Node binary, API entry, web entry, and config entry used by the shell
- the staged runtime includes:
  - static web entry assets
  - bundled API entry at `runtime/api/main.cjs`
  - bundled fixture baseline at `runtime/fixtures/permissions`
  - bundled `node.exe`
  - `config.json` with non-secret Salesforce runtime config snapshot from `.env` and current shell overrides
- packaged build preflight stops stale packaged desktop processes before restaging on Windows
- build-only API baggage is pruned from the staged runtime before Tauri bundles it
- only the native `better-sqlite3` dependency set remains under `runtime/api/node_modules`
- `runtime/api` no longer carries a staged `package.json`
- the package build emits:
  - `apps/desktop/src-tauri/target/release/orgumented-desktop.exe`
  - `apps/desktop/src-tauri/target/release/bundle/msi/Orgumented_0.1.0_x64_en-US.msi`
  - `apps/desktop/src-tauri/target/release/bundle/nsis/Orgumented_0.1.0_x64-setup.exe`

Observed packaged proof in current repo state:
- `orgumented-desktop.exe` started the bundled API runtime
- packaged API startup bootstrapped the fixture baseline when graph/evidence state was empty
- `http://127.0.0.1:3100/ready` returned `200`
- proof log: `logs/desktop-phase4-release.log`

## Run Packaged Desktop Smoke

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\Orgumented"
pnpm desktop:build
pnpm desktop:smoke:release
```

Smoke artifacts:
- `logs/desktop-release-smoke.stdout.log`
- `logs/desktop-release-smoke.stderr.log`
- `logs/desktop-release-smoke-stale-seed.json`
- `logs/desktop-release-smoke-health.json`
- `logs/desktop-release-smoke-ready.json`
- `logs/desktop-release-smoke-ask.json`
- `logs/desktop-release-smoke-ask-repeat.json`
- `logs/desktop-release-smoke-proof.json`
- `logs/desktop-release-smoke-recent-proofs.json`
- `logs/desktop-release-smoke-replay.json`
- `logs/desktop-release-smoke-org-status.json`
- `logs/desktop-release-smoke-session-before.json`
- `logs/desktop-release-smoke-session-aliases.json`
- `logs/desktop-release-smoke-session-connect.json`
- `logs/desktop-release-smoke-session-after-connect.json`
- `logs/desktop-release-smoke-session-restore.json`
- `logs/desktop-release-smoke-ingest-latest.json`
- `logs/desktop-release-smoke-refresh-summary.json`
- `logs/desktop-release-smoke-refresh-diff.json`
- `logs/desktop-release-smoke-org-pipeline.json`
- `logs/desktop-release-smoke-result.json`

Current packaged smoke proof:
- shell launch succeeded
- `healthStatus=ok`
- `readyStatus=ready`
- the smoke now uses an isolated `logs/desktop-release-smoke-appdata/` runtime root instead of the operator's normal roaming app-data path
- first launch now seeds stale semantic snapshot residue and requires the packaged runtime to recover with `checks.bootstrap.message=runtime bootstrap ready snapshot=...`
- second launch now requires a grounded bootstrap message (`runtime already grounded` when persisted state is reused, otherwise a second deterministic `runtime bootstrap ready snapshot=...` message), proving the packaged relaunch stays grounded instead of falling into ambiguous startup state
- `/ready` now implies a grounded runtime, not just a listening process:
  - graph node/edge counts are non-zero
  - evidence index exists and is populated
- repeated identical Ask requests returned the same deterministic proof identity:
  - `proofId=proof_bb15a905228c6632a3641b1b`
  - `replayToken=trace_2b4fd7b005750f5732ad242c`
- replay parity held for the packaged Ask proof:
  - `matched=true`
  - `corePayloadMatched=true`
  - `metricsMatched=true`
- stored proof lookup and recent-proof history matched the packaged Ask artifact:
  - `proofLookupMatched=true`
  - `recentProofsMatched=true`
- alias inventory is captured from `/org/session/aliases`
- when local aliases are available, the smoke verifies `POST /org/session/connect` and restores the original session state before shutdown
- when a connected org session is available, the smoke now verifies handoff-backed latest ingest state, a forced refresh summary, and an org pipeline run after selective metadata retrieve
- when the refresh chain still resolves to one deterministic snapshot ID, the smoke records `refreshDiffStatus=skipped-same-snapshot` instead of claiming diff proof that the workflow did not actually produce
- `logs/desktop-release-smoke-result.json` now includes a first-class `retrieveHandoffProof` block so release evidence can cite one machine-readable handoff result instead of reconstructing it from separate artifact files
- cleanup now retries until packaged `orgumented-desktop.exe` and bundled `node.exe` are actually gone
- the smoke also forces port `3100` clear before launch, so repeated packaged verification runs do not fail on a stale listener
- the current packaged benchmark query now returns `askTrustLevel=trusted`

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
- `ORGUMENTED_DESKTOP_SMOKE_READY_ATTEMPTS` overrides the packaged readiness polling attempt count for slow runners
- `ORGUMENTED_DESKTOP_SMOKE_READY_DELAY_SECONDS` overrides the packaged readiness polling delay between attempts
- `ORGUMENTED_DESKTOP_SMOKE_HTTP_ATTEMPTS` overrides transient HTTP retry attempts for packaged smoke API calls
- `ORGUMENTED_DESKTOP_SMOKE_HTTP_DELAY_MS` overrides transient HTTP retry delay in milliseconds
- when switch verification is requested, the smoke restores the original session alias or disconnected state before exit
- packaged runtime auth proof depends on `SF_INTEGRATION_ENABLED=true` in `.env`, `.env.local`, or the build shell
- if packaged startup fails before readiness, the smoke now reports the desktop process state plus the tail of `logs/desktop-release-smoke.stdout.log` and `logs/desktop-release-smoke.stderr.log`

## Local Org Auth

Authenticate locally:

```powershell
sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default
sf org display --target-org orgumented-sandbox --json
cd $env:APPDATA\Orgumented\sf-project
cci org import orgumented-sandbox orgumented-sandbox
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

