# Real Org Session Status Plan

Date: March 4, 2026

## Objective

Make `Org Sessions` fail closed when the desktop engine cannot be reached.

The current UI can leave operators with the wrong conclusion:
- `sf CLI: missing`
- `CCI: missing`
- `Session: unknown`

even when the real problem is simply that the local desktop API is no longer reachable.

This slice fixes the operator contract. If the runtime is unavailable, the UI must say so directly instead of reusing placeholder values that look like real tool or auth failures.

## Problem

Real-org testing surfaced a harmful presentation bug:
- `Refresh Overview` can fail
- the workspace can retain or fall back to placeholder values
- operators then read those placeholders as real facts about the machine or alias

That violates the desktop operator goal. Runtime disconnect must be distinct from:
- missing `sf`
- missing `cci`
- disconnected org session
- missing parse path

## Slice Boundary

In scope:
- clear stale `Org Sessions` state when overview/tool/session/preflight requests fail
- render runtime-unavailable messaging instead of fake `missing`/`unknown` facts
- preserve successful live payload rendering
- keep the current engine endpoints unchanged unless a contract bug proves that necessary

Out of scope:
- new auth flows
- new org browser behavior
- runtime bootstrap changes
- planner, policy, proof, or replay logic changes

## Acceptance Gates

The slice is complete only if all of the following are true:

1. If `Refresh Overview` cannot reach the desktop API, the workspace does not present `sf` or `cci` as genuinely missing.
2. If the session/status/preflight payloads fail, stale success values are not reused as if they were current.
3. The operator can distinguish:
   - runtime unavailable
   - tooling missing
   - session disconnected
   - parse path absent
4. When the backend is healthy, live `sf`, `cci`, session, and preflight state still render correctly.
5. The fix does not widen the UI boundary into business or policy logic.

## Verification

Minimum verification for this slice:
- `pnpm --filter web build`
- `pnpm --reporter=append-only --loglevel=info desktop:build`
- one manual negative-path proof where the desktop API is unavailable and the UI reports runtime unavailability instead of fake tool-missing state
