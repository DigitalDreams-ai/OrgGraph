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
- org browser action row now uses direct operator language (`Search`, `Load Full Family Catalog`, `Load Visible Children`, `Retrieve Cart`) and a quick workflow block clarifies checkbox-first selection from search/browse into retrieve cart
- org browser now includes `Load Visible Children` to preload member trees for visible families in one pass (up to 20 families) instead of requiring per-family expansion clicks
- org browser metadata search now matches normalized naming patterns (for example, spaced query text against compact/underscored metadata names), and discovery warnings are shown directly in workspace cards
- org browser now bypasses stale empty live-metadata cache artifacts and re-queries org metadata discovery so search/browse recover automatically after prior failed discovery runs
- org browser now auto-loads explorer families on first open and uses simpler action labels (`Search`, `Load Full Family Catalog`, `Load Visible Children`, `Retrieve Cart`) with Enter-to-search support
- org browser now auto-refreshes full family discovery when a connected alias changes, and browse mode enforces full-family coverage (minimum 5000 families) even when search/member limits are set lower
- org browser live metadata discovery now tolerates trailing sf CLI warning lines in JSON command output, preventing false fallback to the 8-family seed set when `sf org list metadata-types --json` includes update notices
- org browser live metadata discovery now strips ANSI/noise-prefixed warning lines and extracts the first valid JSON segment from sf CLI output, preventing false seed-family fallback when stdout includes colored warning or update-notice text
- live metadata catalog cache version is now bumped so stale pre-fix limited-family cache artifacts are invalidated and rebuilt from current org discovery
- org browser family catalog now hydrates from live metadata-type discovery (not only fixed seed families), and family rows now use explicit `Expand`/`Collapse` controls with deterministic lazy child loading
- org browser now invalidates pre-v2 limited live-catalog caches, and family rows expose chevron-style tree expansion so nested children open from the left-edge toggle
- org browser now defaults catalog/member discovery limits to full-coverage mode (5000), surfaces explicit truncation guidance when limits still cut family results, and supports triangle expansion on nested member tree folders (not only top-level families)
- org browser metadata catalog responses now carry live family descriptors (directory, suffix, folder/meta-file flags, child-family counts), and the desktop live-catalog cache version is bumped again so stale pre-descriptor caches are force-refreshed
- org browser family rows now expose those live descriptors inline so operators can browse with a more explorer-like mental model instead of raw metadata-type names alone
- org browser catalog listing now unions live family descriptors with member inventories, so zero-member or not-yet-loaded families still stay visible instead of disappearing from browse/search due to sparse caches
- org browser search results now use the same chevron + checkbox explorer pattern as browse rows, keeping tree expansion behavior consistent whether the operator starts from a family name or a specific metadata item
- org browser search-family rows now load the actual family tree on expand, so search no longer dead-ends in a flat match list when the operator needs to browse child items in-place
- org browser now surfaces explicit catalog-coverage state (`full`, `limited`, `unavailable`) so fallback or truncated family discovery cannot silently read as complete org inventory
- wave11 browser refinement is back in progress: coverage state and explorer expansion affordances still need stronger operator-facing clarity before browser parity can stay closed
- live metadata catalog cache version is bumped again so older partial family caches are force-refreshed before the remaining browser parity work
- wave11 browser fallback hardening now preserves richer stale live-catalog caches when fresh metadata-type discovery fails, preventing regression back to the tiny seed-family catalog when a usable cached family inventory already exists
- org browser now separates name search from family filtering, uses triangle-first family rows, adds `Expand Visible Families` / `Collapse Visible Families`, and scopes `Load Visible Children` to the currently filtered family explorer so operators can browse the full discovered catalog more like a standard org browser
- wave11 browser copy now makes the operator contract explicit in-product: `Search`, `Load Full Family Catalog`, `Load Visible Children`, and `Expand Visible Families` match the real controls, and limited-coverage runs now show a dedicated warning block that tells the operator not to treat the browser as full org inventory until live coverage is restored
- wave11 browser family rows now expose explicit `Load & Expand` / `Expand` / `Collapse` actions on both search and browse surfaces while preserving the left-edge triangle, making tree loading behavior visible without relying on hidden gestures
- Ask now surfaces the latest retrieve handoff directly in the workspace, separates grounded retrieve-scoped prompts from general follow-up prompts, and generates one-click asks from retrieved Flow, Layout, Apex, CustomObject, CustomField, Email Template, and Tab members
- Ask now passes the latest retrieve handoff into `/ask` as explicit evidence scope, so retrieve-grounded Flow review no longer depends on ambient browser state or local-storage-only UI assumptions
- latest-retrieve enforcement is now fail-closed for the currently supported path: explicit Flow read/write asks use the staged retrieve scope, while unsupported latest-retrieve asks refuse instead of silently falling back to unconstrained graph analysis
- the supported Flow path now synthesizes read/write summaries directly from the retrieved flow file when global evidence index paths differ from the staged parse path, preserving deterministic behavior across fixture and packaged-desktop runtimes
- latest-retrieve Ask now also supports explicit retrieved field/object impact and automation summaries (`what touches <field>`, `what automations update <field>`, `what runs on object <object>`), using scoped direct-source evidence fallback when indexed evidence paths do not match the staged retrieve path
- permission-style latest-retrieve asks still fail closed, so retrieve scope is expanded only for the explicitly supported field/object and Flow evidence families
- Ask-depth planning now prefers a narrow semantic-frame contract (`ORGUMENTED_V2_SEMANTIC_FRAME_V1.md`) before any parser-framework decision, so planner evolution is driven by typed intent, grounding, and admissibility needs rather than tool-first churn
- wave6 semantic-frame shadow mode is now started for the `impact_analysis` family: planner output carries a replay-safe `semanticFrame` contract for impact asks
- impact Ask now also treats semantic-frame admissibility as the active execution gate, so ungrounded or unsupported targets fail closed before the old default-field path can run
- wave6 semantic-frame rollout now also actively gates the bounded automation family: `what automations update <field>` and `what runs on object <object>` use replay-safe `automation_path_explanation` frames with explicit `graph_global` vs `latest_retrieve` source mode, and ungrounded automation asks fail closed before fallback execution
- wave6 semantic-frame rollout now also actively gates the bounded perms family: graph-global permission asks execute only when a replay-safe `permission_path_explanation` frame is admissible, and latest-retrieve permission asks fail closed through explicit `evidence_scope_unsupported` semantic-frame blocking
- wave6 semantic-frame gating is now active for the bounded review approval family: approval-style review asks execute only when the `approval_decision` frame is admissible, while latest-retrieve approval review asks fail closed through explicit `SEMANTIC_FRAME_BLOCKED` handling with `evidence_scope_unsupported`
- wave6 now includes a first bounded `evidence_lookup` Ask slice: operators can ask where a metadata component is used by metadata name/fullName, and Salesforce record-Id lookup fails closed with explicit unsupported guidance
- wave6 evidence-lookup now also treats family-qualified prompts such as `Flow X`, `Layout Y`, and `Apex Class Z` as metadata component lookup, preventing those asks from drifting into legacy automation heuristics and expanding deterministic search terms with family-aware file/path signatures
- wave6 latest-retrieve Ask prompt chips now surface bounded component-usage lookup prompts (for example `Based only on the latest retrieve, where is Flow X used?`) so newly retrieved metadata families can flow into evidence-lookup without manual prompt crafting
- wave6 evidence-lookup now normalizes family-qualified target forms such as `Flow called X`, `Flow named "X"`, and flow file/path references (`.../flows/X.flow-meta.xml`) back to the same deterministic metadata-component target before lookup executes
- wave6 evidence-lookup now also accepts metadata-arg notation such as `Flow:X` and `CustomField:Object.Field`, normalizing those forms to the same deterministic metadata-component targets used by Ask and retrieve handoff flows
- review and retrieve-grounded flow decision packets now surface an explicit recommendation verdict/summary plus deterministic evidence-gap lists, making the packet itself closer to a primary approval/review artifact instead of a summary that still requires operator reconstruction
- wave7 follow-up now renders retrieved flow read/write packets with flow-specific operator stats (`Flow signals`, `Reads`, `Writes`, `Flow scope`) instead of the generic approval-style permission placeholder, keeping the packet itself useful as the primary review surface
- flow read/write asks remain on the legacy planner path in this slice; semantic-frame rollout is still intentionally bounded to impact + field/object automation + graph-global permission asks only
- wave4 browser parity closeout is complete (`B006/B007`, `D004`, `G005/G006`), with unified checkbox semantics across search and browse plus predictable unseeded discovery behavior
- browser parity follow-up now also closes `B026`: full live family catalog visibility survives sparse caches, and family/search explorer rows share the same deterministic chevron-and-checkbox interaction model
- desktop card/grid constraints now use wider auto-fit minima and wrapped preformatted text to reduce clipping in Ask, evidence, and diagnostics surfaces
- wave10 follow-up now enforces larger card-grid minimum widths and path-specific wrapping classes, reducing truncation in decision packets, citations, mapping diagnostics, and diagnostics artifacts
- wave10 follow-up now hardens Ask proof/context and citation rendering with explicit path-value wrapping, snippet scroll bounds, and denser auto-fit minima to reduce clipping in mid-width desktop layouts
- wave10 accessibility follow-up now adds live-region semantics to dynamic Ask, Sessions, Browser, and Refresh surfaces and locks label/tab/expansion semantics with a dedicated render-level accessibility smoke test
- wave10 follow-up now wraps long proof-history labels, snapshot IDs, policy IDs, and generated timestamps with explicit `path-value` guards so Proofs surfaces stay bounded under long real-org identifiers
- wave10 accessibility follow-up now extends live-region smoke coverage to Analyze structured triage, Proofs current selection, and Settings & Diagnostics structured snapshot so the remaining dynamic desktop workspaces share the same screen-reader update contract
- refresh handoff is staged and fail-closed from browser selections
- `Run Refresh` now also fails closed until Browser handoff is ready and staged selections are present, preventing rebuild from running on ambiguous retrieve context
- refresh handoff now also fails closed on alias mismatch and persists latest retrieve/selections across relaunch
- `Refresh & Build` now shows explicit staged selection previews (family/member scope) from Browser handoff, reducing retrieve-cart ambiguity without raw JSON
- Browser retrieve failures now clear persisted handoff/selections and fail closed in Refresh instead of silently reusing stale retrieve context
- refresh diff now auto-seeds `from/to` snapshot IDs from recent refresh runs and fails closed when snapshot inputs are missing or identical
- refresh diff now also fails closed when the latest refresh snapshot source path does not match the current Browser handoff parse path, preventing cross-handoff drift comparisons
- `Refresh & Build` now persists handoff lineage with refresh/diff/org-retrieve summaries and marks stale results explicitly when the current Browser handoff changes
- refresh diff now also fails closed when the latest Refresh no longer belongs to the current Browser handoff lineage, preventing stale snapshot comparisons after alias, selection, or retrieve-cycle changes
- org-retrieve summaries now distinguish handoff-backed pipeline runs from auth-only runs, so the staged workflow cannot silently treat a non-retrieve pipeline step as current rebuild evidence
- `Refresh & Build` now presents a numbered four-stage operator sequence (`Retrieve Cart`, `Refresh Semantic State`, `Compare Snapshot Drift`, `Run Org Pipeline`) with deterministic state badges and one explicit next action
- refresh workspace labels and runbook steps now use the same operator language, reducing the last retrieve -> refresh handoff ambiguity between Browser, Refresh, and the real-org quickstart
- wave5 retrieve -> refresh -> diff handoff closure is now materially complete (`B008`, `D005`, `G007`, `G008`), with the primary operator path visible and executable without raw JSON
- packaged desktop smoke now also verifies metadata search plus selective metadata retrieve handoff artifacts whenever a connected org session is available, while remaining explicit-skip in disconnected CI environments so wave5 proof coverage does not create false negatives
- flow grounding now prioritizes explicit flow-name asks over weak object-token inference (prevents false `no automation found for the` fallbacks)
- flow grounding now adds deterministic targeted evidence retry for explicit flow-name asks when first-pass evidence ranking misses the named flow
- flow grounding now tolerates quoted/article-prefixed flow references (for example `Flow "the X" reads and writes`) and keeps explicit-flow asks off the generic object fallback path
- wave6 replay hardening now locks repeated-proof parity for the grounded flow ask family, including the real-operator phrasing `Flow called Civil_Rights_Intake_Questionnaire reads and writes`
- flow grounding now also accepts `Flow called <name>` / `Flow named <name>` phrasing and can infer a flow target from citation source paths when query extraction misses
- flow grounding now normalizes flow file-path/file-name asks (for example `.../flows/<name>.flow-meta.xml`) to the correct flow target instead of drifting into object-field fallback
- flow asks now fail closed with explicit `flow-name-unresolved` remediation when no exact flow API name can be resolved, preventing generic `no automation found ...` fallback responses
- flow read/write asks now emit structured breakage decision packets (with explicit reads/writes summaries and deterministic next actions), not only free-form deterministic text
- flow read/write decision packets now emit `targetType: flow`, richer risk drivers (read/write/object/trigger coverage), and explicit ungrounded-flow remediation actions (`Retrieve flow metadata`, `Increase evidence coverage`)
- flow read/write decision packets now also spotlight top citation source files and include an explicit `Inspect citation sources` next action for evidence-grounding review
- flow read/write synthesis now reconstructs the full retrieved flow source from indexed evidence chunks before parsing, so split XML chunks still yield directional read/write object context instead of shallow packet summaries
- review decision packets now include explicit `riskScore` and `evidenceCoverage` signals to improve approval-workflow readability
- review decision packets now surface explicit top automation names and top impact sources directly inside risk drivers and next-action rationales, with deterministic integration assertions
- review decision packets now spotlight top citation source files and add an explicit `Inspect citation sources` action so operators can verify grounding evidence without raw JSON detours
- phase17 benchmark guards now fail closed on review-packet specificity (spotlighted automation/impact drivers + source-specific next-action rationale) in prepare/human/verify/status tooling
- proof history supports searchable labels and open-first artifact access
- Ask `Save to history` now executes a true history handoff (sync proof identifiers, switch to Proofs, and refresh recent proof labels) instead of duplicating `Open proof`
- Proofs & History action row now defaults to label-first wording (`Open/Replay Selected History`), while raw token lookup stays in advanced details with explicit fail-closed guidance when no selection is present
- Proofs & History now supports label-first artifact export (`Export Selected Proof` / `Export Selected Replay`) so normal audit flows can export JSON artifacts without token-first lookup
- Proofs & History now keeps the selected history label independent from advanced proof/replay token fields, so primary open/replay actions stay label-first even when debug IDs are typed manually
- Proofs & History primary open/replay actions now require a selected history label, while advanced proof ID / replay token lookup is isolated behind explicit `Open by Token` / `Replay by Token` actions so token entry cannot masquerade as the normal history-first workflow
- Proofs & History primary export actions now also run from the selected history label even when proof/replay artifacts are not already open, keeping export aligned to the history-first workflow instead of requiring an open-first detour
- Proofs & History current-selection status now explicitly states whether the workspace is being driven by a selected history label or by advanced token lookup, reducing remaining operator ambiguity in mixed debug/history states
- CI heavy Windows jobs are path-gated for minute efficiency
- PR Autofill now runs on `opened/reopened` only (not every push), and Actions retention now includes an automated cleanup workflow that prunes older completed runs per workflow
- CI now runs packaged desktop smoke in the same Windows validate job (instead of cross-job runtime artifact handoff), reducing Actions artifact storage pressure without dropping trust gates
- Actions retention cleanup now runs twice daily and keeps the most recent 14 completed runs per workflow by default; runtime-nightly is now weekly with 1-day artifact retention to protect CI storage/minute budget without weakening PR trust gates
- wave11 retention follow-up now locks that 14-run cleanup policy and the 1-day runtime artifact retention defaults with a repo-local regression test, preventing silent workflow drift
- wave11 CI follow-up now replaces the external `dorny/paths-filter` dependency with a repo-local change-detection script and unit test so `detect-changes` no longer flakes on third-party action download/auth failures
- wave11 regression corpus now locks edge component-usage families for Apex Class and Apex Trigger prompts, including metadata-arg and path-qualified normalization so those asks cannot drift back into weak generic answers
- wave11 runtime regression coverage now also render-checks Connect and Operator Rail status surfaces so `runtime unavailable` cannot silently drift back into generic blocked or missing-tool wording
- release checklist now aligns to pnpm-only commands and includes explicit real-org operator workflow evidence requirements
- wave12 release surfaces now include a dedicated rollback playbook plus release-notes evidence template, keeping release/rollback discipline aligned to the packaged desktop workflow instead of older mixed promotion language
- wave12 now also includes a clean-machine operator-proof worksheet so non-author validation has a single explicit capture template instead of ad-hoc notes
- wave12 release docs now share a canonical artifact-path map so executable, installer, smoke, operator-proof, and rollback evidence locations are recorded in one consistent format
- wave12 rollback readiness now also includes a canonical rollback-result template so executed rollback validation can be captured in a consistent release-evidence format
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
- Connect, Operator Rail, and Settings/Diagnostics now show explicit tool-status source labels (`runtime unavailable`, `live status`, `status not loaded`) so runtime loss cannot be misread as `runtime blocked` or as missing `sf`/`cci`
- web regression coverage now locks runtime-gate and tool-status surface copy for Connect, Operator Rail, and Settings/Diagnostics (`pnpm --filter web test:runtime-status`)
- wave2 runtime-gate follow-up now distinguishes `runtime blocked` from `runtime unavailable` across Connect, Operator Rail, and Settings/Diagnostics, so fail-closed `/ready` states no longer erase live tool/session diagnostics while deterministic workflows remain visibly blocked
- packaged desktop smoke now verifies a second clean packaged relaunch reaches `ready`, tightening wave2 startup parity proof beyond the first launch only
- fallback error copy now distinguishes API non-response failures from normal request-validation failures
- session action labels now distinguish quick top-bar attach from explicit connect/switch controls in Org Sessions
- session alias switch now reuses connect auth/bridge flow so missing CCI alias registrations are remediated during switch, not only during explicit connect
- Org Sessions now exposes explicit `Bridge CCI Alias` action backed by `/org/session/bridge`, with fail-closed alias/auth/tooling errors and deterministic remediation hints when CCI registry import fails
- disconnected/session-switch-failure state now preserves the last active alias and persisted switch timestamp, keeping restore targets deterministic across relaunch even when session audit history is trimmed
- desktop packaged smoke now retries one launch automatically when the desktop process exits before readiness, reducing false-negative launch flake failures in local/CI validation
- Settings & Diagnostics structured triage rows now expose direct operator actions (`Refresh Status`, `Load Org Status`, `Run Preflight`, `Open Org Sessions`, `Open Refresh & Build`) so runtime/tool/session recovery no longer depends on reading prose or expanding raw readiness JSON first
- Settings & Diagnostics now renders structured runtime triage cards (bootstrap/db/fixtures/evidence health + recovery checklist) and demotes raw readiness JSON to an optional details panel
- Settings & Diagnostics now surfaces alias preflight checks/issues and remediation checklist actions alongside tooling status (auth/CCI alias/parse-path parity), reducing bounce-back to Org Sessions for diagnostics triage
- Settings & Diagnostics now includes a deterministic triage snapshot (runtime/toolchain/session status + explicit next action per domain), reducing dependence on raw JSON for first-line operator diagnosis
- wave8 diagnostics follow-up now exposes direct quick-action buttons inside the Runtime Health and Tooling Status cards, so first-line recovery does not require scrolling to the lower structured snapshot before rerunning status, preflight, or opening Org Sessions / Refresh & Build
- Analyze now includes structured operator action checklists for permission, mapping, automation, impact, and system-permission runs
- Analyze now includes one-click Ask handoff actions for automation and impact results so deterministic analysis context can be promoted directly into trust/proof decision packets
- Analyze structured snapshot rows now expose direct `Open Org Browser` / `Open Refresh & Build` recovery actions when principal-map triage says retrieve or refresh is required, reducing manual tab hunting during permission recovery
- Analyze now includes a mode-aware structured triage snapshot (status + next action) plus Ask handoff actions for permission and system-permission results, reducing first-line dependence on raw JSON inspection
- Analyze structured triage snapshot now includes direct action buttons (rerun analysis, diagnose mapping, and Open Ask handoff) so operators can execute recommended recovery/decision steps without leaving the snapshot card
- Analyze automation and impact triage now also switch from empty Ask handoff buttons to explicit Browser/Refresh recovery actions when no deterministic matches are present, reducing another no-result edge path that previously pushed operators into generic reruns or raw inspection
- Analyze permission, impact, and system-permission evidence cards now wrap long path-bearing values with explicit `path-value` guards, and a dedicated render regression locks that markup so long graph paths and map locations stay bounded in desktop layouts
- Operator Rail now includes a runtime-triage summary so common readiness failures can be diagnosed without opening raw JSON
- Proofs & History now auto-selects a current label on history refresh so open/replay operations are label-first by default
- wave10 density guardrails now widen card-grid minima and heading wrapping to reduce clipping/overlap in Ask, Analyze, Proofs, and Diagnostics
- wave10 accessibility baseline now includes explicit focus-visible rings across core interactive controls and standardized checkbox/radio sizing for keyboard clarity
- wave10 follow-up now wraps long path/identifier values in Connect, Refresh, and System with explicit `path-value`/`diagnostic-code-block` hooks, and the runtime-status regression gate now render-checks those markup guards so long paths/JSON stay bounded

