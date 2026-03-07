# Orgumented v2 Execution

Date: March 5, 2026

Execution master:
- `docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md`
- `docs/planning/v2/ORGUMENTED_V2_PIVOT_LOCK.md`

## Wave Sequence

Execution order to reach 100% remains fixed:
- wave1 baseline lock
- wave2 runtime convergence
- wave3 sessions/toolchain reliability
- wave4 org browser explorer completion
- wave5 retrieve -> refresh handoff completion
- wave6 ask planner/compiler depth
- wave7 decision-packet quality
- wave8 explain/analyze depth
- wave9 proofs/history productization
- wave10 design/layout/accessibility hardening
- wave11 bug burn-down and CI quality lock
- wave12 release readiness and operator proof
- wave13 stabilization window

## Current Position

Materially true now:
- desktop runtime is Windows-native Tauri + Next + Nest
- Docker is out of runtime/release/operator flow
- `/ready` remains fail-closed when bootstrap grounding fails
- runtime bootstrap now retries once on semantic-drift-budget startup failures after clearing stale semantic state artifacts, then remains fail-closed if recovery still fails
- real-org session attach/switch and selective retrieve path is materially functional
- org browser supports name-first search and grouped explorer/tree selection
- org browser now uses explicit cart language (`checked row = in cart`) with simpler explorer/retrieve actions
- org browser action row now uses direct operator language (`Search`, `Browse All`, `Load Visible Items`, `Retrieve Cart`) and a quick workflow block clarifies checkbox-first selection from search/browse into retrieve cart
- org browser now includes `Load Visible Items` to preload member trees for visible families in one pass (up to 20 families) instead of requiring per-family expansion clicks
- org browser metadata search now matches normalized naming patterns (for example, spaced query text against compact/underscored metadata names), and discovery warnings are shown directly in workspace cards
- org browser now bypasses stale empty live-metadata cache artifacts and re-queries org metadata discovery so search/browse recover automatically after prior failed discovery runs
- org browser now auto-loads explorer families on first open and uses simpler action labels (`Search`, `Browse All`, `Load Visible Items`, `Retrieve Cart`) with Enter-to-search support
- org browser family catalog now hydrates from live metadata-type discovery (not only fixed seed families), and family rows now use explicit `Expand`/`Collapse` controls with deterministic lazy child loading
- wave4 browser parity closeout is complete (`B006/B007`, `D004`, `G005/G006`), with unified checkbox semantics across search and browse plus predictable unseeded discovery behavior
- desktop card/grid constraints now use wider auto-fit minima and wrapped preformatted text to reduce clipping in Ask, evidence, and diagnostics surfaces
- wave10 follow-up now enforces larger card-grid minimum widths and path-specific wrapping classes, reducing truncation in decision packets, citations, mapping diagnostics, and diagnostics artifacts
- wave10 follow-up now hardens Ask proof/context and citation rendering with explicit path-value wrapping, snippet scroll bounds, and denser auto-fit minima to reduce clipping in mid-width desktop layouts
- refresh handoff is staged and fail-closed from browser selections
- `Run Refresh` now also fails closed until Browser handoff is ready and staged selections are present, preventing rebuild from running on ambiguous retrieve context
- refresh handoff now also fails closed on alias mismatch and persists latest retrieve/selections across relaunch
- `Refresh & Build` now shows explicit staged selection previews (family/member scope) from Browser handoff, reducing retrieve-cart ambiguity without raw JSON
- Browser retrieve failures now clear persisted handoff/selections and fail closed in Refresh instead of silently reusing stale retrieve context
- refresh diff now auto-seeds `from/to` snapshot IDs from recent refresh runs and fails closed when snapshot inputs are missing or identical
- refresh diff now also fails closed when the latest refresh snapshot source path does not match the current Browser handoff parse path, preventing cross-handoff drift comparisons
- flow grounding now prioritizes explicit flow-name asks over weak object-token inference (prevents false `no automation found for the` fallbacks)
- flow grounding now adds deterministic targeted evidence retry for explicit flow-name asks when first-pass evidence ranking misses the named flow
- flow grounding now tolerates quoted/article-prefixed flow references (for example `Flow "the X" reads and writes`) and keeps explicit-flow asks off the generic object fallback path
- flow grounding now also accepts `Flow called <name>` / `Flow named <name>` phrasing and can infer a flow target from citation source paths when query extraction misses
- flow grounding now normalizes flow file-path/file-name asks (for example `.../flows/<name>.flow-meta.xml`) to the correct flow target instead of drifting into object-field fallback
- flow asks now fail closed with explicit `flow-name-unresolved` remediation when no exact flow API name can be resolved, preventing generic `no automation found ...` fallback responses
- flow read/write asks now emit structured breakage decision packets (with explicit reads/writes summaries and deterministic next actions), not only free-form deterministic text
- flow read/write decision packets now emit `targetType: flow`, richer risk drivers (read/write/object/trigger coverage), and explicit ungrounded-flow remediation actions (`Retrieve flow metadata`, `Increase evidence coverage`)
- flow read/write decision packets now also spotlight top citation source files and include an explicit `Inspect citation sources` next action for evidence-grounding review
- review decision packets now include explicit `riskScore` and `evidenceCoverage` signals to improve approval-workflow readability
- review decision packets now surface explicit top automation names and top impact sources directly inside risk drivers and next-action rationales, with deterministic integration assertions
- review decision packets now spotlight top citation source files and add an explicit `Inspect citation sources` action so operators can verify grounding evidence without raw JSON detours
- phase17 benchmark guards now fail closed on review-packet specificity (spotlighted automation/impact drivers + source-specific next-action rationale) in prepare/human/verify/status tooling
- proof history supports searchable labels and open-first artifact access
- Ask `Save to history` now executes a true history handoff (sync proof identifiers, switch to Proofs, and refresh recent proof labels) instead of duplicating `Open proof`
- Proofs & History action row now defaults to label-first wording (`Open/Replay Selected History`), while raw token lookup stays in advanced details with explicit fail-closed guidance when no selection is present
- Proofs & History now supports label-first artifact export (`Export Selected Proof` / `Export Selected Replay`) so normal audit flows can export JSON artifacts without token-first lookup
- CI heavy Windows jobs are path-gated for minute efficiency
- PR Autofill now runs on `opened/reopened` only (not every push), and Actions retention now includes an automated cleanup workflow that prunes older completed runs per workflow
- CI now runs packaged desktop smoke in the same Windows validate job (instead of cross-job runtime artifact handoff), reducing Actions artifact storage pressure without dropping trust gates
- Actions retention cleanup now runs twice daily and keeps the most recent 14 completed runs per workflow by default; runtime-nightly is now weekly with 1-day artifact retention to protect CI storage/minute budget without weakening PR trust gates
- release checklist now aligns to pnpm-only commands and includes explicit real-org operator workflow evidence requirements
- real-org desktop quickstart runbook now exists as a single explicit Git Bash workflow for connect, browser retrieve, refresh handoff, and Ask proof capture
- operator-machine pass evidence for real-org quickstart is now captured with proof/replay IDs in `docs/planning/v2/REAL_ORG_OPERATOR_PROOF_RESULTS.md`
- operator evidence now includes successful grounded Ask output for both direct flow-name and `Flow called <name>` phrasing with trusted envelopes
- org-session refresh now only marks runtime unavailable on true runtime failures, so alias/preflight 4xx errors no longer masquerade as missing local tools
- org-session runtime-unavailable detection now ignores generic 5xx surfaces unless the payload explicitly indicates runtime/bootstrap unavailability
- runtime-bootstrap failure regression now verifies `/org/status` remains reachable while `/ready` stays fail-closed
- runtime-bootstrap failure regression now also verifies `/org/preflight` remains reachable and `/org/status` keeps tool/session message surfaces while `/ready` stays fail-closed
- runtime bootstrap retry now also recovers when semantic-drift failures are wrapped in response payload messages (for example, `Bad Request Exception` with nested drift text)
- runtime bootstrap now performs a final guarded recovery pass after repeated recoverable drift failures by clearing full runtime semantic artifacts (DB/index/state/snapshots) and retrying once more with rebaseline before failing closed
- runtime-unavailable signaling is now shared across Connect, Operator Rail, and Settings/Diagnostics (shell reachability + connect runtime detection), reducing false tool-missing interpretation outside Org Sessions
- Connect, Operator Rail, and Settings/Diagnostics now show explicit tool-status source labels (`runtime blocked`, `live status`, `status not loaded`) so runtime loss cannot be misread as missing `sf`/`cci`
- fallback error copy now distinguishes API non-response failures from normal request-validation failures
- session action labels now distinguish quick top-bar attach from explicit connect/switch controls in Org Sessions
- session alias switch now reuses connect auth/bridge flow so missing CCI alias registrations are remediated during switch, not only during explicit connect
- Org Sessions now exposes explicit `Bridge CCI Alias` action backed by `/org/session/bridge`, with fail-closed alias/auth/tooling errors and deterministic remediation hints when CCI registry import fails
- disconnected/session-switch-failure state now preserves the last active alias and persisted switch timestamp, keeping restore targets deterministic across relaunch even when session audit history is trimmed
- desktop packaged smoke now retries one launch automatically when the desktop process exits before readiness, reducing false-negative launch flake failures in local/CI validation
- Settings & Diagnostics now renders structured runtime triage cards (bootstrap/db/fixtures/evidence health + recovery checklist) and demotes raw readiness JSON to an optional details panel
- Settings & Diagnostics now surfaces alias preflight checks/issues and remediation checklist actions alongside tooling status (auth/CCI alias/parse-path parity), reducing bounce-back to Org Sessions for diagnostics triage
- Settings & Diagnostics now includes a deterministic triage snapshot (runtime/toolchain/session status + explicit next action per domain), reducing dependence on raw JSON for first-line operator diagnosis
- Analyze now includes structured operator action checklists for permission, mapping, automation, impact, and system-permission runs
- Analyze now includes one-click Ask handoff actions for automation and impact results so deterministic analysis context can be promoted directly into trust/proof decision packets
- Analyze now includes a mode-aware structured triage snapshot (status + next action) plus Ask handoff actions for permission and system-permission results, reducing first-line dependence on raw JSON inspection
- Analyze structured triage snapshot now includes direct action buttons (rerun analysis, diagnose mapping, and Open Ask handoff) so operators can execute recommended recovery/decision steps without leaving the snapshot card
- Operator Rail now includes a runtime-triage summary so common readiness failures can be diagnosed without opening raw JSON
- Proofs & History now auto-selects a current label on history refresh so open/replay operations are label-first by default
- wave10 density guardrails now widen card-grid minima and heading wrapping to reduce clipping/overlap in Ask, Analyze, Proofs, and Diagnostics
- wave10 accessibility baseline now includes explicit focus-visible rings across core interactive controls and standardized checkbox/radio sizing for keyboard clarity

