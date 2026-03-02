# Orgumented v2 Initiative Evaluation Plan

Date: March 1, 2026
Scoring authority used: `docs/planning/v2/ORGUMENTED_V2_DECISION_MATRIX.md`

## Initiative

Assumed initiative under evaluation:
- selective build-vs-borrow modernization of the semantic stack

Working description:
- keep Salesforce semantic judgment, proof/replay contract, and decision-packet synthesis custom
- adopt borrowed substrate where it reduces bespoke infrastructure cost
- near-term targets:
  - `Ajv` for schema validation
  - `W3C PROV / PROV-O` for provenance vocabulary
- next evaluation targets:
  - `OPA / Rego` for declarative policy evaluation
  - `Langium` / `Chevrotain` / `Souffle` / `SHACL` for future planner, grammar, or constraint depth where justified

Reference source:
- `docs/planning/archive/pre-v2-2026-03-01/SEMANTIC_STACK_BUILD_VS_BORROW.md`

## Intended Stage Alignment

Primary intended stage:
- Stage 1: Trusted Change Decision Engine

Why:
- the initiative aims to strengthen determinism support, proof structure, provenance clarity, and future planner/compiler evolution
- it is not valid as a Stage 2 or governance initiative unless Stage 1 packet quality and workflow proof improve first

## Wave Mapping

Primary wave alignment:
- Wave B: Ask deterministic core
- Wave C: proof productization

Secondary support:
- Wave F / Wave G only where the borrowed substrate improves desktop runtime integrity or decision-packet usability without increasing runtime divergence

Not valid yet as a primary Wave E expansion:
- policy-aware approval support and soft-gate posture remain premature unless Stage 1 proof gets materially stronger

## Current Repo State Relevant To This Evaluation

Strengths already present:
- deterministic Ask and replay harnesses already exist:
  - `apps/api/src/modules/ask/ask.service.ts`
  - `apps/api/test/phase12-replay-runtime.ts`
- desktop runtime convergence is materially better than before:
  - `docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md`
  - `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`
- proof, drift, and policy-oriented semantics already exist:
  - `apps/api/src/modules/ingestion/semantic-drift-policy.service.ts`
  - `packages/ontology/src/semantic-runtime.ts`

Weaknesses still active:
- planner/compiler depth is still shallow and regex-heavy:
  - `apps/api/src/modules/planner/planner.service.ts`
- workflow adoption proof is not yet strong:
  - `docs/planning/v2/ORGUMENTED_V2_STRATEGY.md`
  - `docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md`
- runtime convergence is still an active execution focus:
  - `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`

## Potential Overreach Risks

### 1. Premature Stage 2 expansion
- adopting `OPA / Rego` too early could be mistaken for approval-support or governance readiness
- current governance rules explicitly block that without workflow adoption evidence

### 2. Planner overclaim without planner improvement
- the initiative talks about semantic-stack improvement, but the current planner still routes through regex-heavy logic
- if planner depth does not materially improve, the initiative cannot justify stronger strategic claims

### 3. Runtime divergence risk
- borrowed engines or sidecars could complicate Windows desktop packaging or dev/package parity
- current architecture rules prohibit runtime divergence between dev and packaged desktop

### 4. Substrate expansion without operator lift
- provenance, validation, and policy substrate can improve architecture cleanliness without improving real workflow outcomes
- that would violate the current execution focus

### 5. Governance language outrunning proof
- if this initiative is framed as policy or governance advancement before decision-packet adoption proof exists, it becomes strategic overreach

## Measurable Lift Hypothesis

Near-term measurable lift hypothesis:
- schema-backed contracts reduce invalid proof/policy/config payload acceptance
- provenance vocabulary improves proof export clarity and reviewer trust
- explicit policy evaluation can reduce hidden rule drift once introduced carefully

Potential medium-term lift hypothesis:
- a better planner/compiler substrate could improve:
  - time-to-trusted-answer
  - blast-radius clarity
  - evidence assembly effort
  - consistency across reviewers

Current limitation:
- most of the measurable lift is still indirect unless the initiative produces actual planner/compiler improvement and workflow-facing packet improvements

## Evaluation Expectation

Expected likely outcome before scoring:
- `DEFER`

Reason:
- this initiative is directionally right, but too broad to pass as a single executable program under the current v2 matrix
- the immediate value is strongest for contract and provenance hardening
- the weakest area is planner/compiler depth, which the matrix treats as a critical gate
