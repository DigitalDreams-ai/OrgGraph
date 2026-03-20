# Orgumented v2 100% Completion Plan

Date: March 5, 2026  
Status: active execution master plan (regrouped, refreshed)

This is the single execution plan for full Stage 1 completion of Orgumented desktop:
- core runtime and deterministic trust contract
- all Stage 1 workflows
- planner/compiler depth
- decision-packet quality
- proof/history usability
- design/layout/accessibility
- bug burn-down and release readiness

Execution lock companion:
- `docs/planning/v2/ORGUMENTED_V2_PIVOT_LOCK.md`

## Regroup Refresh (Current Truth)

The following are now true in main and should not be re-planned as open:

1. Wave6 grounding hardening:
- explicit flow-name asks use stronger evidence-grounding paths
- constrained-citation cases are covered by targeted regression

2. Wave4 browser resilience:
- stale empty live metadata cache is bypassed and re-queried
- browser includes one-click visible-family member preload (`Load Visible Children`)

3. Wave10 boundary hardening:
- major clipping/overflow defects in core Ask/Analyze/Diagnostics surfaces were reduced with stronger grid minima and wrapping rules
- accessibility smoke coverage is now part of the wave10 finish path for Ask, Sessions, Browser, and Refresh
- browser limited-coverage warning copy and long discovery-warning wrapping are now regression-gated as part of the wave10 finish path, so partial live catalog states remain readable and operator-safe
- long path/identifier surfaces in Connect, Refresh, and System now use explicit wrappers, and the runtime-status regression gate render-checks those guards so raw JSON and path-heavy summaries stay bounded
- targeted web regression gates are now part of the wave11 CI lock path, so Ask/Analyze/Proofs/System UI regressions fail in `validate` instead of remaining local-only checks
4. Wave2 runtime convergence closure:
- packaged desktop smoke now proves isolated stale-bootstrap recovery on launch one and a grounded runtime state on launch two
- operator-facing readiness surfaces now normalize shell, Diagnostics, and Connect workspace status into deterministic labels instead of leaking raw readiness codes or boolean internals
5. Wave5 packaged handoff proof hardening:
- packaged desktop smoke now verifies latest ingest lineage, handoff-backed refresh summary, and org-pipeline step output after selective metadata retrieve whenever a connected org session is available
- when the handoff produces only one deterministic snapshot ID, smoke records an explicit `skipped-same-snapshot` diff status instead of claiming a fake drift proof
- packaged desktop smoke against alias `shulman-uat` now records `retrieveHandoffProof.status=verified` for `CustomObject Opportunity` in `logs/desktop-release-smoke-result.json`, so Wave5 packaged real-org handoff proof is no longer pending on ad hoc manual reconstruction

Remaining work is now primarily around:
- wave11 defect + CI discipline
- wave12 release evidence and operator proof
- wave13 stabilization hold

## 100% Domain Matrix

| Domain | 100% Definition | Current | Remaining |
|---|---|---|---|
| runtime core | packaged startup deterministic, fail-closed, no ambiguous status | mostly in place | close wave2 runtime/tooling parity gaps and startup drift edge cases |
| sessions/browser/retrieve | connect/switch/restore deterministic and browser parity delivered | complete | maintain packaged handoff proof and lock end-to-end rebuild workflow parity |
| ask/planner | grounded metadata asks with replay-safe proof | complete | maintain deterministic evidence-lookup normalization, replay parity, and bounded semantic-frame admissibility |
| decision packets | approval-grade, trusted by workflow | complete | maintain proxy benchmark verification and proof-bound PR publication |
| analyze/diagnostics | structured triage without JSON dependency | complete | maintain one clear triage path with evidence-first secondary cards |
| proofs/history | label-first reopen/replay/export as primary flow | complete | maintain history-first selection semantics and keep advanced tokens debug-only |
| design/layout/a11y | no clipping + keyboard/focus baseline | complete | maintain wave10 render/accessibility guardrails and calmer workspace hierarchy |
| defects/ci/release | P0/P1 zero, stable CI, release+rollback proven | in progress | wave11 burn-down + wave12 clean-machine/operator proof |

