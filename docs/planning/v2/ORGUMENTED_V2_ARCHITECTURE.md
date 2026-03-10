# Orgumented v2 Architecture

Date: March 1, 2026

## Product Runtime

Orgumented v2 is:
- a Windows-native desktop app
- Tauri shell
- embedded Next.js UI
- local NestJS semantic engine
- local Salesforce CLI-backed operator workflow

It is not:
- a hosted web app
- a Docker runtime
- a browser-brokered auth product

## Architectural Laws

The runtime must preserve:
- same snapshot + query + policy -> identical output
- proof-backed answers by default
- replay-verifiable decision artifacts
- fail-closed constraint behavior
- no hidden fallback from constrained to unconstrained mode
- no policy logic in the UI
- no silent drift between dev and packaged desktop behavior

## High-Level Runtime Shape

1. Tauri shell
- owns lifecycle, packaging, windows, and native desktop concerns

2. Embedded UI
- presentation layer only
- operator workflow state and display logic
- no business or policy logic

3. Semantic engine
- deterministic planning and execution
- ingestion, graph, analysis, ask, proof, replay, trust, drift, and policy orchestration

4. Tool adapter layer
- wraps `sf` and `cci`
- normalizes local org/session/retrieve interactions

5. Local persistence
- graph
- evidence
- proofs
- logs
- runtime history
- config

## Auth Model

Primary rule:
- Salesforce CLI keychain is the only authentication source of truth

Desktop auth behavior:
1. discover aliases through local `sf`
2. validate aliases through local `sf`
3. validate or bridge the alias into `cci` where required
4. attach the verified alias to Orgumented session state

Not part of the target architecture:
- pasted access-token auth
- external client-app auth
- frontdoor URL auth
- browser-broker or VNC sidecars
- hidden alternate auth flows

## Tool Adapter Contract

The tool adapter layer is a hard boundary between Orgumented and external CLIs.

Responsibilities:
- detect tool availability and versions
- normalize command execution
- translate raw CLI output into typed internal contracts
- classify failure reasons into actionable operator states
- centralize retry, timeout, and environment handling

Rule:
- `sf` and `cci` assumptions must not leak into UI logic or core business logic

## Operator Diagnostic States

Desktop operators must receive explicit, typed states for the common failure classes:
- `missing_sf`
- `missing_cci`
- `invalid_alias`
- `disconnected_session`
- `retrieve_failed`
- `refresh_failed`
- `proof_lookup_failed`

Rule:
- diagnostics must be actionable and fail closed
- no silent fallback into an unconstrained or partially connected state

## Local Persistence Layout

Recommended Windows app-data root:
- `%APPDATA%\\Orgumented\\`

Suggested structure:
- `config/`
- `data/graph/`
- `data/evidence/`
- `data/proofs/`
- `data/retrieve/`
- `logs/`
- `history/`

Initial storage rule:
- local-first SQLite remains the default
- richer storage/runtime changes require measurable lift before adoption

## Ask-Centric Response Model

Ask must not default to raw JSON.

Primary response shape:
1. decision summary
2. deterministic explanation
3. proof and trust envelope
4. evidence references
5. optional elaboration
6. explicit next actions

JSON remains an operator/debug view, not the primary output mode.

## History Access Model

Proofs and replays must be accessible through labeled history, not token bookkeeping.

Required shape:
- human-readable history labels
- stable linkage between Ask output, proof artifact, replay artifact, and originating org/session context
- replay access without requiring the operator to manually preserve opaque IDs or tokens

Rule:
- raw IDs may exist internally, but the operator-facing workflow must not depend on them

## Stage 1 Workflow Surface

The trusted decision-engine stage is not complete until the desktop product supports these workflows cleanly:
- Ask as the default workspace
- Org Sessions attach, switch, and restore
- Org Browser with org-wide selective retrieve
- Refresh and Build as first-class desktop jobs
- Explain and Analyze as operator workflows, not raw engine endpoints
- Proofs and History with labeled access
- Settings and Diagnostics for runtime and tool health

## Desktop Job Model

Long-running work should execute as managed jobs:
- alias validation
- metadata retrieve
- refresh
- rebuild
- export
- proof replay

Each job needs:
- queued/running/completed/failed state
- timestamps
- structured logs
- cancellation semantics where safe
- deterministic artifact links

## Security Model

- secrets remain local to the operator environment
- Orgumented reads existing CLI/keychain state instead of storing Salesforce credentials itself
- proofs and logs must avoid secret leakage
- local config must be explicit about what is persisted and where

## Semantic Stack

### Keep Custom

These remain Orgumented moat:
- Salesforce semantic judgment layer
- deterministic decision-packet contract
- proof and replay contract
- domain planner/compiler behavior in purpose

### Adopt Now

Strong candidates to borrow now:
- `Ajv` for schema validation
- `W3C PROV / PROV-O` for provenance vocabulary
- `OPA / Rego` for declarative policy evaluation

Build-vs-borrow gate:
- custom-build only the Salesforce semantic moat
- borrow generic validation, provenance, and policy substrate where it materially reduces bespoke infrastructure cost
- keep Ask planner depth on a contract-first path; only choose an implementation substrate after the semantic frame proves value

### Evaluate Next

Candidates worth explicit evaluation:
- a narrow semantic-frame implementation substrate if shadow-mode execution proves value
- `Souffle` or another Datalog-style reasoning substrate
- `SHACL` or related semantic constraint tooling

### Reject for Now

Do not build or adopt by default:
- a custom language or DSL substrate
- a custom storage/runtime engine
- a heavy RDF/OWL platform as the default runtime core
- a domain-agnostic context platform direction

## Current Good State

Already materially strong:
- deterministic proof and replay behavior
- direct desktop UI-to-engine boundaries for core flows
- packaged desktop smoke coverage
- local CLI-backed auth/session direction
- explicit ontology primitives and semantic-runtime composition concepts

## Current Weak State

Still materially weak:
- planner/compiler depth
- some policy and validation semantics remain too bespoke
- decision-packet workflow adoption is not yet proven
- standalone Next dev-server dependence is still heavier than ideal

## Runtime Ownership Direction

The architecture should continue moving toward:
- Tauri owning lifecycle clearly
- one explicit UI-to-engine boundary
- no resurrection of Next route adapters in the desktop path
- reduced dependence on standalone web-server assumptions

## UI Boundary Rule

The UI may own:
- presentation
- navigation
- workflow state
- local operator ergonomics

The UI may not own:
- policy evaluation
- decision logic
- trust thresholds
- semantic reasoning
- proof generation rules

## Verification Contract

No architecture claim is valid without:
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`

Runtime changes that affect decision semantics must also preserve:
- deterministic replay parity
- proof integrity
- clear failure modes

Operational checkpoints that remain binding:
- desktop runtime startup plus local engine reachability
- auth -> retrieve -> refresh -> query -> proof flow
- no secret leakage in logs or artifacts
- no UI ownership of policy or decision logic
- explicit diagnostic behavior for missing tools, invalid aliases, and disconnected sessions

## Bottom Line

Orgumented v2 architecture should stay:
- desktop-native
- proof-first
- deterministic
- custom only at the semantic moat
- borrowed everywhere else unless measured lift proves otherwise
