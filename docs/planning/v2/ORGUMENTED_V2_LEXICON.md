# Orgumented v2 Lexicon

Date: March 1, 2026

Purpose:
- preserve canonical language for v2 planning, implementation, and product messaging
- prevent drift back into vague AI-assistant or browser-console language

## Core Runtime Terms

- `Semantic Context Unit (SCU)`
  - smallest typed semantic unit that can be composed, constrained, and traced
- `Semantic Snapshot`
  - immutable runtime state hash over semantic units, derivation edges, and policy envelope
- `Composition Operator`
  - deterministic function combining semantic units
- `Derivation Edge`
  - typed semantic justification relation
- `Proof Artifact`
  - persisted execution record for a result
- `Policy Envelope`
  - deterministic thresholds and constraints applied to a query execution
- `Replay Token`
  - identifier that re-executes a result against the same snapshot and policy
- `Semantic Drift`
  - meaningful change in outputs or relations across snapshots beyond accepted bounds

## Decision Terms

- `Trusted Result`
  - passes grounding, constraints, and replayability checks
- `Conditionally Trusted Result`
  - returned with warnings due to ambiguity or soft-threshold concerns
- `Refused Result`
  - denied because hard constraints or grounding thresholds failed
- `Rejected Branch`
  - candidate reasoning path excluded by constraints or policy
- `Impact Surface`
  - total affected semantic area for a change
- `Decision Packet`
  - the operator-facing artifact containing summary, reasoning, proof/trust envelope, evidence context, and next actions

## Meaning Metrics Terms

- `grounding_score`
- `constraint_satisfaction`
- `ambiguity_score`
- `stability_score`
- `delta_novelty`
- `risk_surface_score`

## Response Wording Standards

Trusted outputs should support wording like:
- `Based on snapshot <id>`
- `Policy envelope: <id>`
- `Trust level: trusted|conditional|refused`
- `Derived through operators: <ops>`
- `Replay token: <id>`

Avoid vague trusted-output wording:
- `probably`
- `seems`
- `might be`
- `looks like`
- `found docs that suggest`

## Banned or Discouraged Terms

Avoid these unless explicitly qualified:
- `RAG`
- `vector context`
- `agent intuition`
- `smart guess`
- `hallucination fix`

Prefer:
- `semantic snapshot context`
- `policy-bounded planner behavior`
- `grounding and constraint enforcement`
- `replayable architectural proof`

## Product Language

Prefer:
- `deterministic semantic runtime`
- `replayable architectural proof`
- `snapshot-grounded decision`
- `constraint-governed reasoning`
- `trusted change decision engine`

Avoid:
- `AI for Salesforce`
- `chatbot`
- `governance platform` unless the proof threshold has actually been met

## Naming Conventions

Types:
- prefer explicit semantic names such as `SemanticSnapshot`, `SemanticDiff`, `SemanticTrace`

IDs:
- use explicit prefixes such as `scu_*`, `snap_*`, `proof_*`, `policy_*`, `trace_*`

API fields:
- prefer `snapshotId`, `policyId`, `trustLevel`, `replayToken`, `derivationIds`

## Rule of Precision

Every trusted answer should support this sentence:

`This claim is true under snapshot <id>, policy <id>, via derivation <ids>, replay token <id>.`

If that sentence cannot be completed, the answer is not trusted.