## 100% Scorecard Pillars

Every wave contributes to one or more pillars. "100%" is reached only when every pillar is green:

1. Core runtime integrity:
- packaged desktop startup is deterministic and fail-closed
- runtime and tool status are never conflated

2. Core workflow completeness:
- Sessions, Browser, Refresh/Build, Ask, Analyze, Proofs/History, Diagnostics are production-safe
- no operator dependence on raw JSON for normal workflows

3. Planner/packet quality:
- grounded Ask responses avoid weak generic fallback
- decision packets are trusted review artifacts with actionable next steps

4. UX/design/layout quality:
- no clipping/overflow defects in supported desktop viewports
- consistent labels, action semantics, and focus behavior
- low-redundancy surfaces with one clear primary artifact and progressive disclosure for secondary detail

5. Defect/release discipline:
- P0/P1 defects closed and held stable
- release checklist, rollback path, and clean-machine operator proof completed

## Definition Of 100%

Orgumented is 100% complete for v2 scope only when all conditions below are true at once:

1. Runtime is converged and fail-closed:
- packaged desktop behavior matches local verification behavior for core flows
- no Docker dependency and no browser-era runtime assumptions in product path
- runtime readiness fails closed when grounding/bootstrap is invalid

2. Trust contract is deterministic:
- same snapshot + query + policy always returns equivalent answer/proof/replay
- proof and replay artifacts are persisted, queryable, and operator-usable
- no hidden unconstrained fallback

3. Stage 1 workflows are product-grade:
- Org Sessions
- Org Browser
- Refresh and Build
- Ask
- Explain and Analyze
- Proofs and History
- Settings and Diagnostics

4. UX quality is production-safe:
- no clipping/overflow/truncation on supported desktop viewports
- selection, labels, and actions are predictable
- keyboard/focus baseline passes on critical workflows
- primary workflow state is visible without scanning dense, redundant card grids
- raw JSON, debug payloads, and low-signal telemetry remain secondary surfaces

5. Quality and release discipline is complete:
- P0/P1 defects are zero
- CI trust gates are green and cost-controlled
- Windows package + smoke are stable
- runbooks are explicit and validated by a non-author operator

## Pivot Lock Rules

Mandatory:
1. no full-restart program while current desktop architecture can still satisfy Stage 1 gates
2. no Docker/web-runtime reintroduction in runtime/release/operator flow
3. no Stage 2/3/4 expansion while Stage 1 waves remain open
4. fixture-only evidence cannot close Stage 1 completion claims

## Operating Rules

- One branch per coherent slice: `dna-wave<N>-<slice-name>`.
- One PR per coherent slice.
- No mixed-scope PRs.
- Every wave has explicit acceptance gates and proof artifacts.
- If replay parity regresses, stop and fix before continuing.
- After each merge: update docs + project-memory, then start the next branch.

## Wave Progress Snapshot

| Wave | Theme | Primary IDs | Status | Next Gate |
|---|---|---|---|---|
| wave1 | baseline lock and triage | B001-B024 mapped | Complete | Maintain drift-free docs |
| wave2 | runtime convergence | B001, B002 | Complete | Maintain status-surface regression gate and packaged startup proof |
| wave3 | sessions and toolchain reliability | B004, B005 | Complete | Session state persists active alias/switch timestamps and restore alias remains deterministic across relaunch |
| wave4 | org browser explorer | B006, B007 | Complete | Maintain checkbox/search parity while closing wave5 handoff |
| wave5 | retrieve -> refresh handoff | B008 | Complete | Maintain packaged real-org handoff smoke proof |
| wave6 | ask planner/compiler depth | B003, B009 | Complete | Maintain bounded semantic-frame admissibility and deterministic evidence-lookup coverage |
| wave7 | decision-packet quality | B010, B017 | Complete | Maintain proxy benchmark verification and proof-bound PR publication |
| wave8 | analyze and diagnostics depth | B015, B016, B022 | Complete | Maintain one clear triage path through structured actions while keeping secondary Analyze and Diagnostics cards evidence-first |
| wave9 | proofs/history productization | B011 | Complete | Maintain label-first selection independence and keep advanced token lookup debug-only |
| wave10 | design/layout/accessibility | B012, B020, B021 | Complete | Maintain calmer workspace hierarchy, proof-history identifier guardrails, and embedded web regression coverage |
| wave11 | bug burn-down and CI quality lock | B013, B018, B023 | In Progress | P0/P1 count to zero, stable trust gates, edge metadata-family regressions locked, embedded web regressions enforced in `validate`, and Actions retention policy regression-gated |
| wave12 | release readiness and operator proof | B014, B019 | In Progress | Clean-machine runbook pass + rollback proof |
| wave13 | post-100 stabilization | B024 | Open | No P0/P1 regressions during hold window |

