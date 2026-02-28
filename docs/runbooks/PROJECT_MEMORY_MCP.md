# Project Memory MCP

Purpose: provide advisory coordination memory for large repo work without changing Orgumented runtime truth, Ask planning, or proof semantics.

## Guardrails

- Project memory is advisory only.
- Code, docs, tests, snapshots, proofs, and policies remain the source of truth.
- `/ask` must not read from this memory store for planning, grounding, or answer generation.
- Every stored record must include `sourceRefs`.
- Records degrade to `stale` or `expired` when tracked files change or TTLs elapse.

## Default Storage

- Event log: `data/project-memory/events.jsonl`
- Workspace root detection: repo root via `pnpm-workspace.yaml`

Optional overrides in PowerShell:

```powershell
$env:ORGUMENTED_PROJECT_MEMORY_PATH="data/project-memory/events.jsonl"
$env:ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT="$env:USERPROFILE\Projects\GitHub\OrgGraph"
```

## Start The MCP

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
pnpm --filter @orgumented/project-memory-mcp build
npm run mcp:project-memory
```

This starts a stdio MCP server backed by `packages/project-memory-mcp`.
The launcher is now cross-platform and works on Windows without a shell-specific wrapper.

## Register In Cursor

This repo now includes a committed project config at `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "project-memory": {
      "command": "node",
      "args": [
        "${workspaceFolder}/packages/project-memory-mcp/dist/index.js"
      ],
      "env": {
        "ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT": "${workspaceFolder}",
        "ORGUMENTED_PROJECT_MEMORY_PATH": "data/project-memory/events.jsonl"
      }
    }
  }
}
```

## Register In Codex

```powershell
Set-Location "$env:USERPROFILE\Projects\GitHub\OrgGraph"
codex mcp add project-memory --env ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT="$PWD" --env ORGUMENTED_PROJECT_MEMORY_PATH="data/project-memory/events.jsonl" -- node "$PWD\packages\project-memory-mcp\dist\index.js"
```

## Tools

- `put_record`
- `append_event`
- `get_record`
- `list_records`
- `mark_stale`
- `link_records`
- `summarize_scope`
- `prune_expired`
- `seed_orgumented_baseline`
- `summarize_orgumented_waves`

## Record Types

- `work_item`
- `decision_note`
- `repo_map`
- `verification_result`
- `risk_item`
- `handoff_note`
- `runtime_observation`

## Recommended Use

- Store active work slices that span many files.
- Capture architectural decisions with source references.
- Record verification runs with command, result, and artifact references.
- Keep handoff notes short and linked to concrete files, commits, or docs.
- Use `summarize_scope` before resuming a subsystem after a long gap.
- Use `seed_orgumented_baseline` to create or refresh repo-map records for API runtime, operator surfaces, desktop transition architecture, ontology, and planning governance.
- Use `summarize_orgumented_waves` to read Wave A-G tasklist completion counts directly from `docs/planning`.
- After changing the MCP package code, rebuild and restart the MCP session before expecting tool output to reflect new seed definitions or wave coverage.

## Anti-Patterns

- Do not treat memory records as canonical requirements.
- Do not store unsupported architecture claims without refs.
- Do not rely on memory to answer Salesforce/runtime questions.
- Do not bypass docs/tasklists by writing vague session summaries into memory.

## Verification

```powershell
pnpm --filter @orgumented/project-memory-mcp test
codex mcp get project-memory
```

Expected proof:
- store test passes
- stdio MCP smoke test passes
- Codex reports the `project-memory` MCP as enabled
- standalone desktop MCP baseline remains limited to `github` and `project-memory`
