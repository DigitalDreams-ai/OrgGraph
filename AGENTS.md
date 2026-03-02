# AGENTS.md — Orgumented Agent Operating Constitution

This file defines how coding agents must operate in this repository.
It is authoritative for workflow discipline and architectural enforcement.

---

# 1) Mission

Orgumented is a deterministic semantic runtime for Salesforce architecture decisions.

Priority order (non-negotiable):

1. Determinism
2. Provenance
3. Constraint safety (fail-closed)
4. Reproducibility (proof + replay)
5. Architectural coherence
6. Performance (only after the above are satisfied)

Never optimize for novelty, abstraction elegance, or performance
without measurable improvement in the top four priorities.

---

# 2) Architectural Ground Truth

Runtime Model:
- Windows-native desktop app
- Tauri shell owns lifecycle
- Embedded Next.js UI (presentation layer only)
- Local NestJS execution engine (not a deployable web product)
- No Docker in runtime, release, or operator workflow

Architectural Laws:

- Same snapshot + query + policy → identical output.
- Every `/ask` response must be derivation-traceable.
- Proof artifacts must be persistable and replay-verifiable.
- Violations must fail closed (never silently degrade).
- No hidden fallback from constrained to unconstrained mode.
- No LLM-driven routing outside declared policies.
- UI must not contain business or policy logic.

If implementation conflicts with these laws, the implementation is wrong.

---

# 3) Source of Truth

Primary direction:

- `docs/planning/v2/README.md`
- `docs/planning/v2/ORGUMENTED_V2_STRATEGY.md`
- `docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md`
- `docs/planning/v2/ORGUMENTED_V2_ROADMAP.md`
- `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`
- `docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md`
- `docs/planning/v2/ORGUMENTED_V2_LEXICON.md`
- Active selected-slice execution artifact under `docs/planning/v2/` when present
- Wave tasklists remain detailed capability references, not the first planning surface

Conflict resolution order:
1. Active selected-slice execution artifact
2. `docs/planning/v2/README.md` and the v2 planning set
3. Runtime laws above
4. Archived planning files for detailed historical or dependency context

Never treat project-memory or external summaries as canonical truth.

---

# 4) Mandatory Decision Discipline (Major Changes)

For non-trivial architecture changes:

1. Produce the applicable planning artifact before coding:
   - v2 slice work: `docs/planning/v2/EVAL_PLAN.md`
2. If structural change is proposed:
   - Apply the applicable decision matrix.
   - Produce the matching decision report or matrix result.
   - Justify Refactor vs Module-Rebuild vs Full Rebuild numerically.
3. Do not perform large refactors without measurable acceptance gates.
4. Prefer smallest viable change that restores contract compliance.

Rewrite is last resort, not default.

---

# 5) Implementation Workflow

For each task:

1. Read active phase requirements and acceptance criteria.
2. Start in Architect mode for boundary or schema changes.
3. Implement smallest coherent slice.
4. Add/update tests first-class (unit + integration + replay where relevant).
5. Run validation commands locally.
6. Update docs/tasklists.
7. Commit logically grouped changes.

No implementation without test alignment.

---

# 6) Commit Discipline

- Group commits by concern (parser, API, storage, docs, tests, infra).
- Avoid mixed-purpose commits.
- Do not combine refactor + feature unless inseparable.

Commit style:

- feat(scope):
- fix(scope):
- refactor(scope):
- test(scope):
- docs(scope):
- chore(scope):

Every non-trivial commit must preserve deterministic replay.

---

# 7) Determinism & Replay Enforcement

For semantic runtime changes, validate:

- Deterministic replay parity
- Snapshot hash stability
- Proof artifact integrity
- Constraint gate enforcement
- No nondeterministic timestamps in decision logic

If replay parity fails → stop and fix before proceeding.

---

# 8) Testing Expectations

Minimum before finalizing work:

- Relevant package tests
- Build checks for touched apps
- API + UI smoke flows if runtime behavior changed

For runtime changes also validate:

- deterministic replay behavior
- derivation integrity
- constraint violation handling
- failure mode clarity (no silent fallback)

Prefer property tests for invariants where applicable.

---

# 9) UI ↔ Engine Boundary Rules

Strict separation:

UI (Next.js):
- Presentation
- User workflow state
- Display logic only

Engine (NestJS):
- Parsing
- Normalization
- Policy routing
- Decision logic
- Constraint evaluation
- Proof generation

No policy logic in UI.
No UI state assumptions in engine.

If boundary blur occurs → refactor immediately.

---

# 10) Operational Constraints

- Runtime config must be explicit and auditable.
- Prefer config-driven behavior over hardcoded values.
- Keep `.env`, `.env.sample`, `.env.example`, aligned.
- No secret leakage in logs, docs, commits, or tests.
- Mask sensitive output.

Runtime/config change gate:
1. Restart services
2. Run targeted smoke test
3. Capture proof artifact of new config activation

---

# 11) Salesforce-Specific Rules

- Treat metadata retrieval, parse, graph rebuild as separate verified stages.
- Preserve sandbox compatibility.
- Do not assume fixture parity equals real org behavior.
- Validate both where possible.

---

# 12) Agent Mode Routing

Modes:

Architect mode:
- Phase planning
- Schema changes
- Contract changes
- Policy thresholds
Output: constraints, tradeoffs, acceptance gates.

Builder mode:
- Code edits
- Storage changes
- API updates
Output: small slices with tests.

Verifier mode:
- Typecheck
- Integration
- Replay/determinism tests
Output: pass/fail summary + failure cause.

Docs mode:
- Usage guides
- Runbooks
- Phase updates
Output: behavior-aligned updates.

Routing:
1. Architect for non-trivial change
2. Builder for implementation
3. Verifier before commit
4. Docs if behavior changed

If multi-mode agents unavailable, emulate with disciplined sequencing.

---

# 13) MCP-First Workflow

Execution order:

1. Local workspace inspection
2. project-memory (context continuity only)
3. github (PR/status checks)
4. postgres (data-plane verification if relevant)

Project-memory is advisory only.
Repository state is canonical.

If MCP unavailable → state limitation → continue locally.

---

# 14) Anti-Patterns (Hard Stops)

- Non-deterministic heuristics in decision paths
- Silent fallback from constrained mode
- UI-driven policy branching
- Replay instability ignored
- Large refactors without measurable acceptance gates
- Feature shipping without proof artifacts
- Overengineering without deterministic benefit

If detected → pause and correct.

---

# 15) Definition of Good Output

A completed change must be:

- Deterministic
- Replay-verifiable
- Constraint-safe (fail-closed)
- Provenance-traceable
- Test-covered
- Boundary-clean
- Documented
- Logically committed

If any condition fails, the task is incomplete.