Still unresolved:
- planner/compiler still needs deeper typed coverage beyond current query families
- decision packet quality is not yet benchmark-accepted for approval use
- explain/analyze workflows still need deeper typed cards for remaining edge-state diagnostics
- proofs/history still needs full label-first lifecycle closure beyond current baseline auto-selection
- layout/accessibility still needs final visual QA lock after latest density guardrail pass
- clean-machine pass for the new real-org quickstart runbook is still pending

Operational note:
- desktop smoke should run after desktop build completes; running both in parallel can produce a false process-exit readiness failure

## Regrouped 100% Completion Focus

This execution plan is now anchored to the regrouped scorecard in:
- `docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md`

Short version:
1. close runtime/session clarity debt
2. finish browser/retrieve operator workflow parity
3. deepen Ask grounding and packet quality
4. close layout/accessibility defects
5. burn down P0/P1 and finish release/operator proof

## Locked Sequence (No Churn)

Mandatory order for active slices:
1. wave2 + wave3 reliability closure
2. wave4 + wave5 workflow parity closure
3. wave6 + wave7 grounding + packet quality
4. wave8 + wave9 structured analysis + proof lifecycle closure
5. wave10 layout/accessibility closure
6. wave11 + wave12 defect/release closure
7. wave13 stabilization hold

