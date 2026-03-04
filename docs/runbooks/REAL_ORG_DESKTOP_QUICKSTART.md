# Real Org Desktop Quickstart

Follow this file only.

Purpose:
- open the packaged Orgumented desktop app
- connect a real sandbox alias
- use `Org Browser`
- run a selective retrieve
- confirm the retrieve handoff in `Refresh & Build`

Use `bash` for all commands below.

## What You Need Before You Start

You need all of these:
- a local clone at `C:/Users/sean/Projects/GitHub/OrgGraph`
- a real authenticated Salesforce alias in `sf`
- Node, pnpm, Rust, and the desktop build toolchain already working

Preferred alias for this run:
- `shulman-uat`

Fallback aliases if needed:
- `shulman`
- `shulman-dev2`
- `shulman-beta`

## Commands You Type

Type these commands exactly, one at a time:

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm --reporter=append-only --loglevel=info install
pnpm --reporter=append-only --loglevel=info desktop:info
pnpm --reporter=append-only --loglevel=info desktop:build
```

After the build finishes, open the packaged desktop app with:

```bash
/c/Users/sean/Projects/GitHub/OrgGraph/apps/desktop/src-tauri/target/release/orgumented-desktop.exe
```

Do not type anything else unless the app fails to open.

## What You Should See Before You Click Anything

The desktop app should open with the Orgumented window visible.

You should be able to switch between these workspaces:
- `Ask`
- `Org Sessions`
- `Org Browser`
- `Refresh & Build`

If the app closes immediately, stop and report that failure.

## Step 1: Open Org Sessions

In the app:
1. click `Org Sessions`
2. wait for the alias list to appear

Success cues:
- you see one or more real aliases
- `shulman-uat` is listed, or one of the fallback aliases is listed
- the alias does not show as blocked just because the browser is not seeded yet

Failure cues:
- no aliases appear
- the workspace says `sf` is missing
- the alias is shown as not attachable even though it is authenticated locally

## Step 2: Connect The Alias

In `Org Sessions`:
1. select `shulman-uat`
2. run the preflight/connect action shown in the UI

Success cues:
- the alias becomes the active alias
- the session state reads as connected or verified
- if the UI shows separate status chips, `Ready to connect` should be good
- `Browser seeded` may still be false on first contact, and that is acceptable

Failure cues:
- connect fails without an actionable message
- the alias switches back unexpectedly
- the UI silently degrades or hides the failure

## Step 3: Open Org Browser

In the app:
1. click `Org Browser`
2. click the control that loads or refreshes metadata types

Success cues:
- the metadata catalog loads
- you see real metadata types
- the active alias shown in the workspace matches the alias you connected

Failure cues:
- empty catalog with no explanation
- alias mismatch
- blocking error with no readable reason

## Step 4: Load Members For CustomObject

In `Org Browser`:
1. find `CustomObject`
2. click `Load Members`

Success cues:
- member names load
- you see top-level object names such as `Opportunity`
- you do not just see nested field/listview file names

Failure cues:
- no members load
- members are clearly wrong
- the action fails with no readable reason

## Step 5: Retrieve Opportunity

In `Org Browser`:
1. add `Opportunity` to the cart
2. click `Retrieve Selected`

Success cues:
- the retrieve completes
- the workspace shows:
  - alias
  - completed timestamp
  - parse path
  - metadata args
  - auto-refresh state
- the handoff state should read as ready, not blocked

Failure cues:
- retrieve succeeds but no handoff details appear
- the handoff is blocked even though alias, parse path, and metadata args are all present
- you must inspect raw JSON to understand whether the retrieve worked

## Step 6: Confirm Refresh & Build Handoff

In `Org Browser`:
1. click `Open Refresh & Build`

In `Refresh & Build`:
1. look at the `Latest retrieve context` card
2. look at the `Workflow state` chain

Success cues:
- the same retrieve details are visible here:
  - alias
  - completed timestamp
  - parse path
  - metadata args
  - auto-refresh state
- the handoff state is still ready
- the workflow chain reflects that the browser retrieve has happened

Failure cues:
- the retrieve details disappear after switching workspaces
- the handoff becomes blocked unexpectedly
- the UI implies the workflow is ready when required retrieve fields are missing

## What To Report Back

Reply with:

1. `Org Sessions`: pass or fail
2. `Org Browser catalog`: pass or fail
3. `CustomObject members`: pass or fail
4. `Retrieve Selected`: pass or fail
5. `Refresh & Build handoff`: pass or fail
6. the alias you used
7. the first failure you saw, if any

If something fails, also tell me:
- what workspace you were in
- what button/action you used
- the exact text of the visible error, if any

## If Build Fails Before The App Opens

Reply with the command that failed and the last 30 lines of terminal output.

## If The App Opens But The Workflow Fails

Stop at the first real failure and report it.

Do not work around it manually.

The point of this run is to prove whether the desktop workflow itself works.
