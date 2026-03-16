# Orgumented v2 Slice Matrix Results

Date: March 1, 2026
Scoring authority:
- `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`

Current baseline references:
- regex-heavy planner: `apps/api/src/modules/planner/planner.service.ts`
- runtime convergence pressure: `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`
- workflow-adoption gap: `docs/planning/v2/ORGUMENTED_V2_STRATEGY.md`
- deterministic integrity laws: `docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md`

Max possible weighted score:
- `500`

## Slice 1 — Core Ask Compiler v1

### Matrix

| Criterion | Score | Justification |
| --- | ---: | --- |
| 1.1 Replay parity protection | 5 | The slice directly targets planner logic while preserving the existing replay harness in `apps/api/test/phase12-replay-runtime.ts`. It can be executed with explicit repeated-identical-ask protection. |
| 1.2 Proof artifact integrity | 4 | Proof structure in `apps/api/src/modules/ask/ask.service.ts` is preserved; the slice improves how plans are formed, not how proof artifacts are stored. |
| 1.3 Fail-closed clarity | 4 | A typed compiler path can keep refusal explicit, but the slice is still planner-focused rather than a refusal-model rewrite. |
| 1.4 Dev vs packaged parity | 4 | The change is engine-side and should preserve the same direct boundary in dev and packaged runtime. |
| 2.1 Moves beyond regex-heavy routing | 5 | This is the slice's core point. Current baseline is obviously regex-heavy in `planner.service.ts`. |
| 2.2 Increases ontology-aware reasoning depth | 4 | A typed compiler path improves reasoning discipline, though it does not by itself make the planner fully ontology-native. |
| 2.3 Improves composability of decision packets | 4 | Better plans improve packet consistency, but packet UX remains mostly unchanged. |
| 2.4 Enables measurable improvement in blast-radius or risk reasoning | 4 | Better mixed-query compilation should improve routing into impact, permission, and automation engines. |
| 3.1 Packets usable without raw JSON inspection | 3 | The slice helps the engine, but does not materially change the Ask workspace or review packet presentation. |
| 3.2 Reduces review-time evidence gathering | 3 | Better routing helps indirectly, but the workflow artifact remains mostly the same. |
| 3.3 Increases operator trust | 4 | More reliable routing should improve trust in Ask responses. |
| 3.4 Fits real review or approval workflows | 3 | Still indirect; this slice does not define a review workflow artifact. |
| 4.1 Reduces browser-era seams | 3 | Engine-side only; it does not directly remove more browser-era runtime seams. |
| 4.2 Strengthens single UI→engine boundary | 3 | Neutral-to-positive, but boundary shape stays mostly the same. |
| 4.3 Improves desktop startup/smoke reliability | 3 | No significant runtime convergence improvement. |
| 4.4 Reduces standalone Next-server assumptions | 3 | Neutral; not the focus of the slice. |
| 5.1 Measurable lift potential | 4 | Intent-routing accuracy and mixed-query routing quality are benchmarkable. |
| 6.1 Strengthens Stage 1 directly | 5 | This is direct Stage 1 work. |
| 6.2 Premature Stage 2/3/4 expansion penalty | 5 | No governance or policy expansion is required. |

### Section averages

- Deterministic Integrity: `(5 + 4 + 4 + 4) / 4 = 4.25`
- Planner / Compiler Depth: `(5 + 4 + 4 + 4) / 4 = 4.25`
- Decision-Packet Workflow Fit: `(3 + 3 + 4 + 3) / 4 = 3.25`
- Runtime Convergence: `(3 + 3 + 3 + 3) / 4 = 3.00`
- Measurable Lift: `4.00`
- Strategic Stage Alignment: `(5 + 5) / 2 = 5.00`

### Weighted total

- `4.25 x 30 = 127.50`
- `4.25 x 20 = 85.00`
- `3.25 x 20 = 65.00`
- `3.00 x 15 = 45.00`
- `4.00 x 10 = 40.00`
- `5.00 x 5 = 25.00`
- **Total = 387.50 / 500.00 = 77.50%**

