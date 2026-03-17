# Orgumented v2 Strategy

Date: March 1, 2026

## Core Position

Orgumented should not be positioned as:
- an AI copilot for Salesforce
- a metadata analyzer with nicer UX
- a generic architecture dashboard

Orgumented v2 should be positioned as:
- a replayable, policy-gated architectural decision runtime for Salesforce change risk

Long-term ambition:
- executable architecture governance

Constraint:
- that ambition is only valid after trusted decision packets become accepted workflow artifacts and measurable lift is demonstrated

## Real Product Strengths

Orgumented already has meaningful structural differentiation:
- deterministic Ask responses under a snapshot + policy envelope
- proof artifacts and replay tokens
- replay parity checks
- drift-budget enforcement
- evidence-backed answers across permissions, automation, and impact

This means the product is already more than:
- a static analyzer
- a dashboard
- a copilot wrapper

## Current Gaps

The most important gaps are:
- planner/compiler depth is still too shallow
- operator workflows are not yet indispensable
- decision packets are not yet embedded in real review or approval workflows
- measurable lift versus current architecture-review practice is not yet proven

## Best Near-Term Wedge

The best wedge is:
- trusted decision support for high-risk Salesforce changes

The core user questions are:
- what is the real blast radius of this change
- what automation or permission behavior makes this risky
- should this change be approved under the current snapshot and policy
- can we replay why that conclusion was reached later

## Practical Admin and Developer Value

Orgumented v2 should also deliver immediate practical value for admins and developers:
- fast understanding of cascading metadata impact
- permission-path explanation
- automation-path explanation
- before/after snapshot comparison
- replayable proof for prior architectural conclusions

Boundary:
- Orgumented can become strong at metadata-driven change understanding now
- it is not yet a general root-cause engine for every runtime or production failure class

## Strategic Stage Model

### Stage 1: Trusted Change Decision Engine

Goal:
- become the most trusted deterministic engine for Salesforce change-risk decisions

Proof required:
- replay parity remains 100 percent on benchmark corpus
- decision packets are trusted on real change scenarios
- review effort or escalation effort is measurably reduced

### Stage 2: Policy-Aware Approval Support

Goal:
- turn trusted decisions into policy-aware approval artifacts

Proof required:
- decision packets are accepted in review workflows
- policy output reduces manual evidence gathering
- false positives remain low enough to preserve trust

### Stage 3: Soft Deployment Gate

Goal:
- move from advisory output to pre-deployment recommendation and soft gating

Proof required:
- teams actually use Orgumented in release decisions
- soft-gate signals correlate with real deployment risk
- the product prevents or downgrades a measurable class of bad releases

### Stage 4: Enforcement-Backed Governance

Goal:
- make policy executable where trust has already been earned

Proof required:
- governance teams rely on Orgumented for audit-ready evidence
- selected policies can block unsafe changes with acceptable false-positive rates

## Commercial Reality

Initial likely buyer:
- enterprise Salesforce architects
- platform engineering leads
- senior system integrators in complex orgs

Expansion buyer:
- governance teams
- release governance and review-board functions

Orgumented gets budget only if it improves one or more of:
- architecture-review cycle time
- deployment risk detection before production
- rollback or escalation caused by misunderstood metadata impact
- manual effort required to assemble architectural evidence
- consistency across reviewers

## Structural vs Surface Differentiation

Structural moat:
- deterministic replay
- proof-required answer model
- snapshot-bound conclusions
- policy-gated trust and refusal
- cross-domain synthesis across permissions, automation, impact, and drift

Surface-level unless improved:
- console-like UI flows
- shallow planner routing
- generic "AI for Salesforce" language
- UX polish without workflow adoption

## UI Product Posture

Orgumented Stage 1 UI must be:
- simplified
- elegant
- modern
- operator-calm

That means:
- one primary job per workspace
- one primary next action visible without card-scanning
- progressive disclosure for secondary detail
- raw JSON, debug payloads, and low-signal telemetry kept behind secondary affordances
- no duplicate status summaries or repeated action rows in the same workflow
- no dense dashboard behavior that forces the operator to interpret multiple competing cards before acting

UI quality is not a cosmetic afterthought.
It is part of trust:
- a bloated or redundant surface weakens decision confidence
- information overload raises operator error rate
- unclear primary actions make deterministic workflows feel less trustworthy than they are

Stage 1 therefore requires:
- fewer, clearer primary surfaces
- stronger hierarchy between primary artifact, secondary evidence, and debug detail
- modern visual discipline that reduces clutter rather than adding more visible controls

## Strategic Kill-Switches

Stop major strategic expansion if:
- replay parity cannot be guaranteed
- decision packets do not become part of real review workflows
- policy encoding is too costly or too ambiguous to maintain
- false positives make soft gating untrustworthy
- runtime friction overwhelms perceived value

## Bottom Line

Orgumented v2 should be built as:
- a trusted change-decision engine first
- an approval-support system second
- a soft-gate candidate later
- an enforcement-backed governance system only after proof is earned
