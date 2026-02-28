# AGENTS.md

This file defines how coding agents should operate in this repository.

## 1) Mission

Orgumented is a deterministic semantic runtime for Salesforce architecture decisions.

Priority order:
1. Determinism
2. Provenance
3. Constraint safety
4. Reproducibility
5. Performance

Do not optimize for novelty without measurable lift.

## 2) Source of Truth

Use these docs as primary direction:
- `docs/planning/BLUE_OCEAN_EXECUTION_PLAN.md`
- `docs/planning/BLUE_OCEAN_PHASE_ROADMAP.md`
- `docs/planning/ORGUMENTED_LEXICON.md`
- Active phase tasklist (`docs/planning/PHASE*_TASKLIST.md`)

If docs conflict, prefer the latest active phase and blue-ocean execution plan.

## 3) Engineering Rules

- Keep behavior deterministic for same snapshot + query + policy.
- Every claim from `/ask` must be evidence-backed and derivation-traceable.
- Fail closed when constraints/grounding are insufficient.
- No hidden fallback from constrained mode to unconstrained mode.
- Do not introduce ambiguous naming; use canonical lexicon terms.

## 4) Implementation Workflow

For each task:
1. Read active phase requirements and acceptance criteria.
2. Implement smallest coherent slice.
3. Add/update tests first-class (unit + integration + smoke where relevant).
4. Run validation commands locally.
5. Update docs/tasklists to reflect progress.
6. Commit in logical groups with clear messages.

## 5) Commit Discipline

- Group commits by concern (e.g., parser, API, docs, tests, infra).
- Avoid mixed-purpose commits.
- Commit message style:
  - `feat(scope): ...`
  - `fix(scope): ...`
  - `refactor(scope): ...`
  - `test(scope): ...`
  - `docs(scope): ...`
  - `chore(scope): ...`

## 6) Testing Expectations

At minimum before finalizing work:
- Relevant package tests
- Build checks for touched apps
- API and web smoke flows if runtime behavior changed

For semantic runtime changes, also validate:
- deterministic replay behavior
- derivation integrity
- metric/constraint gate behavior

## 7) Operational Constraints

- Keep Docker/runtime config explicit and auditable.
- Prefer config-driven behavior over hardcoded values.
- Keep `.env`, `.env.sample`, `.env.example`, and config samples aligned.
- Avoid secret leakage in logs, docs, commits, and test artifacts.

## 8) Salesforce-Specific Rules

- Treat metadata retrieval, parse output, and graph rebuild as separate verified stages.
- Preserve compatibility with sandbox-driven workflows.
- Do not assume fixture behavior represents real org behavior; test both.

## 9) Documentation Requirements

When behavior changes, update:
- `docs/USAGE_GUIDE.md` (user-facing behavior)
- `docs/CHEATSHEET.md` (operator quick commands)
- relevant runbooks in `docs/runbooks/`
- active phase tasklist status

If terminology changes, update `docs/planning/ORGUMENTED_LEXICON.md`.

## 10) Anti-Patterns to Avoid

- "Yes-man" implementation without critical validation.
- Non-deterministic heuristics in core decision paths.
- Shipping features without proof artifacts or test coverage.
- Large refactors without phase alignment and measurable acceptance gates.

## 11) Definition of Good Output

A completed change should be:
- deterministic,
- test-verified,
- traceable,
- documented,
- logically committed.

## 12) Task Routing and Agent Modes

Use different execution styles by task type:

- `Architect mode` (planning/ontology/runtime contracts)
  - Use for: phase planning, schema changes, operator semantics, policy thresholds.
  - Output: explicit constraints, tradeoffs, acceptance gates.

- `Builder mode` (implementation)
  - Use for: API, parser, graph, storage, config, and migration changes.
  - Output: small coherent slices with tests in same cycle.

- `Verifier mode` (testing and regression checks)
  - Use for: typecheck, integration, parity, replay/determinism, smoke.
  - Output: concise pass/fail summary and concrete failure cause.

- `Docs mode` (runbooks, usage, phase tracking)
  - Use for: user docs, lifecycle docs, release notes, tasklist updates.
  - Output: behavior-focused updates with exact commands/paths.

Routing rules:
1. Start in `Architect mode` for non-trivial feature changes.
2. Move to `Builder mode` for code edits.
3. Move to `Verifier mode` before each commit.
4. End in `Docs mode` if behavior changed.
5. Commit by logical group per mode transition when practical.

Environment limitation fallback:
- If runtime/model agent switching is not available, emulate mode switching via workflow discipline:
  - limit output verbosity during verification,
  - run targeted tests first,
  - avoid broad test sweeps unless needed,
  - summarize only actionable findings.

## 13) MCP-First Workflow

Use available MCP servers as first-class workflow tools:

- `filesystem` MCP
  - Use first for file discovery, reads, and edits inside allowed paths.
  - Prefer this over ad-hoc shell file ops when both are viable.

- `docker` MCP
  - Use for project/container health, logs, compose up/down/restart, and service stats.
  - Prefer MCP docker actions before raw docker CLI commands for repeatability.

- `postgres` MCP
  - Use for read-only verification queries and schema/data checks tied to runtime behavior.
  - Validate DB assumptions with MCP queries before implementing parser/query logic changes.

- `github` MCP
  - Use for PR/issue/review metadata, branch/PR checks, and repository inspection workflows.
  - Prefer MCP when reporting PR status or preparing merge-readiness checks.

- `project-memory` MCP
  - Use for advisory project continuity only: handoff notes, verification breadcrumbs, subsystem maps, risk tracking, and wave/tasklist summaries.
  - Seed baseline repo-map records before heavy implementation work when the memory store is empty.
  - Treat all records as derived working memory, never as canonical requirements or runtime truth.
  - Do not use project-memory content as input to `/ask`, proof generation, deterministic planner routing, or policy evaluation.

Execution order guidance:
1. `filesystem` for code/document context.
2. `project-memory` for active work context, subsystem continuity, and wave summaries.
3. `docker` for runtime state and service health.
4. `postgres` for data-plane verification.
5. `github` for collaboration/PR state.

MCP fallback rule:
- If an MCP is unavailable or unhealthy, state it clearly, use the next best local alternative, and continue.

## 14) Session Guardrails

- MCP health preflight
  - At session start, run quick MCP checks for `filesystem`, `project-memory`, `docker`, `postgres`, and `github`.
  - Report pass/fail and known limitations before implementation work.
  - If `project-memory` is available, use it to inspect prior handoff notes and current wave context before broad repo exploration.

- Secret hygiene hard-stop
  - Never output full secrets (API keys, tokens, OAuth codes, connection credentials).
  - Mask sensitive values in logs, docs, terminal snippets, and test artifacts.

- Runtime change verification gate
  - For any runtime/config change (`.env*`, compose, config JSON, MCP config), require:
    1. proper service restart/recreate,
    2. one targeted smoke test,
    3. one concrete proof artifact (log line, endpoint result, or command output summary) showing new config is active.

- Project memory boundary
  - Project-memory records are advisory and may summarize repo state, but code, docs, tests, proofs, snapshots, and policies remain the only source of truth.
  - If project-memory content conflicts with the repository, trust the repository and mark the stale memory record accordingly.
