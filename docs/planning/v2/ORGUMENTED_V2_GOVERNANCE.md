# Orgumented v2 Governance

Date: March 1, 2026

## Success Gates

### KPI lock
- replay pass rate target is explicit
- proof coverage target is explicit
- time-to-trusted-answer target is explicit
- decision-packet acceptance target is explicit
- false-positive threshold is explicit before any soft-gate work
- policy-maintenance effort target is explicit before broader approval-support claims

### Benchmark corpus
- benchmark scenarios are explicit and versioned
- expected outcomes are documented per scenario
- baseline runs are captured
- result artifacts are stored for comparison
- the active Stage 1 benchmark for the current slice is `HIGH_RISK_REVIEW_BENCHMARK.md`

### Product and runtime gates
- replay pass rate target locked and measured
- proof coverage target locked and measured
- desktop runtime startup and packaged smoke green
- auth, retrieve, refresh, query, and proof flow verified in the desktop product
- desktop shell remains the required primary operator path
- tool-health and session-health diagnostics are explicit for missing `sf`, missing `cci`, invalid alias, and disconnected session states

### Workflow gates
- decision packets are usable without raw JSON inspection
- at least one high-risk review workflow is documented end-to-end
- operators can use Ask, Sessions, Browser, Refresh, Analyze, and Proofs as first-class desktop workflows
- proof and replay access works through labeled history instead of manual token tracking
- org-wide selective retrieve is usable in the desktop product
- Settings and Diagnostics is good enough to support tool-health triage without dropping into raw logs first

### Strategic gates
- decision-packet acceptance criteria are explicit
- measurable review-time or evidence-gathering reduction is tracked
- false-positive threshold is explicit before soft-gate work
- policy maintenance burden is explicit before broader approval-support claims

### Operator adoption readiness
- three operator playbooks exist:
  - admin troubleshooting
  - architect release review
  - developer impact analysis
- first-15-minutes onboarding is documented and tested
- at least one high-risk review workflow is documented end-to-end

## Risk Summary

### Risk 1: Deterministic identity regresses
- impact: identical inputs stop producing identical externally visible result identity
- control: repeated-identical-ask tests remain mandatory

### Risk 2: UI boundary drifts again
- impact: policy and decision logic leak into the presentation layer
- control: reject boundary blur immediately

### Risk 3: Desktop shell remains too thin
- impact: product behaves like a wrapped web app instead of a coherent desktop runtime
- control: keep shell-owned runtime verification mandatory

### Risk 4: Planner remains too shallow
- impact: product claims outrun real reasoning depth
- control: prioritize planner/compiler improvement before larger governance claims

### Risk 5: Dev and packaged desktop diverge
- impact: regressions hide until late validation
- control: convergence remains an active architectural gate

### Risk 6: Workflow adoption never happens
- impact: technically strong product remains commercially optional
- control: require decision-packet workflow proof before strategic expansion

### Risk 7: Build-vs-borrow discipline erodes
- impact: Orgumented resumes custom-building generic substrate without measurable lift
- control: every new semantic subsystem must pass the build-vs-borrow gate before implementation

## Kill-Switches

Pause and correct if:
- replay parity fails
- deterministic simulation becomes probabilistic in core decision flow
- proof packets do not become part of real review or approval workflows
- false positives make policy-oriented guidance untrustworthy
- runtime friction outweighs operator value
- a custom subsystem lands without measurable lift criteria
- core desktop workflows fail to reach parity even though Stage 1 strategy depends on them

## Decision Discipline

Before major structural change:
- produce or refresh a plan
- use the decision matrix
- justify refactor vs module rebuild vs full rebuild numerically
- define acceptance gates before coding

For agent execution:
- default to one primary agent and use one verifier only when an independent pass adds value
- use `ORGUMENTED_V2_MULTI_AGENT_OPERATING_MODEL.md` and `ORGUMENTED_V2_CODEX_MULTI_AGENT_RUNBOOK.md`
- verifier must run `scripts/verify-worker-branch.ps1` before any merge approval when independent verification is requested
- stop optional parallel execution if replay or runtime convergence is placed at risk

Before custom-building a new semantic subsystem:
- prove it is moat, not plumbing
- prove open-source alternatives do not already solve the generic part
- prove the choice improves determinism, replay, provenance, or adoption measurably

Build-vs-borrow gate:
- use borrowed standards and tools by default for validation, provenance, policy, grammar, and generic substrate
- custom-build only where the choice clearly strengthens the Salesforce semantic moat

## Verification Discipline

No meaningful runtime change is complete without:
- tests
- build validation
- desktop smoke proof
- documentation alignment

No semantic-runtime change is complete without:
- replay parity protection
- proof artifact integrity
- clear fail-closed behavior

## Promotion Rule

Orgumented may only claim the strongest stage it has actually proven.

That means:
- do not claim governance before approval-support proof exists
- do not claim approval support before decision packets are accepted in workflows
- do not claim soft gating before false-positive tolerance is demonstrated

## Ownership

- Product/Architecture: KPI targets, benchmark corpus, stage claims, and wave acceptance
- Engineering: implementation, replay protection, build validation, and desktop smoke gates
- Operations: runtime safety, release controls, and secrets hygiene

## Governance Bottom Line

The product must stay:
- deterministic
- replay-verifiable
- proof-backed
- boundary-clean
- strategically honest