### Gating rule results

- Deterministic Integrity avg >= 4.0: `PASS`
- Planner Depth improves materially: `PASS`
- Workflow Fit >= 3.5: `FAIL`
- Runtime divergence increases: `PASS`
- Weighted total >= 80%: `FAIL`

### Decision
- `DEFER`

Reason:
- strong planner slice
- not enough workflow-fit improvement to clear the overall selection bar

## Slice 2 — High-Risk Change Review Packet Vertical Slice

### Matrix

| Criterion | Score | Justification |
| --- | ---: | --- |
| 1.1 Replay parity protection | 5 | The slice still runs through the deterministic Ask/proof path and can add repeated-identical review-prompt assertions directly in `apps/api/test/phase12-replay-runtime.ts` and `apps/api/test/integration.ts`. |
| 1.2 Proof artifact integrity | 5 | It strengthens proof usefulness by tying packet sections directly to proof and replay context rather than weakening them. Current proof model in `apps/api/src/modules/ask/ask.types.ts` already supports this. |
| 1.3 Fail-closed clarity | 4 | A review packet can preserve explicit refusal and risk-envelope behavior, but the slice must avoid smuggling soft governance in as decision authority. |
| 1.4 Dev vs packaged parity | 4 | This slice is primarily engine and packet/UI contract work, not a second runtime path. It can stay within the existing direct-engine desktop boundary. |
| 2.1 Moves beyond regex-heavy routing | 4 | The slice requires a dedicated typed path for one high-risk review prompt family instead of raw regex-only interpretation. |
| 2.2 Increases ontology-aware reasoning depth | 4 | It compels the planner to assemble permission, automation, and impact reasoning for one concrete review workflow. |
| 2.3 Improves composability of decision packets | 5 | This slice directly improves packet composition by making the decision packet the workflow artifact rather than a side effect. |
| 2.4 Enables measurable improvement in blast-radius or risk reasoning | 4 | It is centered on one high-risk change workflow, where blast radius and risk drivers must be summarized coherently. |
| 3.1 Packets usable without raw JSON inspection | 5 | This is the slice's main point: make one review packet usable as-is in the desktop workflow. |
| 3.2 Reduces review-time evidence gathering | 4 | It consolidates risk drivers, proof context, and follow-up actions into one packet for one benchmark review scenario. |
| 3.3 Increases operator trust | 5 | Trust improves when the packet becomes a coherent artifact backed by proof rather than raw IDs and JSON fragments. |
| 3.4 Fits real review or approval workflows | 4 | It targets a real review workflow without claiming approval automation or governance expansion. |
| 4.1 Reduces browser-era seams | 4 | It strengthens the desktop-native Ask/proof workflow and avoids a return to console-style raw-response dependence. |
| 4.2 Strengthens single UI→engine boundary | 4 | The packet becomes a clearer engine-produced artifact rendered by the UI rather than ad hoc UI logic. |
| 4.3 Improves desktop startup/smoke reliability | 4 | The slice should extend acceptance checks through the existing packaged smoke and workflow tests without introducing another runtime path. |
| 4.4 Reduces standalone Next-server assumptions | 4 | It keeps the focus on direct-engine desktop workflow fit rather than browser-specific proxy behavior. |
| 5.1 Measurable lift potential | 4 | It has a direct benchmark hypothesis around time-to-trusted-answer and evidence-gathering reduction for one review scenario. |
| 6.1 Strengthens Stage 1 directly | 5 | This is a Stage 1 trusted-decision vertical slice. |
| 6.2 Premature Stage 2/3/4 expansion penalty | 5 | It remains advisory and packet-focused if kept to one review workflow and avoids governance claims. |

### Section averages

