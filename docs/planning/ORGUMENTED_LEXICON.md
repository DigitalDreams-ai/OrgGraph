# Orgumented Lexicon (Canonical Language)

Purpose: enforce precise shared language for architecture, implementation, and user-facing outputs.

## 1) Core Runtime Terms

- `Semantic Context Unit (SCU)`
  - Smallest typed semantic unit that can be composed, constrained, and traced.
- `Semantic Snapshot`
  - Immutable runtime state hash over SCUs, derivation edges, and policy envelope.
- `Composition Operator`
  - Deterministic function combining SCUs (`overlay`, `intersect`, `constrain`, `specialize`, `supersede`).
- `Derivation Edge`
  - Typed semantic justification relation (`DERIVED_FROM`, `SUPPORTS`, `CONTRADICTS`, `REQUIRES`, `INVALIDATED_BY`, `SUPERSEDES`).
- `Proof Artifact`
  - Persisted execution record for a result: plan, operator steps, rejected branches, evidence IDs, replay token.
- `Policy Envelope`
  - Deterministic thresholds and constraints applied to a query execution.
- `Replay Token`
  - Identifier that re-executes a result against the same snapshot and policy.
- `Semantic Drift`
  - Meaningful change in outputs/relations across snapshots beyond accepted bounds.

## 2) Decision Language

- `Trusted Result`
  - Result that passes grounding, constraints, and replayability checks.
- `Conditionally Trusted Result`
  - Result returned with warnings due to soft-threshold ambiguity.
- `Refused Result`
  - Result denied because hard constraints or grounding thresholds failed.
- `Rejected Branch`
  - Candidate reasoning path excluded by constraints/policy.
- `Impact Surface`
  - Total affected semantic area (permissions, automations, dependencies) for a change.

## 3) Meaning Metrics Terms

- `grounding_score`
  - Claim coverage supported by valid derivation/evidence links.
- `constraint_satisfaction`
  - Percentage of execution steps satisfying invariants and policy rules.
- `ambiguity_score`
  - Residual overlap of competing valid interpretations.
- `stability_score`
  - Replay consistency across repeated runs on identical inputs.
- `delta_novelty`
  - Semantic change magnitude from previous snapshot output.
- `risk_surface_score`
  - Weighted exposure metric across impact surface.

## 4) Query and Response Wording Standards

Response wording should use:
- "Based on snapshot `<id>`"
- "Derived through operators: `<ops>`"
- "Rejected branches: `<count>`"
- "Policy envelope: `<id|name>`"
- "Trust level: `trusted|conditional|refused`"

Avoid vague wording:
- "probably", "seems", "might be", "looks like" in trusted outputs.
- "found docs that suggest" without derivation/evidence IDs.

## 5) Banned Terms (for technical docs and APIs)

Avoid these unless explicitly qualified:
- `RAG` (use "evidence retrieval layer" if needed).
- `vector context` (use "semantic snapshot context").
- `agent intuition` (use "policy-bounded planner behavior").
- `smart guess` (use "conditional inference with confidence policy").
- `hallucination fix` (use "grounding/constraint enforcement").

## 6) Preferred Product Language

Use:
- "Deterministic semantic runtime"
- "Replayable architectural proof"
- "Composition-first context"
- "Constraint-governed reasoning"
- "Snapshot-grounded decision"

## 7) Naming Conventions

### Types
- Prefix semantic runtime types with `Semantic*`:
  - `SemanticSnapshot`, `SemanticDiff`, `SemanticTrace`.

### IDs
- Prefix domain IDs:
  - `scu_*`, `snap_*`, `proof_*`, `policy_*`, `trace_*`.

### API fields
- Prefer explicit names:
  - `snapshotId`, `policyId`, `trustLevel`, `replayToken`, `derivationIds`.

## 8) Rule of Precision

Every externally visible answer must support this sentence:
"This claim is true under snapshot `<id>`, policy `<id>`, via derivation `<ids>`, replay token `<id>`."

If that sentence cannot be completed, the answer is not trusted.
