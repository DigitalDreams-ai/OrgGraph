# Phase 11 Proof Workflow Report

## Scenario
`release-risk + permission impact`

Query used:
`What is the release risk impact on Opportunity.StageName and can jane@example.com edit object Case?`

## Baseline (Endpoint-Only)
- Calls:
  - `/perms?user=jane@example.com&object=Case`
  - `/impact?field=Opportunity.StageName`
- Observed:
  - permission result available
  - impact paths available
- Limitation:
  - no single replay token
  - no unified proof artifact
  - no trust-level envelope

## Semantic Runtime (Phase 11)
- Call:
  - `/ask` (deterministic mode, mixed intent)
- Observed:
  - unified release-risk + permission-impact answer
  - trust level + policy + meaning metrics
  - proof artifact (`proofId`) + replay token
- Replay check:
  - `/ask/replay` returned `matched=true`

## Evidence Artifact
- Generated test artifact:
  - `artifacts/phase11-proof-workflow.json`

Example measured result from latest run:
- Baseline elapsed: `15ms`
- Semantic runtime elapsed: `10ms`
- Lift:
  - `auditability: true`
  - `reproducibility: true`
  - `deterministicProofCoverage: true`

## Conclusion
Phase 11 workflow goal is met for the selected scenario:
- endpoint-only flow provides raw signals,
- semantic runtime provides a replayable, policy-bounded architectural decision with proof.
