# Real Org Desktop Quickstart

Use this runbook to validate real-org connect, browser retrieve, and Ask workflow in the packaged desktop app.

Scope:
- Windows desktop app (Tauri packaged runtime)
- Real Salesforce alias from local `sf` keychain
- Org Browser cart retrieve flow
- Ask response grounded in latest retrieve

This runbook uses Git Bash only.

## 0) Prerequisites

You need:
- Windows machine
- Git Bash
- Node 22+
- pnpm 9.12.3+
- Salesforce CLI (`sf`)
- CumulusCI (`cci`) pinned to `4.5.0`
- an authenticated alias (example: `shulman-uat`)

## 1) Commands You Must Run (Git Bash)

Run each command in order.

Command 1:
```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
```

Command 2:
```bash
git pull --ff-only
```

Command 3:
```bash
node --version
pnpm --version
sf --version
cci version
```

Command 4:
```bash
pnpm --reporter=append-only --loglevel=info install --frozen-lockfile
```

Command 5:
```bash
pnpm --reporter=append-only --loglevel=info desktop:build
```

Command 6:
```bash
./apps/desktop/src-tauri/target/release/orgumented-desktop.exe
```

Expected result after Command 6:
- Orgumented desktop window opens
- top status cards show `API READY: ready` and `ORG SESSION: connected` after refresh/connect steps below

## 2) Connect Real Alias In Org Sessions

Inside Orgumented:
1. Open `Org Sessions` in left workspace rail.
2. In `Selected Alias`, enter your alias (example: `shulman-uat`).
3. Click `Refresh Overview`.
4. Confirm:
   - `sf CLI: installed`
   - `CCI: installed`
5. Click `Attach Selected Alias`.

Expected result:
- `Session: connected`
- alias and username fields populated
- no red runtime/tooling failure banner

If connect fails:
1. Return to Git Bash and run:
```bash
sf org list --all --json
sf org display --target-org shulman-uat --json
```
2. Re-open Orgumented and retry `Refresh Overview` then `Attach Selected Alias`.

## 3) Browse And Retrieve Metadata (Org Browser)

Inside Orgumented:
1. Open `Org Browser`.
2. Check the `Catalog coverage` badge in the top browser card.
3. If it shows `limited`, read the discovery warning text before assuming the list is full-org coverage.
4. In `Search Org Files And Metadata`, type:
   - `Opportunity`
5. Click `Search`.
6. Wait for matching family rows to appear.
7. Click `Expand` on the family row you want. This loads the actual child tree for that family.
8. Use checkboxes next to the family, folder, or item(s) you want.
9. Click `Retrieve Cart`.

Expected result:
- retrieve succeeds
- cart summary updates
- no empty-selection failure

If you get no results:
1. Click `Load All Families`.
2. Click `Load Visible Items`.
3. Click `Expand` on a family row to open nested members, then select via checkbox.
4. If `Catalog coverage` still shows `limited`, review the discovery warnings before treating the visible list as complete org inventory.
5. Click `Retrieve Cart` again.

## 4) Verify Handoff In Refresh & Build

Inside Orgumented:
1. Click `Open Refresh & Build` from Org Browser (or switch to `Refresh & Build` in rail).
2. Confirm retrieve handoff card shows selected metadata summary.
3. Click `Run Refresh` once.
4. Confirm `From Snapshot ID` and `To Snapshot ID` auto-fill.
5. Click `Run Diff`.
6. (Optional) Click `Run Org Retrieve` if you want to execute auth/retrieve/refresh from this workspace.

Expected result:
- handoff state is visible without opening raw JSON
- staged flow is not blocked by missing selections
- Diff remains disabled until both snapshot IDs are present and different

## 5) Ask A Retrieved-Metadata Question

Inside Orgumented `Ask` workspace:
1. In `Latest retrieve`, use one of the generated chips under:
   - `Grounded prompts from latest retrieve`
   - or `Follow-up prompts from retrieved items`
2. If you want to test the explicit Flow path, use this exact question:
   - `Based only on the latest retrieve, explain what Flow Civil_Rights_Intake_Questionnaire reads and writes.`
3. Click `Run Ask`.
4. Confirm:
   - decision packet is populated
   - citations list includes retrieved files
   - proof ID and replay token are present

## 6) Save Evidence

Capture:
- screenshot of `Org Sessions` connected state
- screenshot of `Org Browser` with selected/retrieved items
- screenshot of Ask response with citations/proof metadata

Record:
- alias used
- retrieve query used
- question asked
- proof ID
- replay token
- pass/fail per section above

## 7) Failure Triage Commands (Git Bash)

Run if the desktop workflow fails.

```bash
cd /c/Users/sean/Projects/GitHub/OrgGraph
pnpm --reporter=append-only --loglevel=info desktop:info
curl -sS http://127.0.0.1:3100/ready
curl -sS http://127.0.0.1:3100/org/status
curl -sS http://127.0.0.1:3100/org/preflight
```

If `cci` path/registry is stale:
```bash
cci org list
```

If alias auth is stale:
```bash
sf org login web --alias shulman-uat --instance-url https://test.salesforce.com
```

Then reopen Orgumented and repeat section 2.
