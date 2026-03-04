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
- cross-type search results from the current metadata index
- result rows that make the type explicit after the match is found
- add-type and add-member actions directly from those results
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
3. The operator can add a specific member from the search results directly into the retrieve cart.
4. The operator can still browse by type when search is empty.
5. Existing selective retrieve behavior and `Refresh & Build` handoff remain fail-closed.
6. Raw JSON is not required to discover a retrievable item by name.

## Implementation Direction

Engine:
- add a unified metadata search endpoint over the current parse-tree metadata index
- return typed result entries instead of forcing the UI to infer cross-type matches from catalog rows

UI:
- replace `Type Search` with a unified name-first search label
- keep type browsing available as a secondary path
- add a visible search-results section above the type explorer

## Verification

Minimum verification for this slice:
- `pnpm --filter web build`
- `pnpm --reporter=append-only desktop:build`
- `pnpm --reporter=append-only desktop:smoke:release`

Real-org follow-up proof after merge:
- search for `Opportunity` in packaged desktop `Org Browser`
- add the result to cart without entering `CustomObject`
- retrieve selected metadata
- confirm the handoff is visible in `Refresh & Build`
