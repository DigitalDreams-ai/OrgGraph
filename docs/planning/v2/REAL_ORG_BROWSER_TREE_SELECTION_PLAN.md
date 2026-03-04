# Real Org Browser Tree Selection Plan

Date: March 4, 2026

## Objective

Make `Org Browser` selection behavior obvious and consistent:
- checkbox means included in cart
- family selection means include nested items
- the same pattern applies in both search and browse views

This slice is a UX contract hardening pass on top of live discovery. It does not change retrieval semantics.

## Problem

After live-discovery shipped, operators still saw mixed mental models:
- legacy action language (`Add Item`, `Add Type`, `Add Visible Types`)
- weak cues about what family-level selection means
- browsing that still felt like a metadata API control panel instead of an explorer

## Slice Boundary

In scope:
- simplify action names around explorer/search and checked-cart retrieval
- enforce checkbox-first selection in search and browse
- make family selection semantics explicit in labels and hints
- load nested family members on expand to support tree-style browsing
- preserve fail-closed retrieve handoff behavior

Out of scope:
- new metadata retrieval backend behavior
- trust/policy/planner changes
- full VS Code parity

## Acceptance Gates

1. Search and browse both show checkbox selection as the primary interaction.
2. Family-level selection clearly indicates nested inclusion behavior.
3. Family rows can be expanded as a tree-style browse path and load nested members.
4. Cart/retrieve actions use consistent language (`Retrieve Checked`).
5. Existing selective retrieve behavior and `Refresh & Build` handoff remain fail-closed.
6. `pnpm --filter web build`, `pnpm desktop:build`, and `pnpm desktop:smoke:release` pass.

## Current Checkpoint

Implemented on `dna-org-browser-tree-selection`:
- action labels now use explorer/check semantics (`Load Explorer Tree`, `Search Explorer`, `Retrieve Checked`)
- search and browse both use checkbox-first staging with explicit family vs item hints
- expanding a family now auto-loads nested members for tree-style browsing
- selection summaries and copy now use family/item wording instead of mixed type/member add verbs
- summary row alignment in the explorer frame now prevents clipping while keeping counts visible

