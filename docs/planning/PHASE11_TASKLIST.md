# OrgGraph Phase 11 Task List (Ask Anything Orchestration)

Goal: make `/ask` reliably handle broad, natural-language org questions by automatically deciding what to query, what entities to extract, and when to ask for clarification.

## Entry Criteria
- [ ] Phase 10 LLM-assisted mode stable with citation guardrails
- [ ] `/ask` deterministic + llm-assisted paths tested in Docker runtime
- [ ] Core endpoints (`/perms`, `/perms/system`, `/automation`, `/impact`) reliable on real org data

## Exit Criteria
- [ ] `/ask` handles ambiguous and mixed questions with correct intent routing
- [ ] Entity extraction covers user/object/field/system-permission names with high precision
- [ ] Multi-step orchestration runs the right endpoint sequence automatically
- [ ] Clarification prompts trigger only when required inputs are missing
- [ ] Final responses remain grounded with citations and consistency checks

## Scope
- Intent expansion beyond single-intent queries
- Entity extraction upgrades (including fuzzy matching + aliases)
- Query orchestration layer for multi-call plans
- Clarification/slot-filling flow for incomplete questions
- Stronger answer composition and traceability

## Not In Phase 11
- Write-back actions to Salesforce
- Autonomous background agents
- Replacing deterministic graph truth with freeform LLM reasoning

## 1. Intent & Query Understanding

- [ ] Expand planner to support mixed intents (`perms + automation`, `impact + perms/system`, etc.)
- [ ] Add confidence scoring per detected intent
- [ ] Add fallback strategy when intent confidence is low
- [ ] Add intent debug fields to aid tuning

## 2. Entity Extraction & Resolution

- [ ] Improve extraction for users, objects, fields, and system permission names
- [ ] Add alias/synonym dictionary (common abbreviations, org-specific naming)
- [ ] Add fuzzy resolver for near matches (with confidence + selected match trace)
- [ ] Detect unresolved entities and mark them for clarification

## 3. Orchestration Engine

- [ ] Build orchestration layer that maps intent/entity set -> ordered endpoint calls
- [ ] Support multi-step plans and merge results into one answer payload
- [ ] Deduplicate overlapping evidence/citations from multiple calls
- [ ] Enforce deterministic-first execution before llm-assisted synthesis

## 4. Clarification Flow

- [ ] Add structured clarification response when required inputs are missing
- [ ] Support targeted follow-up prompts (ex: missing user, object, or field)
- [ ] Return actionable options/examples to unblock user quickly
- [ ] Preserve session context for follow-up ask turn (minimal state)

## 5. Answer Quality Controls

- [ ] Add answer schema for multi-intent outputs (sections per intent/result type)
- [ ] Ensure every nontrivial claim references deterministic evidence
- [ ] Keep consistency checks against deterministic endpoints for each intent section
- [ ] Add conservative response mode for low-confidence extraction/routing

## 6. Testing

- [ ] Add planner tests for mixed-intent and ambiguous questions
- [ ] Add entity extraction tests (exact, alias, fuzzy, unresolved)
- [ ] Add orchestration integration tests on fixture + sandbox-backed data
- [ ] Add clarification-flow tests for missing slots
- [ ] Add regression tests to prevent routing drift over time

## 7. Observability & Ops

- [ ] Emit metrics: intent distribution, unresolved-entity rate, clarification rate
- [ ] Track orchestration latency breakdown per step
- [ ] Add logs for resolved entities and selected execution plan
- [ ] Add runbook guidance for tuning extraction/routing behavior

## 8. UX/Developer Experience

- [ ] Update web query UI hints/examples for “ask anything” usage
- [ ] Add API response fields that expose route decisions for debugging
- [ ] Update docs with sample advanced questions and expected behavior
- [ ] Add cheat-sheet section: how to ask questions for best precision

## Definition of Done (Phase 11)

- [ ] `/ask` can intelligently route broad org questions without manual endpoint selection
- [ ] Mixed-intent queries produce coherent, grounded, citation-backed answers
- [ ] Clarification happens only when needed and is actionable
- [ ] Test suite and runbooks cover the new orchestration behavior