- Deterministic Integrity: `(5 + 5 + 4 + 4) / 4 = 4.50`
- Planner / Compiler Depth: `(4 + 4 + 5 + 4) / 4 = 4.25`
- Decision-Packet Workflow Fit: `(5 + 4 + 5 + 4) / 4 = 4.50`
- Runtime Convergence: `(4 + 4 + 4 + 4) / 4 = 4.00`
- Measurable Lift: `4.00`
- Strategic Stage Alignment: `(5 + 5) / 2 = 5.00`

### Weighted total

- `4.50 x 30 = 135.00`
- `4.25 x 20 = 85.00`
- `4.50 x 20 = 90.00`
- `4.00 x 15 = 60.00`
- `4.00 x 10 = 40.00`
- `5.00 x 5 = 25.00`
- **Total = 435.00 / 500.00 = 87.00%**

### Gating rule results

- Deterministic Integrity avg >= 4.0: `PASS`
- Planner Depth improves materially: `PASS`
- Workflow Fit >= 3.5: `PASS`
- Runtime divergence increases: `PASS`
- Weighted total >= 80%: `PASS`

### Decision
- `PASS`

Reason:
- this is the only slice that materially improves planner depth and workflow fit at the same time
- it remains within Stage 1 and does not require governance expansion

## Slice 3 — Desktop Dev/Packaged Runtime Single-Boundary Convergence

### Matrix

| Criterion | Score | Justification |
| --- | ---: | --- |
| 1.1 Replay parity protection | 4 | Better runtime convergence helps reliability, but does not inherently deepen replay semantics. |
| 1.2 Proof artifact integrity | 4 | Proof structure is preserved, though not significantly improved. |
| 1.3 Fail-closed clarity | 4 | Shell/runtime clarity helps failure diagnosis, but refusal semantics do not materially improve. |
| 1.4 Dev vs packaged parity | 5 | This is the slice's main point and directly targets the current convergence pressure in `apps/desktop/scripts/dev-runtime.mjs`. |
| 2.1 Moves beyond regex-heavy routing | 2 | It does not materially improve planner depth. |
| 2.2 Increases ontology-aware reasoning depth | 2 | Not a reasoning slice. |
| 2.3 Improves composability of decision packets | 2 | Packet structure is largely unaffected. |
| 2.4 Enables measurable improvement in blast-radius or risk reasoning | 2 | Risk reasoning quality is unchanged. |
| 3.1 Packets usable without raw JSON inspection | 3 | Indirectly helpful because a more reliable desktop path improves product confidence, but packet usability does not materially improve. |
| 3.2 Reduces review-time evidence gathering | 3 | Indirect at best. |
| 3.3 Increases operator trust | 3 | Reliability helps trust, but this is not packet-specific trust. |
| 3.4 Fits real review or approval workflows | 3 | Neutral-to-positive, not a direct workflow slice. |
| 4.1 Reduces browser-era seams | 5 | Direct focus area. |
| 4.2 Strengthens single UI→engine boundary | 5 | Direct focus area. |
| 4.3 Improves desktop startup/smoke reliability | 5 | Direct focus area. |
| 4.4 Reduces standalone Next-server assumptions | 5 | Direct focus area. |
| 5.1 Measurable lift potential | 3 | Startup reliability and parity defect reduction are measurable, but the workflow lift is indirect. |
| 6.1 Strengthens Stage 1 directly | 4 | Necessary support work for Stage 1 integrity. |
| 6.2 Premature Stage 2/3/4 expansion penalty | 5 | No governance expansion. |

### Section averages

- Deterministic Integrity: `(4 + 4 + 4 + 5) / 4 = 4.25`
- Planner / Compiler Depth: `(2 + 2 + 2 + 2) / 4 = 2.00`
- Decision-Packet Workflow Fit: `(3 + 3 + 3 + 3) / 4 = 3.00`
- Runtime Convergence: `(5 + 5 + 5 + 5) / 4 = 5.00`
- Measurable Lift: `3.00`
- Strategic Stage Alignment: `(4 + 5) / 2 = 4.50`

### Weighted total

