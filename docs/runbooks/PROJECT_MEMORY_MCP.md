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

Optional overrides:

```bash
export ORGUMENTED_PROJECT_MEMORY_PATH=data/project-memory/events.jsonl
export ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT=/volume1/data/projects/OrgGraph
```

## Start The MCP

```bash
cd /volume1/data/projects/OrgGraph
npm run mcp:project-memory
```

This starts a stdio MCP server backed by `packages/project-memory-mcp`.

## Register In Codex

Example MCP config:

```json
{
  "mcpServers": {
    "project-memory": {
      "command": "/usr/local/bin/node",
      "args": [
        "/volume1/data/projects/OrgGraph/packages/project-memory-mcp/dist/index.js"
      ],
      "cwd": "/volume1/data/projects/OrgGraph"
    }
  }
}
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
- Use `seed_orgumented_baseline` once to create repo-map records for API, web, ontology, and planning.
- Use `summarize_orgumented_waves` to read Wave A-E tasklist completion counts directly from `docs/planning`.

## Anti-Patterns

- Do not treat memory records as canonical requirements.
- Do not store unsupported architecture claims without refs.
- Do not rely on memory to answer Salesforce/runtime questions.
- Do not bypass docs/tasklists by writing vague session summaries into memory.

## Verification

```bash
npm exec --yes pnpm@9.12.3 -- --filter @orgumented/project-memory-mcp test
```

Expected proof:
- store test passes
- stdio MCP smoke test passes
