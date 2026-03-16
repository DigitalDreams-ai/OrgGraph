# Orgumented v2 Initiative Evaluation Result

Date: March 1, 2026
Scoring authority used: `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`
Initiative evaluated:
- selective build-vs-borrow modernization of the semantic stack

## Stage and Wave Mapping

Stage strengthened:
- Stage 1: Trusted Change Decision Engine

Primary wave mapping:
- Wave B
- Wave C

Secondary wave relevance:
- Wave F / Wave G only where runtime integrity or packet usability improves without creating desktop divergence

Prematurity judgment:
- not valid as Stage 2, Stage 3, or Stage 4 expansion yet
- policy/gov language remains premature until workflow adoption proof exists

## Full Matrix

### Section 1 — Deterministic Integrity

| Criterion | Score | Justification |
| --- | ---: | --- |
| 1.1 Replay parity protection | 4 | The initiative explicitly keeps proof/replay custom and would add stronger contract validation around them rather than replacing them. Current replay protection already exists in [`phase12-replay-runtime.ts`](C:/Users/sean/Projects/GitHub/apps/api/test/phase12-replay-runtime.ts) and the architectural law in [`ORGUMENTED_V2_ARCHITECTURE.md`](C:/Users/sean/Projects/GitHub/Orgumented/docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md) requires identical output under identical inputs. |
| 1.2 Proof artifact integrity | 4 | `PROV`-style provenance vocabulary and schema enforcement would strengthen proof structure and export clarity without discarding the current proof contract in [`ask.service.ts`](C:/Users/sean/Projects/GitHub/Orgumented/apps/api/src/modules/ask/ask.service.ts). This is additive to the current proof-first model, not a replacement. |
| 1.3 Fail-closed clarity | 4 | Declarative policy evaluation could improve explicit refusal and gate clarity, and JSON-schema enforcement would improve contract rejection clarity. This aligns with the fail-closed law in [`ORGUMENTED_V2_ARCHITECTURE.md`](C:/Users/sean/Projects/GitHub/Orgumented/docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md) and the governance discipline in [`ORGUMENTED_V2_GOVERNANCE.md`](C:/Users/sean/Projects/GitHub/Orgumented/docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md). |
| 1.4 Dev vs packaged parity | 4 | The initiative can preserve parity because the immediate adoption targets are standards and libraries, not a second hosted runtime. However, this is only true if `OPA` remains evaluation-stage and does not become a desktop-divergent sidecar prematurely. |

Section 1 average:
- `(4 + 4 + 4 + 4) / 4 = 4.00`

Section 1 weighted score:
- `4.00 x 30 = 120.00`

### Section 2 — Planner / Compiler Depth

| Criterion | Score | Justification |
| --- | ---: | --- |
| 2.1 Moves beyond regex-heavy routing | 2 | The current planner is still regex-heavy in [`planner.service.ts`](C:/Users/sean/Projects/GitHub/Orgumented/apps/api/src/modules/planner/planner.service.ts). The initiative was still broad and did not yet commit to the current semantic-frame-first planner hardening path, so it did not itself deliver the planner change. |
| 2.2 Increases ontology-aware reasoning depth | 3 | The initiative is directionally aligned with ontology-aware planning, but current repo state still uses shallow intent routing. Borrowed substrate evaluation could improve this later, but the present initiative does not materially deepen reasoning yet. |
| 2.3 Improves composability of decision packets | 3 | Schema enforcement and provenance vocabulary can improve packet structure and consistency, but they do not materially change packet composition logic on their own. The existing packet model remains custom and useful, but not significantly more composable yet. |
| 2.4 Enables measurable improvement in blast-radius or risk reasoning | 2 | No immediate part of the initiative changes the current risk or blast-radius engine behavior in [`analysis.service.ts`](C:/Users/sean/Projects/GitHub/Orgumented/apps/api/src/modules/analysis/analysis.service.ts) or drift-policy reasoning in [`semantic-drift-policy.service.ts`](C:/Users/sean/Projects/GitHub/Orgumented/apps/api/src/modules/ingestion/semantic-drift-policy.service.ts). |

Section 2 average:
- `(2 + 3 + 3 + 2) / 4 = 2.50`

Section 2 weighted score:
- `2.50 x 20 = 50.00`

### Section 3 — Decision-Packet Workflow Fit

| Criterion | Score | Justification |
| --- | ---: | --- |
| 3.1 Packets usable without raw JSON inspection | 3 | Better schemas and provenance language could improve packet clarity, but they do not by themselves change the packet’s operator-facing UX or workflow fit. Current workflow-fit pressure remains documented in [`ORGUMENTED_V2_STRATEGY.md`](C:/Users/sean/Projects/GitHub/Orgumented/docs/planning/v2/ORGUMENTED_V2_STRATEGY.md). |
| 3.2 Reduces review-time evidence gathering | 3 | `PROV`-informed exports and clearer contracts could reduce reviewer confusion, but there is no direct workflow redesign or approval-flow integration in this initiative yet. The lift is plausible but indirect. |
| 3.3 Increases operator trust | 4 | Stronger validation, clearer provenance vocabulary, and more explicit policy structure should improve trust in the packet as an artifact. This aligns with the trust and proof emphasis in [`ORGUMENTED_V2_STRATEGY.md`](C:/Users/sean/Projects/GitHub/Orgumented/docs/planning/v2/ORGUMENTED_V2_STRATEGY.md). |
| 3.4 Fits real review or approval workflows | 3 | The initiative can support future workflow fit, but it does not itself provide adoption proof. Governance rules in [`ORGUMENTED_V2_GOVERNANCE.md`](C:/Users/sean/Projects/GitHub/Orgumented/docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md) still require real workflow evidence. |

