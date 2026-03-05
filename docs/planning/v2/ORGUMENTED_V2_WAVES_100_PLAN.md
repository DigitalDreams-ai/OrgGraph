# Orgumented v2 100% Completion Waves

Date: March 4, 2026  
Status: active execution master plan

This is the single completion plan for all Stage 1 product areas: core runtime, workflows, planner/compiler, decision packets, proofs/history, UI quality, defects, release, and stabilization.

## Definition Of 100%

Orgumented is 100% complete for v2 scope only when all of the following are true at once:

1. Core runtime:
- packaged desktop is primary and converged with local verification behavior
- no runtime dependence on Docker or browser-era route assumptions
- readiness fails closed when runtime is not grounded

2. Deterministic trust contract:
- same snapshot + query + policy returns deterministic answer/proof/replay behavior
- proof artifacts are persisted, replay-verifiable, and operator-accessible
- no hidden fallback from constrained paths to unconstrained logic

3. Stage 1 workflow completeness:
- Org Sessions
- Org Browser
- Refresh and Build
- Ask
- Explain and Analyze
- Proofs and History
- Settings and Diagnostics

4. UX and design quality:
- no clipping/overflow/truncation on supported desktop viewport targets
- predictable labels and interaction semantics
- keyboard/focus/accessibility baseline is met

5. Quality and release:
- P0/P1 defect backlog is zero
- CI gates are green and cost-controlled
- Windows packaging and smoke checks are stable
- runbooks are explicit and validated on a real-org workflow

## Wave Operating Rules

- One coherent branch per wave: `dna-wave<N>-<slice-name>`.
- One coherent PR per wave.
- No mixed-scope PRs.
- Every wave has explicit acceptance gates and proof artifacts.
- If replay parity regresses, stop and fix before continuing.
- After every merge: update docs and project-memory before next branch.

## Wave Progress Snapshot

| Wave | Theme | Primary Backlog IDs | Status |
|---|---|---|---|
| wave1 | baseline lock and triage | B001-B024 mapped | Complete |
| wave2 | runtime convergence | B001, B002 | In Progress |
| wave3 | sessions and toolchain reliability | B004, B005 | In Progress |
| wave4 | org browser explorer | B006, B007 | In Progress |
| wave5 | retrieve -> refresh handoff | B008 | Open |
| wave6 | ask planner/compiler depth | B003, B009 | Open |
| wave7 | decision-packet quality | B010, B017 | Open |
| wave8 | analyze and diagnostics depth | B015, B016, B022 | Open |
| wave9 | proofs/history productization | B011 | Open |
| wave10 | design/layout/accessibility | B012, B020, B021 | In Progress |
| wave11 | bug burn-down and CI quality lock | B013, B018, B023 | Open |
| wave12 | release readiness and operator proof | B014, B019 | Open |
| wave13 | post-100 stabilization | B024 | Open |

## wave1 - Baseline Lock And Backlog Triage

Objective:
- freeze baseline and create one deduplicated completion backlog

Deliverables:
- `WAVE1_BACKLOG.md`
- `WAVE1_DEFECT_MATRIX.md`
- `WAVE1_FEATURE_GAP_MATRIX.md`

Done when:
- every open item has wave assignment and pass/fail gate
- no planning drift across v2 control files

## wave2 - Runtime Convergence Finalization

Objective:
- remove remaining packaged-vs-local runtime divergence

In scope:
- bootstrap grounding and drift-budget handling
- readiness signaling and fail-closed runtime state
- explicit disambiguation of runtime failure vs tool failure

