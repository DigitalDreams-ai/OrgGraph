# Real Org Desktop Proof Plan

Date: March 3, 2026

Branch:
- `dna-real-org-desktop-proof`

## Why This Slice Exists

The engine path for real alias preflight, session switch, selective retrieve, and Org Browser member loading is now materially proven.

The next gap is not core engine architecture. The next gap is direct operator proof inside the packaged desktop UI:
- `Org Sessions`
- `Org Browser`
- retrieve handoff into `Refresh & Build`

This slice exists to prove that the real-org flow works through the desktop app itself, not only through direct API proof.

## Scope

In scope:
- packaged desktop UI proof of real alias discovery and connect/switch
- packaged desktop UI proof of real metadata catalog and member loading
- packaged desktop UI proof of selective retrieve from the Org Browser cart
- visible retrieve handoff into `Refresh & Build`
- one fail-closed operator path for missing auth or invalid browser selections

Out of scope:
- planner/compiler changes
- benchmark work
- governance or policy automation
- broad UI redesign
- new engine substrate work unless required to restore the desktop contract

## Acceptance Gates

This slice is complete only if all of these are true:

1. the packaged desktop UI shows real aliases from the local `sf` keychain
2. a real sandbox alias can be preflighted and connected through `Org Sessions`
3. `Org Browser` loads a real metadata catalog in the desktop UI
4. `Org Browser` loads members for at least one real type in the desktop UI
5. a selective retrieve can be executed from the desktop cart
6. the retrieve result is visible in `Refresh & Build` without raw JSON dependence
7. at least one invalid or missing-auth path is readable and fail-closed

## Verification

Minimum local verification:
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- `pnpm desktop:smoke:release`
- direct desktop proof on this operator machine

If code changes touch the org engine path, also verify:
- alias inventory still matches local `sf` state
- connect/switch does not silently fall back
- selective retrieve still rejects empty selections

## Operator Target

Use one real sandbox alias that already exists on this machine.

Preferred target:
- `shulman-uat`

Fallbacks if needed:
- `shulman`
- `shulman-dev2`
- `shulman-beta`

## Starting Checkpoint

Merged by PR #68 on March 3, 2026:
- real alias preflight and switch are proven through the engine path
- selective retrieve for `CustomObject:Opportunity` is proven through the engine path
- `Org Browser` member indexing now resolves `CustomObject` members to top-level objects like `Opportunity`

Still to prove in this branch:
- direct packaged desktop UI proof for the same flow
- retrieve handoff visibility into `Refresh & Build`
- one readable fail-closed desktop path for invalid selections or missing auth

First implementation note on this branch:
- `Org Sessions` desktop readiness must not treat a missing parse tree as a connect blocker
- first-contact connect should be allowed as long as the alias is authenticated in `sf` and the local runtime is available
- parse-path absence should stay visible as a browser/retrieve warning until the first successful retrieve seeds the parse tree
