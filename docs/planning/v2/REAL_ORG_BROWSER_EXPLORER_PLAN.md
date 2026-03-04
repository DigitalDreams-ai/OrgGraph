# Real Org Browser Explorer Plan

Date: March 4, 2026

## Objective

Make `Org Browser` feel like a metadata explorer instead of a metadata API form.

This slice follows the unified-search work. It does not try to recreate full VS Code parity. It makes the browser easier to navigate when the operator thinks in terms of actual files and metadata items instead of type-first API calls.

## Problem

The first discovery slice solved type-first search, but the browser still feels too mechanical:
- flat search results
- mixed add/remove verbs
- weak sense of a browsable metadata inventory

Operators want to:
- search for `Opportunity`
- see the matching item in a recognizable grouped explorer
- browse related matches without already knowing the metadata family
- add the exact item they want to the retrieve cart from that explorer view

## Slice Boundary

In scope:
- explorer-style grouped search results
- visible grouping by metadata type/family
- file-like item rows that emphasize the actual item name first
- checkbox-based selection for both family rows and item rows
- preserve the existing retrieve cart and fail-closed retrieve handoff
- visual cleanup for long names, IDs, usernames, paths, and JSON-heavy diagnostics

Out of scope:
- full Salesforce DX or VS Code tree parity
- new retrieval semantics
- cross-org file synchronization
- planner, policy, or trust logic changes

## Acceptance Gates

The slice is complete only if all of the following are true:

1. Searching for `Opportunity` shows grouped explorer sections instead of only a flat result list.
2. Each result emphasizes the actual item name first and the metadata type second.
3. The operator can select a specific item directly from the grouped explorer with a checkbox.
4. Selecting a family row includes the nested metadata under that family.
5. The browser remains usable when search is empty and still supports family browsing.
6. Long values stay inside their cards instead of clipping or overflowing.
7. Existing selective retrieve behavior and `Refresh & Build` handoff remain fail-closed.
8. Raw JSON is not required to discover or stage a retrievable item.

## Implementation Direction

UI:
- turn unified search results into grouped explorer sections
- make the item label primary and metadata family secondary
- keep family browsing visible as the fallback browse path
- use the same checkbox selection model in both grouped search and family browse
- let operators retrieve from checked selections instead of mixed `Add Item` / `Add Type` / `Add Visible Types` verbs

Engine:
- preserve the current unified search endpoint unless a UI gap proves an engine contract change is necessary
- prefer live org metadata discovery so the explorer can load before a local parse tree has been seeded

## Verification

Minimum verification for this slice:
- `pnpm --filter web build`
- `pnpm --reporter=append-only --loglevel=info desktop:build`
- `pnpm --reporter=append-only --loglevel=info desktop:smoke:release`

Real-org proof after merge:
- search for `Opportunity`
- browse grouped results without thinking in metadata-type-first terms
- add the intended item to the retrieve cart
- retrieve and confirm the handoff remains visible in `Refresh & Build`

## Current Checkpoint

Implemented on `dna-org-browser-live-discovery`:
- metadata catalog, members, and search now prefer live org metadata discovery and only fall back to the local parse-tree index when needed
- unified metadata search now renders grouped explorer sections by metadata family
- explorer rows emphasize the actual item name first and metadata family second
- group headers and item rows now use checkbox selection instead of separate add/remove verbs
- a checked family row includes that metadata family in the retrieve cart
- checked item rows add those specific items to the retrieve cart
- the original family browser remains visible as the fallback browse path when search is empty
- long values in decision packets, proof context, mapping cards, and diagnostics now wrap inside their cards instead of clipping

Current local verification:
- `pnpm --filter api exec ts-node --transpile-only test/org-service.ts`
- `pnpm --filter api typecheck`
- `pnpm --filter web build`
- `pnpm --reporter=append-only --loglevel=info desktop:build`
- `pnpm --reporter=append-only --loglevel=info desktop:smoke:release`
