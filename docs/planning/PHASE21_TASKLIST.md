# Orgumented Phase 21 Task List (LLM Reliability + Evidence Integrity)

Goal: close the highest-priority Phase 10 gaps so LLM-assisted outputs remain deterministic, evidence-backed, and operationally safe.

## Entry Criteria
- [ ] Phase 20 merged
- [ ] OpenAI and Anthropic keys/config available in target environments
- [ ] Existing `/ask` deterministic and llm_assist modes stable

## Exit Criteria
- [ ] OpenAI and Anthropic behavior parity documented and test-verified
- [ ] Citation integrity enforced for nontrivial LLM-assisted claims
- [ ] Request-level cost/latency/token guardrails enforced with safe fallback
- [ ] Provider/model metrics emitted and consumable in ops workflows

## Scope
- LLM provider parity + error/fallback consistency
- Citation/grounding integrity checks
- Budget guardrails and kill-switch behavior
- Provider/model observability baselines

## Deliverables
- [ ] Add provider parity tests (OpenAI vs Anthropic) for equivalent prompts + evidence envelopes
- [ ] Add citation integrity validator in llm_assist response path
- [ ] Add request guardrails:
  - max latency
  - max output tokens
  - cost budget threshold
- [ ] Ensure fail-closed behavior:
  - no silent unconstrained fallback
  - deterministic fallback with explicit reason
- [ ] Emit provider/model metrics:
  - latency
  - token usage
  - estimated cost
  - error rate

## Test Gates
- [ ] `pnpm --filter api test` includes provider parity + citation integrity tests
- [ ] web/API smoke covers llm_assist success + fallback paths
- [ ] deterministic replay unchanged for deterministic mode
- [ ] no secret leakage in logs/artifacts

## Risks and Controls
- Risk: provider drift causes non-reproducible output
  - [ ] compare normalized response envelopes and enforce invariant fields
- Risk: budget overrun under load
  - [ ] enforce hard caps and expose operator-visible fallback reasons

## Definition of Done
- [ ] LLM-assisted mode is measurably reliable, evidence-safe, and budget-controlled
