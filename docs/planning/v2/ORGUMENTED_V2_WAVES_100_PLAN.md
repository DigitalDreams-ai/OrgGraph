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

Remaining work is now primarily around:
- wave2 runtime convergence closure
- wave5 retrieve -> refresh proof closure
- wave7 packet quality acceptance
- wave8 diagnostics/analyze depth
- wave11/12 defect + release discipline

## 100% Domain Matrix

| Domain | 100% Definition | Current | Remaining |
|---|---|---|---|
| runtime core | packaged startup deterministic, fail-closed, no ambiguous status | mostly in place | close wave2 runtime/tooling parity gaps and startup drift edge cases |
| sessions/browser/retrieve | connect/switch/restore deterministic and browser parity delivered | materially functional | complete wave5 handoff proof and lock end-to-end rebuild workflow parity |
| ask/planner | grounded metadata asks with replay-safe proof | improved | finish deeper typed coverage and fallback elimination in wave6 |
| decision packets | approval-grade, trusted by workflow | partial | wave7 acceptance benchmark and packet quality gates |
| analyze/diagnostics | structured triage without JSON dependency | partial | wave8 card/action depth and synthesis improvements |
| proofs/history | label-first reopen/replay/export as primary flow | near complete | close remaining universal history-first path gaps |
| design/layout/a11y | no clipping + keyboard/focus baseline | improved | complete wave10 accessibility and final visual consistency pass |
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
| wave2 | runtime convergence | B001, B002 | In Progress | Distinguish runtime unreachable vs tool missing everywhere |
| wave3 | sessions and toolchain reliability | B004, B005 | Complete | Session state persists active alias/switch timestamps and restore alias remains deterministic across relaunch |
| wave4 | org browser explorer | B006, B007 | Complete | Maintain checkbox/search parity while closing wave5 handoff |
| wave5 | retrieve -> refresh handoff | B008 | In Progress | End-to-end real-org handoff proof in packaged app |
| wave6 | ask planner/compiler depth | B003, B009 | In Progress | Deepen evidence-lookup coverage beyond the first bounded metadata component usage slice |
| wave7 | decision-packet quality | B010, B017 | In Progress | Approval-quality packet benchmark evidence |
| wave8 | analyze and diagnostics depth | B015, B016, B022 | Open | Structured triage without raw JSON dependence |
| wave9 | proofs/history productization | B011 | In Progress | Label-first reopen/replay/export complete |
| wave10 | design/layout/accessibility | B012, B020, B021 | In Progress | Zero clipping plus keyboard/focus baseline |
| wave11 | bug burn-down and CI quality lock | B013, B018, B023 | In Progress | P0/P1 count to zero and stable trust gates |
| wave12 | release readiness and operator proof | B014, B019 | Open | Clean-machine runbook pass + rollback proof |
| wave13 | post-100 stabilization | B024 | Open | No P0/P1 regressions during hold window |

## Pillar To Wave Map

| Pillar | Owning Waves | Completion Signal |
|---|---|---|
| Core runtime integrity | wave2, wave3, wave12 | packaged runtime + session/toolchain parity proven |
| Core workflow completeness | wave3, wave4, wave5, wave8, wave9 | all Stage 1 workflows pass runbook paths |
| Planner/packet quality | wave6, wave7 | grounded Ask + approval-grade packet benchmark pass |
| UX/design/layout quality | wave10 | no clipping/overflow and action semantics locked |
| Defect/release discipline | wave11, wave12, wave13 | P0/P1 zero, release evidence complete, stabilization clean |

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

Exit:
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`
- manual packaged startup proof without ambiguous tool-missing false states
- desktop startup does not fail from avoidable bootstrap drift conditions

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
- next-action relevance

Exit:
- benchmark packet accepted for real review scenario
- proof/trust envelope remains deterministic and replayable
- packet cites deterministic reads/writes/impact paths with minimal manual interpretation

## wave8 - Explain/Analyze Depth

Objective:
- make diagnostics and analysis operator-first instead of debug-first

Scope:
- structured permission/automation/impact/map cards
- deterministic summaries with clear next actions
- raw JSON as secondary surface only

Exit:
- core analysis tasks complete through card actions
- deterministic equivalence preserved for same context
- operator can diagnose common permission/automation/map failures without raw JSON as primary UI

## wave9 - Proofs/History Productization

Objective:
- complete label-first proof lifecycle

Scope:
- searchable history and open artifact flows
- replay/export/reopen stability
- trust-envelope continuity across restarts

Exit:
- operator can run history-first proof workflows without token bookkeeping
- labels and replay/open/export remain stable across restarts

## wave10 - Design/Layout/Accessibility Hardening

Objective:
- remove layout defects and normalize core workspace readability

Scope:
- clipping/overflow/wrapping fixes
- spacing and hierarchy normalization
- keyboard/focus behavior for critical controls

Exit:
- zero known clipping defects in Stage 1 surfaces
- accessibility baseline pass for Ask/Sessions/Browser/Refresh
- long paths, identifiers, and JSON blocks wrap/scroll without card breakage

## wave11 - Bug Burn-Down And CI Quality Lock

Objective:
- close critical/high defects and lock fixes with tests while controlling CI cost

Scope:
- P0/P1 burn-down
- flake reduction and regression coverage
- trust-preserving CI minute optimization

Exit:
- P0/P1 = zero and stable for one cycle
- CI remains strict on runtime-impacting changes
- CI minutes remain controlled with path-gating and selective heavy-job execution

## wave12 - Release Readiness And Operator Proof

Objective:
- prove release readiness with explicit operator runbooks

Scope:
- release checklist + rollback playbook
- clean-machine quickstart validation
- final real-org end-to-end sweep

Exit:
- release candidate checklist fully green
- non-author operator runbook pass with evidence
- real-org quickstart and org-browser proof runbooks pass on clean machine

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
   - impact-family and bounded field/object automation semantic-frame gating are now active; perms-family semantic frames are now in shadow mode with latest-retrieve refusal parity, and next work should decide whether perms can move to active gating without widening scope
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
