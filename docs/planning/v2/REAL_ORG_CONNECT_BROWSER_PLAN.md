# Real Org Connect And Browser Plan

Date: March 3, 2026

Branch:
- `dna-real-org-connect-browser`

## Why This Slice Exists

The benchmark tooling is now good enough for later use, but fixture-driven benchmark iteration is not the highest-value next step.

The next proof that matters is real operator use of:
- `Org Sessions`
- `Org Browser`

This slice exists to prove that a real authenticated Salesforce alias can be connected inside the desktop app and then used to:
- inspect session readiness
- browse metadata types and members
- build a selective retrieve cart
- hand the retrieve result into `Refresh & Build`

## Scope

In scope:
- real alias discovery in `Org Sessions`
- real alias preflight and attach/switch behavior
- real metadata catalog and member loading in `Org Browser`
- real selective retrieve against the active alias
- readable failure states when local auth or retrieve prerequisites are missing

Out of scope:
- new benchmark work
- planner/compiler expansion
- governance or policy automation
- broad UI redesign

## Acceptance Gates

This slice is complete only if all of these are true:

1. `Org Sessions` shows real local aliases from `sf org list auth`
2. a real alias can be preflighted and connected from the desktop UI
3. `Org Browser` can load a real metadata catalog from the active session
4. `Org Browser` can load members for at least one real metadata type
5. a selective retrieve can be executed from the cart
6. the retrieve result hands off into `Refresh & Build`
7. failures remain actionable and fail closed

## Verification

Minimum local verification:
- `pnpm --filter api test`
- `pnpm --filter web build`
- `pnpm desktop:build`
- targeted real-org local proof on this machine

If code changes touch the org engine path, also verify:
- alias inventory still matches local `sf` keychain state
- attach/switch does not silently fall back
- selective retrieve still rejects empty or invalid selections

## First Target

Use a real alias that already exists on this machine.

Observed candidates on March 3, 2026:
- `shulman-uat`
- `shulman`
- `shulman-dev2`
- `shulman-beta`

The first target should be one sandbox alias, not a scratch org.
