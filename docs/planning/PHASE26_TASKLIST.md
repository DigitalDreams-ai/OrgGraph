# Orgumented Phase 26 Task List (LLM Rollout Governance + Ops Hardening)

Goal: operationalize LLM support with controlled rollout, measurable quality deltas, and production-grade governance after Phase 25 WebUI workflow stabilization.

## Entry Criteria
- [ ] Phase 25 complete and merged
- [ ] Provider metrics and trust/guardrail envelopes active

## Exit Criteria
- [ ] Shadow/canary rollout controls implemented and documented
- [ ] Deterministic vs `llm_assist` regression suite enforced in CI
- [ ] Prompt/key handling and incident runbooks complete
- [ ] Go/no-go scorecard formalized for default `llm_assist` enablement

## Scope
- Rollout controls and adoption gates
- Regression benchmarking and quality tracking
- Security/compliance controls for prompt and key handling
- Operator runbooks and escalation controls

## Deliverables
- [ ] Implement shadow mode toggle (execute LLM path, do not serve by default)
- [ ] Implement canary controls by query class/operator cohort
- [ ] Add deterministic vs `llm_assist` benchmark corpus and compare reports
- [ ] Add go/no-go scorecard:
  - [ ] quality lift
  - [ ] latency impact
  - [ ] cost impact
  - [ ] fallback/error rates
- [ ] Update runbooks:
  - [ ] key rotation and provider failover
  - [ ] prompt/data handling guardrails
  - [ ] incident response for provider outages

## Test Gates
- [ ] CI runs regression comparison suite with threshold enforcement
- [ ] Smoke tests validate shadow/canary toggles and fallback semantics
- [ ] Release checklist includes LLM governance controls

## Risks and Controls
- Risk: uncontrolled LLM expansion erodes deterministic trust
  - [ ] deterministic mode remains hard baseline each release
- Risk: operational burden grows faster than measured lift
  - [ ] rollout gates tied to explicit lift criteria

## Definition of Done
- [ ] LLM adoption is governed, auditable, and justified by measured lift.
