# Real Org Desktop Quickstart

Use this runbook to validate real-org connect, browser retrieve, and Ask workflow in the packaged desktop app.

Scope:
- Windows desktop app (Tauri packaged runtime)
- Real Salesforce alias from local `sf` keychain
- Org Browser cart retrieve flow
- Ask response grounded in latest retrieve for supported Flow, field-impact, object/automation, and bounded metadata-component usage prompts

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
cd /c/Users/sean/Projects/GitHub/Orgumented
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
4. If the family list is too broad, use `Filter Metadata Families` to narrow the explorer without changing the retrieve cart.
5. In `Search Org Files And Metadata`, type:
   - `Opportunity`
6. Click `Search`.
7. Wait for matching family rows to appear.
8. Click `Load & Expand` on the family row you want. The triangle does the same thing if you prefer the tree control.
9. Use checkboxes next to the family, folder, or item(s) you want.
10. Click `Retrieve Cart`.

Expected result:
- retrieve succeeds
- cart summary updates
- no empty-selection failure

If you get no results:
1. Click `Load Full Family Catalog`.
2. Click `Load Visible Children`.
3. Click `Expand Visible Families` if you want every currently visible family row opened in one pass.
4. Click `Load & Expand` on a family row, or use the triangle, to open nested members. Then select via checkbox.
5. If `Catalog coverage` still shows `limited`, review the discovery warnings before treating the visible list as complete org inventory.
6. Click `Retrieve Cart` again.

## 4) Verify Handoff In Refresh & Build

Inside Orgumented:
1. Click `Open Refresh & Build` from Org Browser (or switch to `Refresh & Build` in rail).
2. Confirm the `Staged workflow` card shows:
   - `1. Retrieve Cart` as `complete`
   - your staged metadata scope
   - a `Next action` telling you to refresh semantic state
3. Click `Refresh Semantic State` once.
4. Confirm stage `2. Refresh Semantic State` turns `complete`.
5. Confirm `From Snapshot ID` and `To Snapshot ID` auto-fill when two refresh snapshots are available.
6. Click `Compare Snapshot Drift`.
7. (Optional) Click `Run Org Pipeline` if you want to execute auth/retrieve/refresh from this workspace.

Expected result:
- handoff state is visible without opening raw JSON
- staged flow shows a numbered operator sequence
- each stage tells you the exact next action when blocked, waiting, or stale
- Compare Snapshot Drift remains disabled until both snapshot IDs are present and different

## 5) Ask A Retrieved-Metadata Question

Inside Orgumented `Ask` workspace:
1. In `Latest retrieve`, use one of the generated chips under:
   - `Grounded prompts from latest retrieve`
   - or `Follow-up prompts from retrieved items`
2. For strict latest-retrieve-only behavior, use one of these supported prompt shapes:
   - `Based only on the latest retrieve, explain what Flow Civil_Rights_Intake_Questionnaire reads and writes.`
   - `Based only on the latest retrieve, what touches Opportunity.StageName?`
   - `Based only on the latest retrieve, what automations update Opportunity.StageName?`
   - `Based only on the latest retrieve, what runs on object Opportunity?`
   - `Based only on the latest retrieve, where is Flow Civil_Rights_Intake_Questionnaire used?`
   - `Based only on the latest retrieve, where is Flow called "Civil_Rights_Intake_Questionnaire" used?`
3. Use this exact Flow question first:
   - `Based only on the latest retrieve, explain what Flow Civil_Rights_Intake_Questionnaire reads and writes.`
4. Click `Run Ask`.
5. Confirm:
   - decision packet is populated
   - citations list includes retrieved files
   - proof ID and replay token are present
6. Then test one field/object grounded prompt from the same retrieve:
   - `Based only on the latest retrieve, what touches Opportunity.StageName?`
   - or `Based only on the latest retrieve, what runs on object Opportunity?`
7. Then test one bounded component-usage prompt from the same retrieve:
   - `Based only on the latest retrieve, where is Flow Civil_Rights_Intake_Questionnaire used?`
   - or `Based only on the latest retrieve, where is Flow called "Civil_Rights_Intake_Questionnaire" used?`
   - or, if you retrieved another supported family, `Based only on the latest retrieve, where is Layout <layout-name> used?`
8. If you intentionally ask a different `Based only on the latest retrieve ...` question outside the supported Flow read/write, explicit retrieved field/object impact/automation, or bounded metadata-component usage shapes, expect a fail-closed refusal instead of a misleading unconstrained answer.

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
cd /c/Users/sean/Projects/GitHub/Orgumented
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

