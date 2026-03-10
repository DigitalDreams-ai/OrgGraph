# Orgumented v2 Semantic Frame v1

Date: March 9, 2026
Status: proposed Stage 1 Ask-depth contract

## Purpose

This file defines the preferred next-step interpretation model for Ask.

It is not a DSL.
It is not a grammar-first product rewrite.
It is a narrow semantic interpretation contract that sits between free-text operator questions and deterministic engine execution.

Primary goal:
- replace regex-heavy planner sprawl with a typed, replay-safe intermediate representation

Primary constraint:
- stay inside Stage 1: trusted change-decision support

## Why This Exists

The current planner is still too shallow and too regex-heavy for the depth Orgumented needs.

Current weak points:
- intent routing depends on string heuristics
- entity grounding is narrow
- ambiguity handling is inconsistent
- unsupported questions risk looking weaker than they should

This v1 frame is intended to improve:
- planner determinism
- entity resolution discipline
- fail-closed unsupported handling
- replay-safe Ask expansion

## Scope Rule

This v1 contract is intentionally narrow.

It supports only current Stage 1 Ask families:
- `impact_analysis`
- `permission_path_explanation`
- `automation_path_explanation`
- `approval_decision`
- `evidence_lookup`

It does not yet claim:
- general root-cause diagnosis for arbitrary failures
- broad freeform “explain my org” reasoning
- Stage 2 policy automation
- Stage 3/4 governance or enforcement behavior

## Processing Model

```text
free-text question
  -> semantic frame draft
  -> frame validation
  -> entity grounding
  -> ambiguity gate
  -> deterministic execution plan
  -> semantic engine execution
  -> decision packet + proof + replay
```

Interpretation may use heuristics or bounded extraction.
Execution may not.

## Core Frame Shape

```json
{
  "intent": "impact_analysis",
  "target": {
    "kind": "field",
    "raw": "Opportunity Stage",
    "candidates": [
      {
        "id": "Opportunity.StageName",
        "kind": "field",
        "source": "metadata"
      }
    ],
    "selected": "Opportunity.StageName"
  },
  "sourceMode": "graph_global",
  "scope": {
    "snapshot": "current",
    "orgSession": "active"
  },
  "modifiers": {
    "includeAutomation": true,
    "includePermissions": false,
    "includeEvidence": true
  },
  "admissibility": {
    "status": "accepted",
    "reason": null
  },
  "ambiguity": {
    "status": "clear",
    "issues": []
  }
}
```

## Frame Sections

### 1. Intent

Allowed v1 intents:
- `impact_analysis`
- `permission_path_explanation`
- `automation_path_explanation`
- `approval_decision`
- `evidence_lookup`

Mapping guidance:
- `what touches X` -> `impact_analysis`
- `who can edit X` -> `permission_path_explanation`
- `what automations update X` -> `automation_path_explanation`
- `what runs on object X` -> `automation_path_explanation`
- `should we approve changing X` -> `approval_decision`
- `show me the proof for this decision` -> `evidence_lookup`

### 2. Target

Allowed v1 target kinds:
- `object`
- `field`
- `flow`
- `decision_packet`

Each target must preserve:
- `raw`
- `candidates`
- `selected`

Never silently select from multiple plausible candidates.

### 3. Source Mode

`sourceMode` is required because Ask already has materially different evidence boundaries.

Allowed v1 values:
- `graph_global`
- `latest_retrieve`
- `proof_history`

This field is mandatory in proof/replay artifacts because it changes what evidence is legal to use.

### 4. Scope

Required v1 scope fields:
- `snapshot`
- `orgSession`

Allowed v1 scope values:
- `snapshot: current`
- explicit snapshot id
- `orgSession: active`

Defer richer compare/time-window scope until snapshot compare is a real supported family.

### 5. Modifiers

Allowed v1 modifiers:
- `includeAutomation`
- `includePermissions`
- `includeEvidence`
- `includeProof`

Do not add “depth”, “timeWindow”, or broad explanatory knobs in v1 unless a shipped Ask family needs them.

### 6. Admissibility

This is the actual execution gate.

Allowed values:
- `accepted`
- `needs_clarification`
- `blocked`

This is more important than confidence.

Rules:
- `accepted` means the frame can be turned into a deterministic plan now
- `needs_clarification` means a narrow grounded clarification is required
- `blocked` means fail closed

### 7. Ambiguity

Allowed ambiguity values:
- `clear`
- `ambiguous_target`
- `ambiguous_scope`
- `unsupported_question`
- `insufficient_evidence`

This section records why the frame is not yet safe, but does not itself authorize execution.

## Clarification Contract

Clarification must be narrow, enumerable, and grounded in metadata candidates.

Good:
- `Did you mean Account.OwnerId or Opportunity.OwnerId?`

Bad:
- `Can you explain more?`

Rule:
- always prefer constrained clarification over broad conversational follow-up

## Unsupported Handling

Unsupported asks must fail closed with an explicit reason.

Recommended `blocked` reasons:
- `unsupported_intent`
- `unsupported_target_kind`
- `no_grounded_target`
- `latest_retrieve_scope_unsupported`
- `insufficient_evidence`

This reason must be stored in proof/replay artifacts for refusal paths.

## Deterministic Planning Contract

Once a frame is `accepted`, the following must produce identical externally visible output:
- same frame
- same selected target
- same sourceMode
- same snapshot
- same policy
- same engine version

That means:
- same plan identity
- same proof identity behavior
- same replay result

## Recommended v1 Build Order

### Slice 1
- define the TypeScript semantic-frame contract
- validate with strict schema checks

### Slice 2
- map current Ask families into frame intents
- preserve current planner output while running frame generation in shadow mode

### Slice 3
- add entity grounding and constrained clarification support for object/field/flow targets

### Slice 4
- switch one question family at a time from regex-first routing to frame-first routing

### Slice 5
- persist frame + grounding + admissibility into proof artifacts

## Acceptance Gates

This contract should not be adopted broadly unless it proves:

1. No replay regression
- repeated identical asks keep replay parity

2. No trust regression
- fail-closed behavior remains explicit

3. Better planner discipline
- selected Ask families show lower weak-fallback or misrouting behavior

4. No UI policy drift
- the frame remains engine-owned and is not interpreted in the UI layer

## Tooling Position

This file does not require `Langium` or `Chevrotain`.

It defines the contract first.

After the contract exists, Orgumented can evaluate whether the implementation should be:
- custom typed compiler logic
- a small parser/combinator layer
- `Chevrotain`
- another bounded parser strategy

Decision rule:
- choose the smallest implementation that materially improves planner depth without risking replay or overbuilding a language platform

## Bottom Line

Orgumented should not jump from regex routing straight to a DSL bet.

The correct next step is:
- semantic frame contract first
- deterministic admissibility and grounding second
- planner/compiler substrate decision third

This keeps Ask aligned to the Stage 1 mission:
- trusted change-decision support
- bounded architectural reasoning
- explicit ambiguity handling
- proof and replay integrity
