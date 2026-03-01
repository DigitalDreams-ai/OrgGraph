# ORGUMENTED DECISION MATRIX (Refactor vs Module Rebuild vs Full Rebuild)

Purpose:
Quantitatively choose:
A) Targeted Refactor
B) Module-Level Rebuild
C) Full Rebuild

Scoring (1–5):
1 = severe weakness / high risk
2 = significant issues
3 = acceptable
4 = strong
5 = excellent / low risk

Weighted score = Score × Weight

---

## SECTION 1 — CONTRACT COMPLIANCE (Weight: 35)

1.1 Determinism enforceability
- Can we guarantee: same snapshot + query + policy -> identical output?

1.2 Proof & replay integrity
- Can we persist proof artifacts and replay identically (or fail explicitly)?

1.3 Constraint-first / fail-closed enforcement
- Are violations blocked by structure, not optional code paths?

1.4 Provenance traceability
- Is every claim traceable to normalized snapshot state + derivation?

---

## SECTION 2 — DESKTOP-FIRST ALIGNMENT (Weight: 15)

2.1 Tauri owns lifecycle cleanly
2.2 Next.js UI is presentation-only (no business/policy logic)
2.3 NestJS treated as local engine (not deployable web product)
2.4 No Docker-era or browser-era assumptions embedded

---

## SECTION 3 — ARCHITECTURAL COHERENCE (Weight: 15)

3.1 Clear UI ↔ Engine boundary (contracts stable, typed if possible)
3.2 Modular structure (feature/workflow segmented)
3.3 No cross-layer coupling that prevents refactor
3.4 Config is explicit + auditable

---

## SECTION 4 — EXECUTION RISK (Weight: 15)

4.1 Time to stable release
4.2 Risk of hidden breakage
4.3 Refactor complexity vs rebuild complexity
4.4 % realistically salvageable code (not “in theory”)

---

## SECTION 5 — TESTABILITY & ENFORCEMENT (Weight: 10)

5.1 Ability to add replay harness + golden tests
5.2 Ability to add property tests for invariants
5.3 Observability/diagnostics to explain failures

---

## SECTION 6 — TEAM & DELIVERY FACTORS (Weight: 10)

6.1 Team familiarity with stack
6.2 Build + packaging stability (Windows desktop)
6.3 CI simplicity and speed

---

## DECISION RULES (Hard)

- Full Rebuild is allowed ONLY if:
  (Full Rebuild total) ≥ (best alternative total) + 15%
  AND Contract Compliance avg for Refactor < 3.0

- Module-Level Rebuild is preferred if:
  Contract Compliance avg for core engine ≥ 3.5
  BUT UI/Boundary categories < 3.0

- Refactor is preferred if:
  Refactor total ≥ 85% of best option
  AND Contract Compliance avg ≥ 3.5

If no option exceeds 70% overall:
- Do NOT proceed with major work.
- First redesign boundaries + contracts, then rescore.

---

## REQUIRED OUTPUTS

1) Completed scoring table for A/B/C with justifications and file paths
2) Weighted totals per option
3) Recommendation + why
4) 90-day plan (phased)
5) Kill-switch criteria (pivot triggers)