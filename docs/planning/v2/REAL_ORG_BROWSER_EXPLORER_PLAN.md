# Real Org Browser Explorer Plan

Date: March 4, 2026

## Objective

Make `Org Browser` feel like a metadata explorer instead of a metadata API form.

This slice follows the unified-search work. It does not try to recreate full VS Code parity. It makes the browser easier to navigate when the operator thinks in terms of actual files and metadata items instead of type-first API calls.

## Problem

The first discovery slice solved type-first search, but the browser still feels too mechanical:
- flat search results
- explicit type/member controls
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
- direct add-to-cart actions from grouped explorer rows
- preserve the existing retrieve cart and fail-closed retrieve handoff

Out of scope:
- full Salesforce DX or VS Code tree parity
- new retrieval semantics
- cross-org file synchronization
- planner, policy, or trust logic changes

## Acceptance Gates

The slice is complete only if all of the following are true:

1. Searching for `Opportunity` shows grouped explorer sections instead of only a flat result list.
2. Each result emphasizes the actual item name first and the metadata type second.
3. The operator can add a specific item directly from the grouped explorer into the retrieve cart.
4. The browser remains usable when search is empty and still supports type browsing.
5. Existing selective retrieve behavior and `Refresh & Build` handoff remain fail-closed.
6. Raw JSON is not required to discover or stage a retrievable item.

## Implementation Direction

UI:
- turn unified search results into grouped explorer sections
- make the item label primary and metadata family secondary
- keep type browsing visible as the fallback browse path
- let operators add a matched item or family directly into the retrieve cart from the grouped explorer

Engine:
- preserve the current unified search endpoint unless a UI gap proves an engine contract change is necessary

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

Implemented on `dna-org-browser-explorer-browse`:
- unified metadata search now renders grouped explorer sections by metadata family
- explorer rows emphasize the actual item name first and metadata family second
- group headers expose `Load Family` and `Add Type` actions
- matched members can be added directly into the retrieve cart from the explorer result list
- the original family/type browser remains visible as the fallback browse path when search is empty

Current local verification:
- `pnpm --filter web build`
- `pnpm --reporter=append-only --loglevel=info desktop:build`

Known local blocker:
- `pnpm --reporter=append-only --loglevel=info desktop:smoke:release` still fails on the pre-existing packaged runtime bootstrap drift-budget error:
  - `Semantic drift budget exceeded: objectNodeDelta=75 > 25`
- that blocker predates this explorer UI slice and does not come from the grouped-search changes