## Pillar To Wave Map

| Pillar | Owning Waves | Completion Signal |
|---|---|---|
| Core runtime integrity | wave2, wave3, wave12 | packaged runtime + session/toolchain parity proven |
| Core workflow completeness | wave3, wave4, wave5, wave8, wave9 | all Stage 1 workflows pass runbook paths |
| Planner/packet quality | wave6, wave7 | grounded Ask + approval-grade packet benchmark pass + PR publication path |
| UX/design/layout quality | wave10 | no clipping/overflow, action semantics locked, and dense redundant surfaces simplified |
| Defect/release discipline | wave11, wave12, wave13 | P0/P1 zero, release evidence complete, stabilization clean |

## GitHub / CCI Support Track Snapshot

This is a cross-wave support track, not a replacement for the locked numbered wave order.

Overall implementation progress:
- approximately 75%
- policy and ownership boundaries are complete
- local auth/repo-management, repo context, changed-file scope, and the typed validation/runtime workflow lanes are now live, but broader benchmark/release linkage remains open

| Support Track Item | Owning Wave(s) | Status | Approx. Complete | Next Gate |
|---|---|---|---|---|
| policy and ownership boundary (`sf`, `cci`, GitHub, Orgumented) | foundation | Complete | 100% | hold the tool boundary stable while implementation begins |
| local GitHub auth and repo-management path (`gh`-backed login, status, list, create, select) | wave11 | In Progress | 70% | keep the Connect workspace calm while routing later repo-backed workflows through the selected binding |
| read-only repo / branch / PR / changed-file context in the engine | wave7 | Complete | 100% | maintain typed selected-repo and PR file-scope reads while later review flows consume them |
| PR publication of decision packets, proof links, and review summaries | wave7 | Complete | 100% | maintain proof-bound idempotent PR comment publication while check-run publication remains optional future extension |
| typed local `cci` job registry | wave7, wave11 | Planned | 20% | elevate current alias/info/import support into explicit typed jobs with allowlist, mutability class, timeout, and audit trail |
| typed GitHub Actions dispatch and status ingest | wave11 | In Progress | 70% | keep the allowlist typed and repo-bound while adding repo-safe validation lanes before broader benchmark/release flows |
| explicit user-bound repo binding for commit-capable metadata workflows | wave11, wave12 | In Progress | 45% | fail closed in future commit-capable metadata flows unless the selected bound repo is present and not the Orgumented product repo |
| GitHub release / artifact linkage from canonical release evidence | wave12 | Open | 0% | release evidence links cleanly to GitHub artifacts without replacing local proof/replay storage |

## wave1 - Baseline Lock And Triage

Objective:
- keep one deduplicated backlog/defect/gap source of truth

Exit:
- `WAVE1_BACKLOG.md`, `WAVE1_DEFECT_MATRIX.md`, `WAVE1_FEATURE_GAP_MATRIX.md` aligned
- all open work wave-mapped with acceptance gates

## wave2 - Runtime Convergence

Objective:
- eliminate remaining packaged-vs-local divergence and startup ambiguity

