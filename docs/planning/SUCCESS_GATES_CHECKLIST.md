# Orgumented Success Gates Checklist

Purpose: define objective gates for delivery success from Phase 18 onward.

## 1) KPI Lock (Required Before Phase 18 Build Completion)
- [ ] Replay pass rate target locked (`100%`)
- [ ] Proof coverage target locked (`100% claim-to-proof linkage`)
- [ ] Time-to-trusted-answer target locked (percent improvement vs baseline)
- [ ] False-positive risk alert target locked (percent reduction vs baseline)
- [ ] Precision/recall targets locked for permission + automation explainability

## 2) Benchmark Corpus (Required)
- [ ] Corpus includes real sandbox scenarios (permission, automation, release risk)
- [ ] Expected outcomes documented per scenario
- [ ] Baseline run captured on current stable main
- [ ] Result artifacts stored and versioned

## 3) WebUI-First Contract (Required)
- [ ] Every primary API capability mapped to a first-class WebUI flow
- [ ] Deterministic-first output rendering defined for Ask
- [ ] Proof/provenance visibility required in UI (`snapshotId`, `policyId`, `replayToken`, trust level)
- [ ] Failure states mapped to explicit operator actions

## 4) Auth/Retrieve Contract (Phase 18–19 Critical)
- [ ] WebUI auth path uses Salesforce CLI keychain as primary flow
- [ ] Alias/session contract is explicit (`SF_ALIAS`, `SF_BASE_URL`, `sf org login web`, `sf org display`)
- [ ] Legacy OAuth and magic-link auth paths are removed from runtime and docs
- [ ] Org-wide metadata browser behavior defined (expand/select/search across types)
- [ ] package.xml-all retrieval is not default

## 5) CI/Runtime Hardening
- [ ] CI validates `sf` CLI availability in runtime paths used by retrieve/connect flows
- [ ] Web smoke includes auth -> retrieve -> refresh -> query -> proof path
- [ ] No secret leakage in logs/artifacts checks
- [ ] Determinism regression checks run in CI for replay/trust gates

## 6) Operator Adoption Readiness
- [ ] Three operator playbooks are published:
  - [ ] admin troubleshooting
  - [ ] architect release review
  - [ ] dev impact analysis
- [ ] “First 15 minutes” onboarding flow is documented and tested

## 7) Promotion Rule
- [ ] A phase is only considered complete when all required gates above are satisfied or explicitly deferred with written rationale.

## Ownership
- Product/Architecture: KPI targets + phase acceptance
- Engineering: implementation + tests + CI gates
- Operations: runtime safety + release controls + secrets hygiene