Rules:
- no full restart while this sequence remains feasible
- no Stage 2 expansion while Stage 1 gates remain open
- fixture-only evidence does not close Stage 1 completion gates

## Immediate Frontier (Next Slices)

1. Wave2 finish slice:
- lock runtime-unavailable vs tool-missing behavior across remaining workspace surfaces
- add explicit regression tests for readiness + org status surfaces

2. Wave5 finish slice:
- close retrieve -> refresh -> diff handoff proof gaps for real-org workflows
- lock staged summaries and fail-closed guidance when handoff is incomplete

3. Wave8 finish slice:
- deepen structured diagnostics/analysis cards for primary operator triage
- reduce raw JSON dependence in permission/automation/impact/map workflows

4. Wave9 finish slice:
- complete label-first proof lifecycle (open/replay/export) without token-first dependence in normal workflows
- keep token fields strictly advanced/debug while preserving replay parity checks

5. Wave10 finish slice:
- close remaining clipping/overflow issues on Ask/Analyze/Diagnostics cards
- lock viewport and long-string rendering tests

6. Wave11 finish slice:
- complete P0/P1 burn-down lock and regression gates
- keep CI strict while preserving minute-efficiency controls
- keep Actions storage bounded with automated run-retention pruning and short artifact retention defaults

7. Wave12 finish slice:
- close clean-machine quickstart proof and release/rollback evidence gates