Section 3 average:
- `(3 + 3 + 4 + 3) / 4 = 3.25`

Section 3 weighted score:
- `3.25 x 20 = 65.00`

### Section 4 — Runtime Convergence

| Criterion | Score | Justification |
| --- | ---: | --- |
| 4.1 Reduces browser-era seams | 2 | This initiative is not primarily about UI or browser seam reduction. It does not directly remove more standalone Next assumptions or page-shell seams. |
| 4.2 Strengthens single UI→engine boundary | 3 | Better contract and policy structure can help the engine boundary indirectly, but this initiative does not directly simplify the desktop UI-to-engine boundary further. |
| 4.3 Improves desktop startup/smoke reliability | 3 | `Ajv` and provenance vocabulary are runtime-neutral, but `OPA` or heavier borrowed engines could complicate packaging if adopted incautiously. As scoped today, the initiative is neutral-to-slightly-positive, not a clear runtime win. |
| 4.4 Reduces standalone Next-server assumptions | 2 | The initiative does not directly address the current runtime convergence pressure identified in [`ORGUMENTED_V2_EXECUTION.md`](C:/Users/sean/Projects/GitHub/Orgumented/docs/planning/v2/ORGUMENTED_V2_EXECUTION.md). |

Section 4 average:
- `(2 + 3 + 3 + 2) / 4 = 2.50`

Section 4 weighted score:
- `2.50 x 15 = 37.50`

### Section 5 — Measurable Lift

| Criterion | Score | Justification |
| --- | ---: | --- |
| 5.1 Measurable improvement potential | 3 | Contract rejection rates, provenance export clarity, and policy-rule explicitness are measurable. However, the strongest v2 lift targets are still time-to-trusted-answer, blast-radius clarity, and evidence-assembly reduction, and those are only indirectly improved by this initiative unless planner/compiler work follows. |

Section 5 average:
- `3.00`

Section 5 weighted score:
- `3.00 x 10 = 30.00`

### Section 6 — Strategic Stage Alignment

| Criterion | Score | Justification |
| --- | ---: | --- |
| 6.1 Strengthens Stage 1 directly | 4 | This initiative clearly aims at Stage 1 support: stronger contracts, provenance, and better foundations for a deeper planner. |
| 6.2 Premature Stage 2/3/4 expansion penalty | 2 | The `OPA / Rego` and governance-adjacent language create real risk of premature Stage 2 or Stage 3 interpretation before workflow adoption exists. Current v2 governance explicitly forbids that expansion. |

Section 6 average:
- `(4 + 2) / 2 = 3.00`

Section 6 weighted score:
- `3.00 x 5 = 15.00`

## Weighted Totals

| Section | Average | Weight | Weighted Score |
| --- | ---: | ---: | ---: |
| Deterministic Integrity | 4.00 | 30 | 120.00 |
| Planner / Compiler Depth | 2.50 | 20 | 50.00 |
| Decision-Packet Workflow Fit | 3.25 | 20 | 65.00 |
| Runtime Convergence | 2.50 | 15 | 37.50 |
| Measurable Lift | 3.00 | 10 | 30.00 |
| Strategic Stage Alignment | 3.00 | 5 | 15.00 |
| **Total** |  |  | **317.50 / 500.00** |

Total as percent of max possible:
- `317.50 / 500.00 = 63.50%`

## Section Averages

Lowest scoring sections:
1. Planner / Compiler Depth: `2.50`
2. Runtime Convergence: `2.50`
3. Decision-Packet Workflow Fit: `3.25`

## Gating Rule Check

### Rule 1
Deterministic Integrity avg must be `>= 4.0`
- Result: `4.00`
- Status: `PASS`

### Rule 2
If Planner Depth does not materially improve over current baseline -> deprioritize / defer
- Result: `2.50`
- Status: `FAIL`

### Rule 3
If Workflow Fit < `3.5` -> do not expand policy support
- Result: `3.25`
- Status: `FAIL`

### Rule 4
If Runtime Convergence regresses -> reject
- Result: no direct regression is inherent in the plan, but convergence benefit is weak at `2.50`
- Status: `WARNING`

### Rule 5
If weighted score < `80%` of max possible -> defer
- Result: `63.50%`
- Status: `FAIL`

## Decision

Explicit decision:
- `DEFER`

Why:
- the initiative is directionally correct but too broad as a single executable program
- it preserves deterministic integrity, which is necessary
- it does not materially improve planner depth yet, which the matrix treats as a core weakness
- it does not clear the workflow-fit gate needed before policy/gov expansion
- it is not strong enough on runtime convergence to justify immediate priority over current execution focus

## Stage Discipline Outcome

Which Stage this strengthens:
- Stage 1 only

Is it premature:
- not premature as a Stage 1 support thesis
- premature if treated as Stage 2 policy support or Stage 3 governance/gating advancement

## Kill-Switch Criteria

Stop immediately if:
- any borrowed substrate changes proof identity or replay parity
- policy evaluation becomes a second decision authority instead of a bounded gate
- desktop dev and packaged runtime diverge because of new borrowed dependencies
- planner/compiler claims are made without replacing the regex-heavy baseline materially
- workflow adoption remains unmeasurable after the first concrete slice

## Phase 3 Outcome

`EVAL_EXECUTION_PLAN.md` is intentionally not produced.

Reason:
- Phase 3 execution is allowed only if the initiative passes
- this initiative is currently `DEFER`, not `PASS`

