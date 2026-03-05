# Orgumented v2 100% Completion Plan

Date: March 5, 2026  
Status: active execution master plan

This is the single execution plan for full Stage 1 completion of Orgumented desktop:
- core runtime and deterministic trust contract
- all Stage 1 workflows
- planner/compiler depth
- decision-packet quality
- proof/history usability
- design/layout/accessibility
- bug burn-down and release readiness

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
| wave3 | sessions and toolchain reliability | B004, B005 | In Progress | Clear CCI bridge status and deterministic restore behavior |
| wave4 | org browser explorer | B006, B007 | In Progress | Final checkbox/tree semantics and empty-state clarity |
| wave5 | retrieve -> refresh handoff | B008 | In Progress | End-to-end real-org handoff proof in packaged app |
| wave6 | ask planner/compiler depth | B003, B009 | In Progress | Replay-safe metadata grounding beyond generic fallback |
| wave7 | decision-packet quality | B010, B017 | Open | Approval-quality packet benchmark evidence |
| wave8 | analyze and diagnostics depth | B015, B016, B022 | Open | Structured triage without raw JSON dependence |
| wave9 | proofs/history productization | B011 | In Progress | Label-first reopen/replay/export complete |
| wave10 | design/layout/accessibility | B012, B020, B021 | In Progress | Zero clipping plus keyboard/focus baseline |
| wave11 | bug burn-down and CI quality lock | B013, B018, B023 | In Progress | P0/P1 count to zero and stable trust gates |
| wave12 | release readiness and operator proof | B014, B019 | Open | Clean-machine runbook pass + rollback proof |
| wave13 | post-100 stabilization | B024 | Open | No P0/P1 regressions during hold window |

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

## wave6 - Ask Planner/Compiler Depth

Objective:
- strengthen typed planning and reduce weak generic fallback

Scope:
- intent/entity extraction hardening
- metadata-family routing and flow/object/field grounding
- stable compiler rule IDs and replay-safe traces

Exit:
- planner/integration/replay tests pass for selected families
- measurable fallback-rate reduction on real metadata asks

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

## wave9 - Proofs/History Productization

Objective:
- complete label-first proof lifecycle

Scope:
- searchable history and open artifact flows
- replay/export/reopen stability
- trust-envelope continuity across restarts

Exit:
- operator can run history-first proof workflows without token bookkeeping

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