## Execution Cadence (Mandatory)

After every commit, execute this loop before starting the next slice:
1. update impacted docs and project-memory records
2. continue with the next best scoped step on the same wave/slice
3. create a PR when that coherent section is complete
4. monitor CI to completion
5. if CI fails, fix immediately and re-run
6. when CI succeeds, merge, sync main, and open the next wave branch

Do not start a new phase on the same branch after merge. Use one branch per coherent wave slice.

## Remaining Stage 1 Product Gates

These outcomes still need explicit proof:
- Refresh and Build as a full operator workflow, not backend summary output
- Explain and Analyze as structured primary workflows
- Proofs and History without token-bookkeeping dependency
- Settings and Diagnostics with clear actionable triage paths
- packaged desktop shell as primary operator path

## Acceptance Checkpoints

### Checkpoint A
- `pnpm --filter api test`
- deterministic output contract remains green

### Checkpoint B
- `pnpm --filter web build`
- workspace rendering compiles cleanly

### Checkpoint C
- `pnpm desktop:build`
- Windows packaging remains green

### Checkpoint D
- `pnpm desktop:smoke:release`
- packaged shell proves startup, grounding, engine reachability, ask, proof/replay, and org session flow

### Checkpoint E
- selected Stage 1 benchmark workflow runs without raw JSON dependence
- measurable lift is captured
- packet is usable as primary review artifact

### Checkpoint F
- Sessions, Browser, Refresh/Build, Analyze, Proofs/History, and Diagnostics reach parity gates

## Verification Bar

Minimum for runtime or semantic changes:
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`

Required for semantic-runtime changes:
- deterministic replay parity
- proof integrity
- failure-mode clarity
- no hidden unconstrained fallback

## Stop Conditions

Stop and fix before continuing if:
- replay parity regresses
- proof identity/replay token stability regresses
- UI absorbs policy/decision logic
- packaged vs local divergence increases
- benchmark lift cannot be defined for active slice

## 90-Day Focus

- finish runtime/session/browser/refresh hardening
- deepen planner and decision packet quality
- complete workflow parity and operator-proof release readiness