Still unresolved:
- planner/compiler still needs deeper typed coverage beyond current query families
- semantic-frame v1 is authoritative for impact and bounded field/object automation asks; perms now emits shadow-mode frames, while broader Ask families still rely on the legacy planner path
- decision packet quality is not yet benchmark-accepted for approval use
- explain/analyze workflows still need deeper typed cards for remaining edge-state diagnostics
- proofs/history still needs full label-first lifecycle closure beyond current baseline auto-selection
- layout/accessibility still needs final visual QA lock after latest density guardrail pass
- clean-machine pass for the new real-org quickstart runbook is still pending
- rollback proof still needs one executed candidate/known-good validation cycle, even though the canonical playbook now exists

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

2. Wave7 finish slice:
- deepen packet usefulness for approval and retrieved-metadata review scenarios
- keep flow-target packets rendered as flow packets, not generic approval cards
- keep reads/writes/change-impact synthesis specific enough to serve as a primary operator artifact

3. Wave8 finish slice:
- deepen structured diagnostics/analysis cards for primary operator triage
- reduce raw JSON dependence in permission/automation/impact/map workflows

4. Wave9 finish slice:
- complete label-first proof lifecycle (open/replay/export) without token-first dependence in normal workflows
- keep token fields strictly advanced/debug while preserving replay parity checks and label-first selection semantics

5. Wave10 finish slice:
- close remaining clipping/overflow issues on Ask/Analyze/Diagnostics cards
- lock viewport and long-string rendering tests

6. Wave11 finish slice:
- complete P0/P1 burn-down lock and regression gates
- keep CI strict while preserving minute-efficiency controls
- keep Actions storage bounded with automated run-retention pruning and short artifact retention defaults

7. Wave12 finish slice:
- close clean-machine quickstart proof and release/rollback evidence gates

Preferred wave6 follow-on after the current packet-quality work:
- promote perms from semantic-frame shadow mode into active gating if the current fail-closed behavior can be preserved without widening scope
- keep proving better grounding and admissibility behavior without replay regression

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
