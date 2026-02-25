# OrgGraph Phase 10 Task List (LLM Support: OpenAI + Anthropic)

Goal: add production-safe LLM capabilities for explanation and synthesis while preserving deterministic graph truth, citation fidelity, and provider portability.

## Progress Update (2026-02-25)
- Anthropic and OpenAI provider paths are wired and exercised in runtime.
- Anthropic `llm_assist` now succeeds (`llm.used=true`) with model `claude-haiku-4-5-20251001`.
- `/ask` citation handling was improved for index-style citation references.
- Docker/runtime config was stabilized for fast provider/model switching without full stack rebuild.

## Entry Criteria
- [ ] Phase 9 Postgres migration complete and stable
- [ ] `/ask` deterministic baseline quality and latency documented
- [ ] Confidence/consistency gates from Phase 8 enforced

## Exit Criteria
- [ ] OpenAI and Anthropic providers both supported behind one abstraction
- [ ] `/ask` can run deterministic-only or LLM-assisted modes via feature flags
- [ ] Citation-preserving outputs validated across both providers
- [ ] Cost, latency, and fallback behavior are measurable and controlled

## Scope
- Provider-agnostic LLM adapter layer
- OpenAI + Anthropic implementations
- Prompting/synthesis around existing planner/graph/evidence pipeline
- Safety, observability, and runtime controls for production usage

## Not In Phase 10
- Fine-tuning/custom model training
- Autonomous agent workflows with write actions to Salesforce
- Replacing deterministic graph outputs with pure LLM reasoning

## 1. LLM Architecture

- [x] Define `LlmProvider` interface (`generate`, `health`, `tokenUsage`, `modelInfo`)
- [x] Add provider selector (`LLM_PROVIDER=openai|anthropic|none`)
- [x] Keep deterministic planner + graph calls as source of truth
- [x] Add response contract for citations, confidence, and fallback reason

## 2. Provider Integrations

- [x] Implement OpenAI provider (chat/responses API)
- [x] Implement Anthropic provider (messages API)
- [x] Add model config envs (separate defaults per provider)
- [x] Normalize output format across providers

## 3. Prompting & Response Policy

- [x] Create strict system prompt: graph truth first, no uncited claims
- [x] Add citation-grounded synthesis template using evidence snippets
- [ ] Add refusal behavior for low-confidence/insufficient evidence cases
- [x] Add deterministic fallback when provider call fails or times out

## 4. API & Runtime Controls

- [x] Extend `/ask` with mode controls (`deterministic`, `llm_assist`)
- [ ] Add max token/latency/cost guards per request
- [x] Add request-level provider/model override for testing
- [x] Add kill-switch env flags for instant LLM disable

## 5. Testing & Evaluation

- [x] Add provider contract tests with mocked SDK responses
- [ ] Add integration tests for both providers (sanitized fixtures)
- [ ] Add regression set comparing deterministic vs llm-assisted answers
- [ ] Add citation integrity tests (every nontrivial claim must map to citation)

## 6. Observability, Cost, and Security

- [ ] Emit metrics: latency, token usage, estimated cost, error rate by provider/model
- [ ] Add budget controls and alert thresholds
- [ ] Add secret management docs for `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`
- [ ] Add PII and data-handling guardrails for prompt construction

## 7. Rollout Strategy

- [ ] Start with shadow mode (generate LLM response, do not serve by default)
- [ ] Enable canary for selected queries/users
- [ ] Compare quality/latency/cost before wider enablement
- [ ] Document go/no-go criteria for enabling llm-assisted mode by default

## Provider Configuration Checklist

- [x] `.env.example` includes OpenAI + Anthropic settings
- [x] Runtime docs explain provider selection and model pinning
- [ ] Fallback behavior documented when one provider is degraded
- [ ] Local smoke script validates both provider configs (without exposing keys)

## Definition of Done (Phase 10)

- [ ] OrgGraph supports OpenAI and Anthropic through one provider abstraction
- [ ] `/ask` llm-assisted mode preserves deterministic grounding and citations
- [ ] Quality/cost/latency are measurable with enforceable budgets and kill switches
- [ ] Rollout, fallback, and security procedures are documented and tested
