# Wave C Tasklist - Proof Productization

Objective: make proof-backed decision packets the default Ask output and operator workflow.

## Scope
- Decision packet output model.
- Proof lookup, replay, and trust/policy visibility in primary UX.
- Derivation/provenance completeness for all claims.
- Operator-native proof history UX (no manual token bookkeeping).

## Tasks
- [ ] Define canonical decision packet schema for Ask responses.
- [ ] Ensure every claim links to derivation edges + evidence IDs.
- [ ] Keep proof IDs/tokens as internal references; do not require operator-managed token tracking.
- [ ] Add `Recent Decisions` history with auto titles, labels/tags, timestamps, trust level, and quick filtering.
- [ ] Add pin/bookmark and editable label support for high-value decisions.
- [ ] Add one-click open/replay from history (no manual paste of proofId/replayToken).
- [ ] Add proof lookup and replay workflows with deterministic verification.
- [ ] Add policy envelope and trust level visualization.
- [ ] Add metrics export and explainability context around proofs.
- [ ] Add regression tests for proof coverage and replay integrity.

## Exit Gates
- [ ] Proof coverage is 100% for production Ask responses.
- [ ] Replay verification passes benchmark packet set.
- [ ] Operators can inspect why-path and rejected branches.
- [ ] Trust/policy status is visible in primary Ask workflow.
- [ ] Operator can retrieve/replay prior decisions via history UI without manually managing IDs/tokens.
