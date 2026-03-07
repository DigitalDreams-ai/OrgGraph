# Real Org Retrieve Handoff Plan

Date: March 3, 2026

Branch:
- `dna-real-org-retrieve-handoff`

## Why This Slice Exists

Real alias discovery, preflight, connect, switch, and first-contact readiness are now materially proven.

The next gap is not engine reachability. The next gap is operator clarity in the packaged desktop UI after a real selective retrieve:
- `Org Browser` must make it obvious what was retrieved
- `Refresh & Build` must show that handoff without raw JSON dependence
- the desktop shell must expose one readable fail-closed path when retrieve state is incomplete or invalid

This slice exists to prove that a real operator can retrieve metadata from a real sandbox and immediately understand how that retrieve feeds the rebuild workflow.

## Scope

In scope:
- packaged desktop UI proof of selective retrieve from the `Org Browser` cart
- visible handoff from the real retrieve result into `Refresh & Build`
- readable handoff details for alias, parse path, metadata args, and auto-refresh intent
- one fail-closed desktop path when retrieve state is missing, incomplete, or invalid

Out of scope:
- planner/compiler changes
- benchmark work
- broad UI redesign
- governance or policy automation
- new engine substrate work unless required to restore the desktop handoff contract

## Acceptance Gates

This slice is complete only if all of these are true:

1. a real selective retrieve can be executed from the packaged desktop `Org Browser`
2. the packaged desktop UI makes the latest retrieve result visible without opening raw JSON
3. `Refresh & Build` shows the retrieve handoff fields needed by an operator:
   - alias
   - completed timestamp
   - parse path
   - metadata args
   - auto-refresh state
4. the retrieve handoff remains visible after switching from `Org Browser` to `Refresh & Build`
5. one invalid or incomplete retrieve path is readable and fail-closed in the desktop shell

## Verification

Minimum local verification:
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`
- direct packaged desktop proof on this operator machine

If code changes touch org-engine retrieval behavior, also verify:
- `pnpm --filter api test`
- selective retrieve still rejects empty selections
- retrieve metadata args remain structured and deterministic

## Operator Target

Use the existing real sandbox alias on this machine:
- `shulman-uat`

Retrieve target:
- `CustomObject:Opportunity`

## Starting Checkpoint

Merged by PR #70 on March 3, 2026:
- desktop `Org Sessions` now separates attach readiness from browser seeding
- a missing parse tree is visible as a browser/retrieve warning, not a connect blocker

Current checkpoint on this branch:
- `Org Browser` now assesses retrieve handoff readiness directly from the latest retrieve result
- `Refresh & Build` now mirrors that readiness state and fails closed in the desktop shell when the handoff is incomplete
- `Refresh & Build` now persists lineage context with refresh, diff, and org-retrieve summaries so stale results are marked explicitly when the current Browser handoff changes
- packaged desktop verification still passes after the handoff lineage guard was added

Still to prove in this branch:
- direct packaged desktop operator proof of the same retrieve -> refresh handoff against the real UI
