# Onboarding: First Successful Workflow

## Objective
Complete one end-to-end operator workflow in under 15 minutes.

## Prerequisites
- Org session connected (`/org/session` is connected)
- Metadata retrieval enabled
- API/web healthy

## Guided Workflow
1. Open `Connect`, verify preflight and session.
2. Open `Org Browser`, retrieve the onboarding selection set:
   - See `fixtures/onboarding/first-success.json`
3. Open `Ask`, run:
   - `What touches Opportunity.StageName?`
4. Open `Simulate`, run Scenario A.
5. Open `Prove`, run `Trust Dashboard`.

## Success Criteria
- Ask returns deterministic answer + proof
- Simulate returns risk scores + recommendation
- Trust dashboard shows non-zero totals