Acceptance gates:
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`

Proof artifacts:
- packaged smoke log with ready pass
- manual packaged launch pass note

## wave3 - Org Session Reliability And Toolchain Detection

Objective:
- make connect/switch/restore/preflight deterministic and actionable

In scope:
- `sf`/`cci` detection messaging
- deterministic restore target across restart cycles
- CCI alias remediation with exact operator commands

Acceptance gates:
- real-org connect/switch/preflight succeeds in packaged desktop
- runtime-unavailable, auth-missing, and tooling-missing states are distinct

Proof artifacts:
- real-org connect runbook pass
- session-history/restore validation evidence

## wave4 - Org Browser Explorer Completion

Objective:
- ship a name-first explorer workflow that matches operator expectations

In scope:
- search by actual metadata item name
- browse by metadata family with checkbox-first selection
- deterministic nested member load and retrieve staging

Acceptance gates:
- operator can find/retrieve metadata without type-first API knowledge
- unseeded catalog states still provide predictable search behavior

Proof artifacts:
- browser explorer scenario log
- retrieve-ready handoff record

## wave5 - Refresh And Build Production Workflow

Objective:
- make retrieve -> refresh -> diff -> org-retrieve first-class and fail-closed

In scope:
- handoff visibility from Browser
- staged workflow summaries and guardrails
- actionable failure states for incomplete handoffs

Acceptance gates:
- no raw JSON required for common rebuild workflow
- end-to-end handoff works for real-org retrieval scenario

Proof artifacts:
- end-to-end handoff replay proof
- rebuild/diff summary screenshots and logs

## wave6 - Ask Planner And Compiler Depth

Objective:
- materially improve typed planning and reduce fragile regex dominance

In scope:
- intent/entity extraction hardening
- metadata-family routing coverage for real asks
- stable rule IDs and deterministic compile traces

Acceptance gates:
- planner + integration + replay tests for selected families pass
- measurable reduction in weak generic fallback responses

Proof artifacts:
- query-family benchmark before/after results
- replay parity outputs for repeated asks

## wave7 - Decision Packet Quality

Objective:
- make packets reliable primary artifacts for architecture decisions

In scope:
- risk-driver quality
- reads/writes/change-impact synthesis
- actionable next-step relevance

Acceptance gates:
- selected real-org review scenarios produce usable packets
- packets retain provenance and deterministic trust envelope

Proof artifacts:
- benchmark packet acceptance notes
- proof IDs and replay tokens for accepted scenarios

## wave8 - Explain And Analyze Workflow Depth

Objective:
- elevate analyze from debug surface to operator decision surface

In scope:
- structured permission, automation, impact, and map diagnosis cards
- deterministic summaries
- raw JSON as secondary only

Acceptance gates:
- key analysis tasks complete through primary cards/actions
- same input context preserves deterministic answer equivalence

Proof artifacts:
- analyze runbook scenario results
- before/after structured output comparison

## wave9 - Proofs And History Productization

Objective:
- complete label-first proof lifecycle for audit and collaboration

In scope:
- labeled history navigation
- reopen/replay/export stability
- trust-envelope continuity across restart

Acceptance gates:
- operator can reopen/replay from history without token bookkeeping
- packaged desktop parity maintained for proof/history paths

Proof artifacts:
- history-first replay pass logs
- export/reopen verification notes

## wave10 - Design, Layout, And Accessibility Hardening

Objective:
- finish design/layout polish and remove readability defects across workspaces

In scope:
- overflow/clipping/wrapping fixes
- spacing and hierarchy normalization
- keyboard and focus behavior for critical controls

Acceptance gates:
- zero known clipping/overflow issues in Stage 1 surfaces
- accessibility checks pass for Ask/Sessions/Browser/Refresh

Proof artifacts:
- viewport visual QA checklist
- accessibility test output notes

## wave11 - Bug Burn-Down And Quality Lock

Objective:
- close critical/high defects and lock regressions with tests

In scope:
- P0/P1 burn-down
- flaky test elimination
- regression tests for fixed high-impact defects

Acceptance gates:
- P0/P1 count reaches zero and holds for one full cycle
- CI quality gates stable with low flake rate

Proof artifacts:
- defect matrix closure report
- regression suite additions mapped to defects

## wave12 - Release Readiness And Operator Proof

Objective:
- prove production readiness with operator-validated runbooks

In scope:
- release checklist and rollback
- clean-machine quickstart validation
- final real-org end-to-end validation sweep

Acceptance gates:
- release candidate checks all green
- runbooks are explicit, unambiguous, and validated by non-author operator

Proof artifacts:
- release checklist artifact set
- operator validation form/results

## wave13 - Post-100 Stabilization Window

Objective:
- protect quality after completion and before any Stage 2 expansion

In scope:
- hotfix-only changes
- no scope expansion
- Stage 2 entry decision review

Acceptance gates:
- no unresolved P0/P1 regressions during stabilization window
- Stage 2 decision documented through v2 governance process

Proof artifacts:
- stabilization runlog
- Stage 2 go/no-go decision record

## Cross-Wave Non-Negotiable Gates

For any runtime or semantic-impact wave:
1. `pnpm --filter api test`
2. `pnpm --filter web build`
3. `pnpm desktop:build`
4. `pnpm desktop:smoke:release`

For planner/semantic changes also require:
- replay parity assertions
- proof integrity assertions
- fail-closed assertions

## Branch/PR Rules

- Branch: `dna-wave<N>-<short-slice-name>`
- PR title: `<type>(wave<N>): <scope outcome>`
- Merge only when:
- required checks are green
- wave acceptance gates are met
- docs and project-memory are updated
