# Orgumented

A deterministic semantic runtime for Salesforce architecture decisions.

Current repo reality:
- target product runtime is Windows desktop
- shell is Tauri
- UI is Next.js embedded inside Tauri
- semantic engine is NestJS
- auth is local Salesforce CLI keychain plus local `cci`
- Docker is not part of the runtime, release path, or operator workflow

## Windows Bootstrap

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\Orgumented"
pnpm install
pnpm desktop:info
$env:ORGUMENTED_DESKTOP_API_PORT="3200"
$env:ORGUMENTED_DESKTOP_WEB_PORT="3201"
node apps/desktop/scripts/dev-runtime.mjs
```

If `pnpm desktop:info` reports missing Rust tooling, install Rust with `rustup` and restart the shell so `cargo` and `rustc` are on `PATH`.

Project MCP config:
- Cursor project config is committed at `.cursor/mcp.json` for `project-memory`
- Codex can be configured with `codex mcp add project-memory ...`
- `github` MCP should use `GITHUB_TOKEN` from the user environment, not a plaintext config token

## Desktop Runtime

Preferred local runtime:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\Orgumented"
$env:ORGUMENTED_DESKTOP_API_PORT="3200"
$env:ORGUMENTED_DESKTOP_WEB_PORT="3201"
node apps/desktop/scripts/dev-runtime.mjs
```

Run the Tauri shell:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\Orgumented"
pnpm desktop:dev
```

Package the standalone desktop runtime:

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\Orgumented"
pnpm desktop:build
```

Current packaged build behavior:
- stages static UI assets under `apps/desktop/src-tauri/runtime/web`
- stages a deployed API runtime under `apps/desktop/src-tauri/runtime/api`
- bundles `node.exe` for the packaged shell to supervise locally

See [DESKTOP_DEV_RUNTIME.md](./docs/runbooks/DESKTOP_DEV_RUNTIME.md).

Product boundary:
- Orgumented is a standalone desktop app
- Next.js is the embedded desktop UI layer, not a hosted product surface
- local `localhost` ports exist for development/runtime composition, not for a browser product model

## Salesforce Org Integration

Sandbox-first org retrieval and refresh with Salesforce CLI keychain baseline.

Prerequisites:
1. Install Salesforce CLI (`sf`) and CumulusCI (`cci`) locally.
2. Ensure env file exists at repo root: `Copy-Item .env.sample .env`
3. Set runtime alias/base URL in `.env`:
   - `SF_ALIAS=orgumented-sandbox`
   - `SF_BASE_URL=https://test.salesforce.com`
4. Authenticate alias once in the local Salesforce CLI keychain:
   - `sf org login web --alias <alias> --instance-url <url> --set-default`
5. Verify authenticated alias:
   - `sf org display --target-org <alias> --json`
6. Import alias into the local CCI registry:
   - `cci org import <alias> <sf-username>`
7. Verify CCI alias:
   - `cci org info <alias>`

Commands:

```powershell
npm run sf:auth
npm run sf:retrieve
npm run sf:retrieve-refresh
npm run sf:export-user-map
```

API trigger:

```bash
curl -X POST http://localhost:3100/org/retrieve \
  -H 'content-type: application/json' \
  -d '{"runAuth":true,"runRetrieve":true,"autoRefresh":true}'
```

See [ORG_INTEGRATION.md](./docs/runbooks/ORG_INTEGRATION.md), [DESKTOP_DEV_RUNTIME.md](./docs/runbooks/DESKTOP_DEV_RUNTIME.md), and [SANDBOX_CONNECT_CHECKLIST.md](./docs/runbooks/SANDBOX_CONNECT_CHECKLIST.md).

## Operator Docs

- Documentation index: [docs/README.md](./docs/README.md)
- Usage guide: [docs/USAGE_GUIDE.md](./docs/USAGE_GUIDE.md)
- Quick commands: [docs/CHEATSHEET.md](./docs/CHEATSHEET.md)
- Human benchmark runbook: [docs/runbooks/HUMAN_BENCHMARK_CAPTURE.md](./docs/runbooks/HUMAN_BENCHMARK_CAPTURE.md)
- Production promotion gate: [docs/runbooks/PRODUCTION_PROMOTION.md](./docs/runbooks/PRODUCTION_PROMOTION.md)
- Release checklist: [docs/releases/RELEASE_CHECKLIST.md](./docs/releases/RELEASE_CHECKLIST.md)
- Rollback playbook: [docs/releases/ROLLBACK_PLAYBOOK.md](./docs/releases/ROLLBACK_PLAYBOOK.md)

Stage 1 human evidence closeout:
- archive stale benchmark artifacts first with `pnpm phase17:benchmark:human:reset`
- capture the operator run with `pnpm phase17:benchmark:human`
- then use `pnpm phase17:benchmark:human:finalize` to publish and verify the canonical benchmark results in one fail-closed step

## Environment Variables

```bash
PORT=3000
GRAPH_BACKEND=sqlite
DATABASE_URL=file:./data/orgumented.db
PERMISSIONS_FIXTURES_PATH=fixtures/permissions
USER_PROFILE_MAP_PATH=fixtures/permissions/user-profile-map.json
EVIDENCE_INDEX_PATH=data/evidence/index.json
REFRESH_STATE_PATH=data/refresh/state.json
REFRESH_AUDIT_PATH=data/refresh/audit.jsonl
ONTOLOGY_REPORT_PATH=data/refresh/ontology-report.json
MIN_CONFIDENCE_DEFAULT=medium
ASK_CONSISTENCY_CHECK_ENABLED=true
ASK_DEFAULT_MODE=deterministic
LLM_ENABLED=false
LLM_PROVIDER=none
LLM_ALLOW_PROVIDER_OVERRIDE=true
LLM_TIMEOUT_MS=12000
LLM_MAX_OUTPUT_TOKENS=400
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1/messages
ORGUMENTED_LOG_LEVEL=log,warn,error,debug
ORGUMENTED_HTTP_LOG_ENABLED=true
NEXT_PUBLIC_API_BASE=http://localhost:3100
ORGUMENTED_WEB_LOG_ENABLED=true
```

## Troubleshooting

1. Health endpoints: `curl http://localhost:3100/health` and `curl http://localhost:3100/ready`
2. Packaged shell readiness: run `apps/desktop/src-tauri/target/release/orgumented-desktop.exe` and then `curl http://localhost:3100/ready`
3. Metrics snapshot: `curl http://localhost:3100/metrics`
4. If Tauri readiness fails, re-run `pnpm desktop:info` and confirm `cargo` and `rustc` resolve in the current shell

## Plan

- Start here:
  - [v2 Planning Index](./docs/planning/v2/README.md)
  - [v2 Strategy](./docs/planning/v2/ORGUMENTED_V2_STRATEGY.md)
  - [v2 Architecture](./docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md)
  - [v2 Roadmap](./docs/planning/v2/ORGUMENTED_V2_ROADMAP.md)
  - [v2 Execution](./docs/planning/v2/ORGUMENTED_V2_EXECUTION.md)
  - [v2 Governance](./docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md)
  - [v2 Lexicon](./docs/planning/v2/ORGUMENTED_V2_LEXICON.md)
- Archived pre-v2 planning and execution history:
  - [Planning Archive Index](./docs/planning/archive/README.md)

