# Orgumented Phase 25 Task List (WebUI Product Overhaul)

Goal: replace the operator-console style UI with a workflow-first product UI that is clear, guided, and task-based for daily org connection, metadata retrieval, analysis, and deterministic Ask use.

## Entry Criteria
- [x] Phase 24 complete
- [x] API endpoints for org/session/metadata/query flows are stable

## Exit Criteria
- [x] New tab-based IA implemented (`Connect`, `Org Browser`, `Refresh & Build`, `Analyze`, `Ask`, `Proofs & Metrics`, `System`)
- [x] Org connect flow is guided and supports CCI/SF/magic-link-style paths with explicit status + recovery UX
- [x] Org Browser is a dedicated scrollable frame with search/filter/tree and retrieval cart
- [x] Button labels and flows are intent-based, not endpoint-name based
- [x] Critical happy paths are validated via browser smoke coverage

## Scope
- Full UX/IA redesign (not incremental visual tweaks)
- Workflow-first interaction model
- Guided connection and retrieval experience
- Error/recovery clarity and next-step guidance
- Responsive behavior for desktop and mobile

## Deliverables
- [x] Establish UI design system baseline:
  - [x] tokenized color/type/spacing scales
  - [x] reusable primitives (`Panel`, `StatusBadge`, `ActionBar`, `EmptyState`, `ErrorState`)
  - [x] consistent success/warn/error semantic styling
- [x] Implement top-level product tabs and route state persistence
- [x] Build `Connect` experience:
  - [x] auth method chooser (CCI/SF/magic-link path)
  - [x] session status card with active alias/org/auth mode
  - [x] clear connect/switch/disconnect actions
  - [x] tool readiness panel (`cci`, `sf`, runtime config)
- [x] Build `Org Browser` experience:
  - [x] dedicated frame with independent scroll
  - [x] searchable metadata type tree
  - [x] member list panel with lazy loading
  - [x] retrieval cart (selected types/members)
  - [x] actions: refresh types, retrieve selected, retrieve + rebuild
- [x] Build `Refresh & Build` experience:
  - [x] mode selector (`incremental`/`full`)
  - [x] stage/progress rail
  - [x] snapshot output and diff summary surface
- [x] Build `Analyze` experience:
  - [x] subtabs for `Permissions`, `Automation`, `Impact`
  - [x] minimal forms + deterministic summary first
  - [x] expandable proof/JSON details
- [x] Build `Ask` experience:
  - [x] deterministic answer panel first
  - [x] proof/trust envelope side panel
  - [x] optional elaboration as secondary action
- [x] Build `Proofs & Metrics` and `System` views:
  - [x] proof lookup/replay and metrics export
  - [x] health/readiness/tooling diagnostics and actionable errors
- [x] Add empty-state and failure-state UX copy with explicit next actions
- [x] Add guided first-run onboarding checklist:
  - [x] connect org
  - [x] browse/retrieve metadata
  - [x] refresh/build graph
  - [x] run analyze and ask workflows
- [x] Add state persistence:
  - [x] active tab and key form inputs
  - [x] org browser retrieval cart and recent query state
- [x] Add UX telemetry (non-sensitive):
  - [x] completion/failure counters for core workflows
  - [x] time-to-complete signals for connect/retrieve/analyze flows

## Test Gates
- [x] `pnpm --filter web build` passes
- [x] `pnpm --filter api test` passes
- [x] browser smoke test validates critical flows:
  - [x] connect path visibility and required inputs
  - [x] metadata browse/select/retrieve actions
  - [x] analyze query run and deterministic response rendering
  - [x] ask deterministic + proof envelope rendering
- [x] responsive checks for desktop + mobile breakpoints
- [x] accessibility checks:
  - [x] keyboard navigability for tabs/tree/cart
  - [x] form labels/ARIA roles
  - [x] contrast and focus visibility

## Risks and Controls
- Risk: redesign breaks existing API flows
  - [x] keep API contract unchanged; UI-only orchestration refactor first
- Risk: UX polish without functional clarity
  - [x] each section must include `Current state` + `Next step`
- Risk: UI complexity regresses discoverability
  - [x] intent-first labels and progressive disclosure for advanced controls
- Risk: migration friction for active operators
  - [x] include one-phase rollback flag to legacy layout if critical blockers appear

## Definition of Done
- [x] A first-time operator can connect an org, retrieve scoped metadata, rebuild, and run permission/automation/impact/ask workflows without reading backend docs.
- [x] Updated docs:
  - [x] `docs/USAGE_GUIDE.md`
  - [x] `docs/CHEATSHEET.md`
  - [x] short UI tour/runbook page for new navigation

---

## Deferred to Phase 26 (Pushed Back)
Previous Phase 25 scope moved intact:
- LLM rollout governance + ops hardening
- shadow/canary controls
- deterministic vs llm_assist regression scorecards
- prompt/key handling and incident runbooks
