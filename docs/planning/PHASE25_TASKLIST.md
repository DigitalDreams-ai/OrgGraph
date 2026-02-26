# Orgumented Phase 25 Task List (WebUI Product Overhaul)

Goal: replace the operator-console style UI with a workflow-first product UI that is clear, guided, and task-based for daily org connection, metadata retrieval, analysis, and deterministic Ask use.

## Entry Criteria
- [ ] Phase 24 complete
- [ ] API endpoints for org/session/metadata/query flows are stable

## Exit Criteria
- [ ] New tab-based IA implemented (`Connect`, `Org Browser`, `Refresh & Build`, `Analyze`, `Ask`, `Proofs & Metrics`, `System`)
- [ ] Org connect flow is guided and supports CCI/SF/magic-link-style paths with explicit status + recovery UX
- [ ] Org Browser is a dedicated scrollable frame with search/filter/tree and retrieval cart
- [ ] Button labels and flows are intent-based, not endpoint-name based
- [ ] Critical happy paths are validated via browser smoke coverage

## Scope
- Full UX/IA redesign (not incremental visual tweaks)
- Workflow-first interaction model
- Guided connection and retrieval experience
- Error/recovery clarity and next-step guidance
- Responsive behavior for desktop and mobile

## Deliverables
- [ ] Establish UI design system baseline:
  - [ ] tokenized color/type/spacing scales
  - [ ] reusable primitives (`Panel`, `StatusBadge`, `ActionBar`, `EmptyState`, `ErrorState`)
  - [ ] consistent success/warn/error semantic styling
- [ ] Implement top-level product tabs and route state persistence
- [ ] Build `Connect` experience:
  - [ ] auth method chooser (CCI/SF/magic-link path)
  - [ ] session status card with active alias/org/auth mode
  - [ ] clear connect/switch/disconnect actions
  - [ ] tool readiness panel (`cci`, `sf`, runtime config)
- [ ] Build `Org Browser` experience:
  - [ ] dedicated frame with independent scroll
  - [ ] searchable metadata type tree
  - [ ] member list panel with lazy loading
  - [ ] retrieval cart (selected types/members)
  - [ ] actions: refresh types, retrieve selected, retrieve + rebuild
- [ ] Build `Refresh & Build` experience:
  - [ ] mode selector (`incremental`/`full`)
  - [ ] stage/progress rail
  - [ ] snapshot output and diff summary surface
- [ ] Build `Analyze` experience:
  - [ ] subtabs for `Permissions`, `Automation`, `Impact`
  - [ ] minimal forms + deterministic summary first
  - [ ] expandable proof/JSON details
- [ ] Build `Ask` experience:
  - [ ] deterministic answer panel first
  - [ ] proof/trust envelope side panel
  - [ ] optional elaboration as secondary action
- [ ] Build `Proofs & Metrics` and `System` views:
  - [ ] proof lookup/replay and metrics export
  - [ ] health/readiness/tooling diagnostics and actionable errors
- [ ] Add empty-state and failure-state UX copy with explicit next actions
- [ ] Add guided first-run onboarding checklist:
  - [ ] connect org
  - [ ] browse/retrieve metadata
  - [ ] refresh/build graph
  - [ ] run analyze and ask workflows
- [ ] Add state persistence:
  - [ ] active tab and key form inputs
  - [ ] org browser retrieval cart and recent query state
- [ ] Add UX telemetry (non-sensitive):
  - [ ] completion/failure counters for core workflows
  - [ ] time-to-complete signals for connect/retrieve/analyze flows

## Test Gates
- [ ] `pnpm --filter web build` passes
- [ ] `pnpm --filter api test` passes
- [ ] browser smoke test validates critical flows:
  - [ ] connect path visibility and required inputs
  - [ ] metadata browse/select/retrieve actions
  - [ ] analyze query run and deterministic response rendering
  - [ ] ask deterministic + proof envelope rendering
- [ ] responsive checks for desktop + mobile breakpoints
- [ ] accessibility checks:
  - [ ] keyboard navigability for tabs/tree/cart
  - [ ] form labels/ARIA roles
  - [ ] contrast and focus visibility

## Risks and Controls
- Risk: redesign breaks existing API flows
  - [ ] keep API contract unchanged; UI-only orchestration refactor first
- Risk: UX polish without functional clarity
  - [ ] each section must include `Current state` + `Next step`
- Risk: UI complexity regresses discoverability
  - [ ] intent-first labels and progressive disclosure for advanced controls
- Risk: migration friction for active operators
  - [ ] include one-phase rollback flag to legacy layout if critical blockers appear

## Definition of Done
- [ ] A first-time operator can connect an org, retrieve scoped metadata, rebuild, and run permission/automation/impact/ask workflows without reading backend docs.
- [ ] Updated docs:
  - [ ] `docs/USAGE_GUIDE.md`
  - [ ] `docs/CHEATSHEET.md`
  - [ ] short UI tour/runbook page for new navigation

---

## Deferred to Phase 26 (Pushed Back)
Previous Phase 25 scope moved intact:
- LLM rollout governance + ops hardening
- shadow/canary controls
- deterministic vs llm_assist regression scorecards
- prompt/key handling and incident runbooks