Scope:
- bootstrap grounding and drift-budget recovery
- runtime-unavailable vs tooling-unavailable disambiguation
- fail-closed readiness signaling
- normalized operator-facing readiness labels across shell and diagnostics surfaces

Exit:
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`
- manual packaged startup proof without ambiguous tool-missing false states
- desktop startup does not fail from avoidable bootstrap drift conditions
- shell status surfaces do not leak raw readiness HTTP codes to operators
- Connect workspace readiness and preflight state do not leak raw boolean internals to operators
- packaged smoke proves stale-bootstrap recovery on launch one and a grounded runtime state on launch two from an isolated smoke-owned app-data root

## wave3 - Session And Toolchain Reliability

Objective:
- deterministic connect/switch/restore/preflight behavior

Scope:
- stable restore target selection
- actionable CCI alias bridge remediation
- consistent session history and reconnect flows

Exit:
- real-org connect/switch/preflight pass in packaged desktop
- explicit remediation commands for auth/tool/alias failures
- top-bar attach and session workspace actions remain semantically distinct

## wave4 - Org Browser Explorer Completion

Objective:
- ship name-first metadata discovery with predictable checkbox-first selection

Scope:
- search by real metadata item names
- grouped family browsing with nested tree selection
- unified checkbox semantics for search + browse

Exit:
- operator can search/browse/retrieve without metadata-type-first workflow
- empty/unseeded states still produce actionable discovery behavior
- checkbox semantics are uniform across search results and explorer tree nodes

## wave5 - Refresh/Build Production Handoff

Objective:
- make Browser -> Retrieve -> Refresh -> Diff -> Org Retrieve a first-class workflow

Scope:
- retrieve handoff visibility and validity checks
- staged workflow summaries and guardrails
- fail-closed handling of incomplete handoff state

Exit:
- real-org end-to-end handoff pass in packaged desktop
- no raw JSON required for common rebuild workflow
- operator-facing staged summaries remain stable across relaunch

## wave6 - Ask Planner/Compiler Depth

Objective:
- strengthen typed planning and reduce weak generic fallback

Scope:
- intent/entity extraction hardening
- metadata-family routing and flow/object/field grounding
- stable compiler rule IDs and replay-safe traces
- adopt a narrow semantic-frame contract before committing to any parser framework choice
- start semantic-frame shadow mode on one bounded Ask family before any routing replacement
- promote semantic-frame admissibility to the active execution gate for that family once parity is proven
- expand that active-gate pattern incrementally across bounded families without widening latest-retrieve support beyond explicit proven cases
- normalize family-qualified evidence-lookup targets (`Flow called X`, `Flow named X`, and file/path forms) so deterministic component-usage lookup is resilient to common operator phrasing without widening into freeform component search
- accept metadata-arg evidence-lookup forms (`Flow:X`, `CustomField:Object.Field`) so Ask stays aligned with the metadata naming shapes operators already use in retrieve/build workflows
- preserve folder-qualified Email Template fullNames and `email/<folder>/<template>.email-meta.xml` file-path forms so evidence-lookup and latest-retrieve component-usage prompts stay deterministic for real org template metadata
- extend deterministic evidence-lookup and latest-retrieve component-usage prompts across additional already-parsed metadata families (`Connected App`, `Permission Set Group`, `Custom Permission`) before claiming family coverage is materially complete

Exit:
- planner/integration/replay tests pass for selected families
- measurable fallback-rate reduction on real metadata asks
- explicit named metadata asks do not degrade to weak stop-word object inference
- semantic-frame v1 is active for impact + bounded automation + bounded perms asks, and bounded review approval asks now also obey active semantic-frame admissibility at runtime

## wave7 - Decision Packet Quality

Objective:
- make packets reliable approval artifacts

Scope:
- risk-driver quality
- reads/writes/change-impact synthesis
- flow-target packets render flow-specific operator stats instead of generic approval placeholders
- impact asks emit dedicated impact packets instead of plain text or generic approval placeholders
- metadata-component usage packets render component-specific stats instead of generic approval placeholders
- concrete grounding spotlights are visible directly in the packet (top automation names, impacted sources, citation-source files), including approval-review packets
- benchmark publication surfaces explicit recommendation verdict, recommendation summary, and evidence-gap count for approval-review packets
- next-action relevance
- packet layout stays calm enough to function as the primary artifact without duplicate action rows or low-signal sections competing for attention
- proof identifiers and citation detail stay available without occupying their own always-visible cards under the packet
- decision packets can be published into GitHub PR review surfaces as comments or checks without losing provenance, proof links, or fail-closed semantics

Exit:
- benchmark packet accepted for real review scenario
- proof/trust envelope remains deterministic and replayable
- packet cites deterministic reads/writes/impact paths with minimal manual interpretation
- packet hierarchy is clear enough that the primary recommendation, evidence, and next action are visible without scanning redundant cards
- latest proxy benchmark run passes specificity and friction gates with explicit recommendation/evidence-gap publication, and canonical proxy publish/verify is now green without human stopwatch capture
- decision packets now publish into GitHub PR comment surfaces with proof-bound idempotent upsert behavior, preserving `proofId`, `replayToken`, snapshot/policy provenance, and fail-closed semantics without exposing raw JSON
- packet summary is publishable to GitHub PR surfaces without collapsing into raw JSON or losing proof identity

## wave8 - Explain/Analyze Depth

Objective:
- make diagnostics and analysis operator-first instead of debug-first

Scope:
- structured permission/automation/impact/map cards
- deterministic summaries with clear next actions
- raw JSON as secondary surface only
- redundant triage/status/action blocks are collapsed so operators see one clear recovery path before secondary telemetry or debug detail
- structured triage snapshot remains the primary Analyze action surface, while detailed cards stay evidence-first and point back to the snapshot instead of repeating checklist or button blocks
- explicit Browser/Refresh recovery actions when automation or impact analysis returns no deterministic matches
- structured Ask trust telemetry (replay/proof coverage/failure classes) visible from Settings & Diagnostics without raw API inspection
- Ask trust and runtime telemetry also surface in the top structured diagnostics snapshot with direct actions, so operators can triage replay/failure health without raw payload inspection or manual tab hunting
- permission-analysis Ask handoff stays blocked until mapping is resolved, aligning Analyze recovery paths with deterministic grant-context requirements
- structured runtime telemetry (request volume, route timings, recent non-200 signatures) visible from Settings & Diagnostics without raw `/metrics` inspection
- structured Meta Adapt delta summary visible from Settings & Diagnostics without raw before/after payload inspection
- system-permission edge states expose `Diagnose User Mapping` as the primary structured recovery action until deterministic grant context exists
- secondary diagnostics detail cards do not repeat their own quick-action rows or checklist prose once the same recovery path already exists in the primary controls and structured triage snapshot
- Runtime Health and Tooling Status do not expose their own recovery button rows once the same actions already exist in the primary controls and structured triage snapshot
- Analyze detail cards and loaded diagnostics detail cards do not repeat separate workflow-guidance prose once the structured triage snapshot already owns the recovery path

Exit:
- core analysis tasks complete through card actions
- deterministic equivalence preserved for same context
- operator can diagnose common permission/automation/map failures without raw JSON as primary UI
- primary triage state is readable without card overload or repeated action surfaces
- secondary detail cards no longer duplicate the same recovery actions already provided by the primary controls and structured snapshot
- secondary detail cards no longer add extra "use the snapshot above" reminder cards or loaded-state reminder prose when the same hierarchy is already visually obvious

## wave9 - Proofs/History Productization

Objective:
- complete label-first proof lifecycle

Scope:
- searchable history and open artifact flows
- replay/export/reopen stability
- trust-envelope continuity across restarts
- strict separation between history-label workflow and advanced token-only debug path
- explicit current-selection status so mixed history/debug states remain operator-legible
- advanced token state stays inside an explicit debug disclosure unless tokens are actually active, so the normal history-first workflow does not carry empty debug chrome

Exit:
- operator can run history-first proof workflows without token bookkeeping
- labels and replay/open/export remain stable across restarts
- advanced proof ID / replay token lookup stays debug-only and does not drive the active history selection
- advanced summary surfaces only typed debug tokens and never inherits selected history proof identifiers
- primary proof open/replay actions do not execute from typed token fields unless the operator explicitly chooses advanced token actions
- primary proof/replay export actions resolve directly from the selected history label instead of requiring an open-first detour

## wave10 - Design/Layout/Accessibility Hardening

Objective:
- remove layout defects, simplify bloated workspace surfaces, and normalize core workspace readability

Scope:
- clipping/overflow/wrapping fixes
- spacing and hierarchy normalization
- keyboard/focus behavior for critical controls
- progressive disclosure so raw JSON, debug payloads, and low-signal telemetry stay secondary
- removal of duplicate status summaries, repeated action rows, and dashboard-like card density that hides the primary workflow
- explicit render guards for path-heavy Analyze/Diagnostics/Proofs surfaces
- explicit render guards for long operator-machine paths in Settings & Diagnostics
- explicit Ask dense-card render guards for long proof IDs, paths, and citation snippets
- explicit Ask follow-up action render guards for long action labels and path-heavy rationales
- explicit Ask metadata-component packet render guards for long component labels, metadata-arg targets, and definition anchors
- explicit telemetry render guards for Ask trust failure-class labels in Settings & Diagnostics
- explicit Org Browser render guards for long retrieve parse paths, metadata args, and selected member chips
- explicit Org Sessions render guards for long alias, username, org ID, and instance URL values
- Ask launch chrome is reduced so operator readiness and next-step navigation no longer consume separate top-level cards ahead of the primary question and packet flow
- Org Sessions keeps manual bridge commands and secondary alias/session probes behind a single advanced disclosure, reducing connect-screen card overload without removing explicit fallback tooling
- Refresh & Build now relies on one staged workflow snapshot plus concrete run summaries instead of repeating the same rebuild chain in a second recap card

Exit:
- zero known clipping defects in Stage 1 surfaces
- accessibility baseline pass for Ask/Sessions/Browser/Refresh
- long paths, identifiers, and JSON blocks wrap/scroll without card breakage
- render regression gates cover path-heavy cards so long graph paths stay bounded
- Ask follow-up action cards keep long operator guidance readable without horizontal spill
- metadata-component usage packets keep long component labels and definition anchors bounded in Ask
- Org Browser carts and retrieve handoff details stay bounded under long real-org metadata names and paths
- Stage 1 workspaces present one clear primary artifact and one clear next action without dense dashboard-style overload

## wave11 - Bug Burn-Down And CI Quality Lock

Objective:
- close critical/high defects and lock fixes with tests while controlling CI cost

Scope:
- P0/P1 burn-down
- flake reduction and regression coverage
- trust-preserving CI minute optimization
- render-level regression locks for critical runtime status surfaces
- release-evidence checker tests enforced in `validate`
- human benchmark publication regression enforced in `validate`
- typed GitHub workflow-dispatch and status-ingest path for Orgumented-managed validation or benchmark jobs
- GitHub Actions remains the borrowed CI/reporting plane instead of new custom orchestration inside Orgumented

Exit:
- P0/P1 = zero and stable for one cycle
- CI remains strict on runtime-impacting changes
- CI minutes remain controlled with path-gating and selective heavy-job execution
- detect-changes remains repo-local and deterministic, without third-party action download dependencies
- targeted web regression suite runs in `validate` for runtime-impacting PRs, locking Ask/Analyze/Proofs/System accessibility and render guards into GitHub Actions
- release-evidence checker tests run in `validate`, keeping wave12 release-gate logic under CI instead of local-only verification
- phase17 human benchmark publication regression runs in `validate`, keeping canonical benchmark publication logic under CI instead of local-only verification
- edge metadata-family regression coverage includes Email Template and Custom Tab evidence-lookup prompts in addition to Flow, Layout, Apex, and CustomField families
- GitHub-backed validation/reporting is additive and does not make local semantic workflows depend on GitHub reachability

## wave12 - Release Readiness And Operator Proof

Objective:
- prove release readiness with explicit operator runbooks

Scope:
- release checklist + rollback playbook
- clean-machine quickstart validation
- final real-org end-to-end sweep
- release-notes evidence template tied to packaged desktop smoke, operator proof, and rollback target capture
- clean-machine proof worksheet tied to the canonical operator-proof results log
- canonical release artifact-path map shared across release, rollback, and clean-machine proof docs
- canonical rollback-result template for executed rollback validation
- canonical release evidence record in `docs/releases/RELEASE.md` that summarizes smoke, operator proof, clean-machine proof, and rollback readiness in one place
- deterministic `pnpm release:evidence:check` gate that fails when the canonical release record still contains blank or placeholder fields
- release evidence lint now also verifies that proof-results references in `RELEASE.md` point at real headings in `docs/planning/v2/REAL_ORG_OPERATOR_PROOF_RESULTS.md`
- release evidence lint now also verifies that referenced proof-results sections contain filled summary fields (`Operator`, `Result`, `Proof ID`, `Replay Token`), and the canonical proof-results file now uses numbered anchorable entries (`Candidate 001`, `Clean Machine 001`)
- proofs/history label-first workflow now keeps manual token entry isolated from selected history labels, reducing remaining token-driven ambiguity in the normal audit path
- proofs/history advanced token path now has an explicit clear/exit action that removes typed debug tokens and token-only loaded state, making it easier to return to the normal history-first workflow after parity/debug inspection
- proofs/history export filenames now prefer the selected history label so saved proof and replay JSON artifacts stay aligned to the primary history-first audit flow
- proofs/history rows now include direct proof/replay export actions so the label-first lifecycle is available from the history list itself without detouring through the top action row
- GitHub Release / artifact linkage for packaged desktop outputs and release evidence where useful, without replacing local proof/replay records

Exit:
- release candidate checklist fully green
- non-author operator runbook pass with evidence
- real-org quickstart and org-browser proof runbooks pass on clean machine
- canonical release evidence can link cleanly to GitHub release/artifact surfaces without becoming dependent on them

## wave13 - Stabilization Window

Objective:
- protect quality before any Stage 2 expansion

Scope:
- hotfix-only changes
- no scope expansion
- Stage 2 go/no-go decision discipline

Exit:
- no unresolved P0/P1 during stabilization window
- Stage 2 decision recorded through governance process

## Immediate Branch Queue (Regrouped)

1. `dna-wave2-startup-drift-recovery`: finish packaged runtime startup/drift parity hardening.
2. `dna-wave5-handoff-proof-guard`: close real-org retrieve -> refresh -> diff handoff proof and fail-closed guidance gaps.
3. `dna-wave6-grounding-expansion`: deepen grounded Ask coverage and reduce weak fallback paths.
   - preferred next Ask-depth substrate is the semantic-frame-v1 contract in `ORGUMENTED_V2_SEMANTIC_FRAME_V1.md`
   - impact, bounded field/object automation, bounded perms, and bounded approval-review families now obey active semantic-frame admissibility; deterministic evidence-lookup coverage is active for the supported metadata component families
4. `dna-wave7-decision-packet-quality-baseline`: raise packet quality to approval-workflow acceptance.

## Cross-Wave Non-Negotiable Gates

For runtime or semantic-impact waves:
1. `pnpm --filter api test`
2. `pnpm --filter web build`
3. `pnpm desktop:build`
4. `pnpm desktop:smoke:release`

For planner/semantic changes also require:
- replay parity assertions
- proof integrity assertions
- fail-closed assertions

## Branch And PR Protocol

- Branch: `dna-wave<N>-<short-slice-name>`
- PR title: `<type>(wave<N>): <scope outcome>`
- Merge only when:
- required checks are green
- wave acceptance gates are met
- docs and project-memory are updated
