# Real Org Operator Proof Results

Date: March 5, 2026  
Status: partial pass (operator-machine pass complete; clean-machine pass still pending)

Reference runbook:
- `docs/runbooks/REAL_ORG_DESKTOP_QUICKSTART.md`

## Operator Evidence Snapshot

- Operator: Sean
- Alias: `shulman-uat`
- Runtime:
  - `API HEALTH: ok`
  - `API READY: ready`
  - `ORG SESSION: connected`
  - `ASK TRUST: trusted`
- Toolchain:
  - `sf CLI: installed`
  - `CCI: installed`
  - `CCI pinned: true (4.5.0)`

## Workflow Checks

1. Org Sessions connect and readiness:
- Result: pass
- Evidence:
  - session connected
  - selected alias is active
  - browser seeded true
  - session connected true

2. Org Browser search + selection cart + retrieve:
- Result: pass
- Evidence:
  - search term: `Opportunity`
  - cart shows selected families/items
  - retrieve handoff status complete/ready
  - metadata args captured (`Flow`, `CustomField`)

3. Retrieve handoff visibility into rebuild workflow:
- Result: pass
- Evidence:
  - `Last Retrieve` card shows completed + handoff ready
  - parse path and refresh counts shown without raw JSON dependency

4. Ask grounded flow read/write response:
- Result: pass
- Query:
  - `Based only on the latest retrieve, explain what Flow Civil_Rights_Intake_Questionnaire reads and writes.`
- Evidence:
  - Ask Snapshot: `Flow Civil_Rights_Intake_Questionnaire read/write summary grounded by 5 citation(s).`
  - Trust: `trusted`
  - Confidence: `0.79`
  - Proof ID: `proof_6191da2051e9b10b25c3bd11`
  - Replay Token: `trace_607a628baaef3350d991dd0`

5. Ask grounded flow read/write response with `Flow called` phrasing:
- Result: pass
- Query:
  - `Based only on the latest retrieve, explain what Flow called Civil_Rights_Intake_Questionnaire reads and writes`
- Evidence:
  - Ask Snapshot: `Flow Civil_Rights_Intake_Questionnaire read/write summary grounded by 5 citation(s).`
  - Trust: `trusted`
  - Confidence: `0.79`
  - Proof ID: `proof_304775e3d852eecdde28ebe1`
  - Replay Token: `trace_d7725382d02a5fcf02b91b20`

## Gate Impact

- Wave12 runbook/operator-proof gate:
  - operator-machine validation: complete
  - clean-machine validation: pending

- Wave6 flow-grounding regression check:
  - no generic fallback (`no automation found for the`) observed in this operator run
  - grounded flow summary returned with trusted envelope for both direct flow-name and `Flow called` phrasing

## Next Required Validation

To close Wave12 release-readiness evidence fully:
1. run the same quickstart on a clean machine
2. capture equivalent artifacts (connect, browser/retrieve/handoff, Ask proof/replay)
3. append results to this file

## Clean Machine Proof Template

Use:
- `docs/runbooks/CLEAN_MACHINE_OPERATOR_PROOF.md`

Append the completed result below this heading after the non-author operator run is finished.

```md
## Clean Machine Proof

- Operator:
- Machine:
- Date:
- Candidate commit SHA:
- Alias:
- Prior Orgumented runtime on this machine: yes/no

### Tooling Check

- `sf` available: yes/no
- `cci 4.5.0` available: yes/no
- Build completed: pass/fail

### Workflow Check

1. Org Sessions connect:
- Result:
- Evidence:

2. Org Browser retrieve:
- Result:
- Evidence:

3. Refresh handoff:
- Result:
- Evidence:

4. Ask proof:
- Result:
- Query:
- Proof ID:
- Replay Token:
- Evidence:

### Overall Result

- Pass/fail:
- Blockers:
- Notes:
```
