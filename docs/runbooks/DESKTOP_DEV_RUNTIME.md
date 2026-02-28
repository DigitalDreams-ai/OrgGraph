# Desktop Dev Runtime

Purpose: run Orgumented in the desktop-transition model without treating Docker as the primary product runtime.

## Current Direction
- Product target: desktop-native
- Supported desktop OS: Windows only
- UI framework: Next.js
- engine: NestJS
- shell: Tauri
- auth source of truth: local Salesforce CLI keychain
- Docker status: migration/dev scaffold only

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

```bash
cd /volume1/data/projects/OrgGraph
. "$HOME/.cargo/env"
pnpm desktop:info
```

Expected target reality on Windows:
- Rust toolchain present
- Tauri CLI present
- WebView2 runtime available

## Run Local Dev Runtime Without Docker

This starts:
- NestJS engine on a local port
- Next.js UI on a local port

```bash
cd /volume1/data/projects/OrgGraph
ORGUMENTED_DESKTOP_API_PORT=3200 \
ORGUMENTED_DESKTOP_WEB_PORT=3201 \
node apps/desktop/scripts/dev-runtime.mjs
```

Observed proof in current repo state:
- API builds, then starts from `dist/main.js`
- Web starts with `next dev`
- both processes shut down cleanly on `SIGTERM`

## Run Tauri Dev Shell

On the supported Windows desktop runtime:

```bash
cd /volume1/data/projects/OrgGraph
. "$HOME/.cargo/env"
pnpm desktop:dev
```

## Local Org Auth

Authenticate locally, not in Docker:

```bash
sf org login web --alias orgumented-sandbox --instance-url https://test.salesforce.com --set-default
sf org display --target-org orgumented-sandbox --json
cci org import orgumented-sandbox <sf-username>
cci org info orgumented-sandbox
```

## Local Session Validation Endpoints

With the API running locally:

```bash
curl http://127.0.0.1:3200/org/session
curl http://127.0.0.1:3200/org/session/aliases
curl "http://127.0.0.1:3200/org/session/validate?alias=orgumented-sandbox"
curl http://127.0.0.1:3200/org/preflight
```

## NAS Note

This NAS can still be used for:
- repo development
- planning work
- backend/runtime scaffolding
- local engine smoke checks

It is not the target desktop runtime. Linux-specific Tauri launch blockers on the NAS do not block the Windows desktop product path.
