# Real Org Browser Discovery Plan

Date: March 3, 2026

## Objective

Make `Org Browser` usable when the operator knows the metadata item name but does not know the Salesforce metadata type first.

This slice is not a full browser redesign. It is a focused Stage 1 operator workflow improvement.

## Problem

Current `Org Browser` behavior is still metadata-API-first:
- separate `Type Search`
- separate `Member Search`
- explicit `Load Members`
- implicit assumption that the operator understands the metadata type first

That is technically valid, but it does not match how operators usually work. Operators typically know:
- `Opportunity`
- a field name
- a layout name
- a tab name
- an Apex class name
- a flow name

The browser should let them search by the actual item name first, then retrieve from visible results.

## Slice Boundary

In scope:
- one unified metadata-name search input
- cross-type search results from live org metadata discovery when no local parse tree is seeded
- result rows that make the type explicit after the match is found
- checkbox-based selection from those results
- preserve the existing retrieve cart and `Refresh & Build` handoff

Out of scope:
- full file-tree parity with VS Code
- new retrieval semantics
- policy or planner changes
- engine-side fallback to unconstrained search behavior

## Acceptance Gates

The slice is complete only if all of the following are true:

1. An operator can search for `Opportunity` without typing `CustomObject` first.
2. Search results show both the matched item name and its metadata type.
3. The operator can select a specific member from the search results directly into the retrieve cart with a checkbox.
4. The operator can still browse metadata families when search is empty.
5. Existing selective retrieve behavior and `Refresh & Build` handoff remain fail-closed.
6. Raw JSON is not required to discover a retrievable item by name.

## Implementation Direction

Engine:
- add a unified metadata search endpoint that prefers live org metadata discovery and only falls back to the local parse-tree index when needed
- return typed result entries instead of forcing the UI to infer cross-type matches from catalog rows

UI:
- replace `Type Search` with a unified name-first search label
- keep metadata-family browsing available as a secondary path
- add a visible search-results section above the type explorer
- remove mixed add/remove verbs from the discovery surface in favor of checkbox selection

## Verification

Minimum verification for this slice:
- `pnpm --filter web build`
- `pnpm --reporter=append-only desktop:build`
- `pnpm --reporter=append-only desktop:smoke:release`

Current branch verification status:
- `pnpm --filter api exec ts-node --transpile-only test/org-service.ts` passes
- `pnpm --filter api typecheck` passes
- `pnpm --filter web build` passes
- `pnpm --reporter=append-only --loglevel=info desktop:build` passes
- `pnpm --reporter=append-only --loglevel=info desktop:smoke:release` passes

Real-org follow-up proof after merge:
- search for `Opportunity` in packaged desktop `Org Browser`
- select the result with a checkbox without entering `CustomObject`
- retrieve selected metadata
- confirm the handoff is visible in `Refresh & Build`