- `4.25 x 30 = 127.50`
- `2.00 x 20 = 40.00`
- `3.00 x 20 = 60.00`
- `5.00 x 15 = 75.00`
- `3.00 x 10 = 30.00`
- `4.50 x 5 = 22.50`
- **Total = 355.00 / 500.00 = 71.00%**

### Gating rule results

- Deterministic Integrity avg >= 4.0: `PASS`
- Planner Depth improves materially: `FAIL`
- Workflow Fit >= 3.5: `FAIL`
- Runtime divergence increases: `PASS`
- Weighted total >= 80%: `FAIL`

### Decision
- `DEFER`

Reason:
- important support slice
- not strong enough on planner depth or workflow fit to win now

## Slice 4 — Stage 1 Benchmark Lift Harness

### Matrix

| Criterion | Score | Justification |
| --- | ---: | --- |
| 1.1 Replay parity protection | 4 | It would extend replay checks into benchmark flows, which is good, but it does not deepen replay semantics itself. |
| 1.2 Proof artifact integrity | 4 | It can make proof verification more visible, but does not change packet integrity directly. |
| 1.3 Fail-closed clarity | 4 | Benchmark scenarios can verify refusal behavior, though they do not redesign it. |
| 1.4 Dev vs packaged parity | 4 | A shared benchmark harness can help parity measurement, but it is not a direct runtime fix. |
| 2.1 Moves beyond regex-heavy routing | 2 | It measures the planner more than it improves the planner. |
| 2.2 Increases ontology-aware reasoning depth | 2 | No direct reasoning-depth gain. |
| 2.3 Improves composability of decision packets | 2 | No direct packet-design gain. |
| 2.4 Enables measurable improvement in blast-radius or risk reasoning | 3 | It can measure those things, but not improve them directly. |
| 3.1 Packets usable without raw JSON inspection | 3 | Indirect; the slice can measure usability but not materially improve it. |
| 3.2 Reduces review-time evidence gathering | 4 | It makes this measurable, but not automatically better. |
| 3.3 Increases operator trust | 3 | Evidence helps, but users still need a better packet/workflow. |
| 3.4 Fits real review or approval workflows | 3 | It can instrument workflows, but does not itself redesign them. |
| 4.1 Reduces browser-era seams | 3 | Neutral. |
| 4.2 Strengthens single UI→engine boundary | 3 | Neutral. |
| 4.3 Improves desktop startup/smoke reliability | 4 | Stronger harnesses help catch runtime regressions. |
| 4.4 Reduces standalone Next-server assumptions | 3 | Indirect only. |
| 5.1 Measurable lift potential | 5 | This is the slice’s core strength. |
| 6.1 Strengthens Stage 1 directly | 5 | Stage 1 proof needs measurable lift. |
| 6.2 Premature Stage 2/3/4 expansion penalty | 5 | No governance expansion required. |

### Section averages

- Deterministic Integrity: `(4 + 4 + 4 + 4) / 4 = 4.00`
- Planner / Compiler Depth: `(2 + 2 + 2 + 3) / 4 = 2.25`
- Decision-Packet Workflow Fit: `(3 + 4 + 3 + 3) / 4 = 3.25`
- Runtime Convergence: `(3 + 3 + 4 + 3) / 4 = 3.25`
- Measurable Lift: `5.00`
- Strategic Stage Alignment: `(5 + 5) / 2 = 5.00`

### Weighted total

- `4.00 x 30 = 120.00`
- `2.25 x 20 = 45.00`
- `3.25 x 20 = 65.00`
- `3.25 x 15 = 48.75`
- `5.00 x 10 = 50.00`
- `5.00 x 5 = 25.00`
- **Total = 353.75 / 500.00 = 70.75%**

### Gating rule results

- Deterministic Integrity avg >= 4.0: `PASS`
- Planner Depth improves materially: `FAIL`
- Workflow Fit >= 3.5: `FAIL`
- Runtime divergence increases: `PASS`
- Weighted total >= 80%: `FAIL`

### Decision
- `DEFER`

Reason:
- necessary supporting harness work
- not enough direct planner or workflow improvement to win
