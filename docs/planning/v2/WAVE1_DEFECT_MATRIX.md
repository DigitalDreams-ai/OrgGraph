# Wave1 Defect Matrix

Date: March 4, 2026  
Status: active triage baseline

Purpose:
- single defect ledger for Stage 1 and v2 completion
- severity-based prioritization
- clear wave ownership and verification gate

## Severity

- `S0`: deterministic/replay/safety breach
- `S1`: critical runtime/workflow blocker
- `S2`: major usability/quality issue
- `S3`: minor polish issue

## Defect Matrix

| Defect ID | Severity | Workspace | Symptom | Likely Root Cause | Owner Wave | Verification Gate | Status |
|---|---|---|---|---|---|---|---|
| D001 | S1 | Packaged Runtime | App can fail at startup with semantic drift budget exception in local operator flow | Bootstrap fixture/graph state mismatch and strict drift threshold handling at startup | Wave2 | `pnpm desktop:smoke:release` + manual packaged launch | In Progress |
| D002 | S1 | Org Sessions | Runtime-unavailable condition can appear to operator as missing local tools | Status-path mixing between runtime readiness and toolchain checks | Wave2 | Session/diagnostic UI assertions + smoke | Open |
| D003 | S1 | Org Sessions | `cci` alias warning (`alias not found`) lacks guided remediation path | Alias registry bridge and UX guidance gaps | Wave3 | Real-org connect/switch/preflight workflow proof | Open |
| D004 | S1 | Org Browser | Name search returns empty with low guidance in some unseeded states | Catalog seeding/discovery timing and empty-state UX | Wave4 | Browser real-org search and retrieval runbook pass | Open |
| D005 | S1 | Browser -> Refresh | Retrieve handoff readiness can remain ambiguous to operators | Incomplete handoff state rendering for parse path/args/readiness | Wave5 | End-to-end retrieve -> refresh -> diff scenario | Open |
| D006 | S1 | Ask Planner | Certain metadata-specific questions still degrade to weak generic answers | Shallow intent/entity grounding for complex metadata phrasing | Wave6 | Planner + integration + replay tests on targeted families | Open |
| D007 | S1 | Decision Packet | Packet can be technically valid but operationally weak for approval decisions | Risk/action synthesis quality and confidence explanation depth | Wave7 | High-risk review benchmark packet acceptance | Open |
| D008 | S2 | Ask/Analyze UI | Long values (paths, ids, snippets) can still clip or overflow in dense cards | Incomplete layout constraints/wrapping rules | Wave10 | Visual QA checklist on all workspaces | Open |
| D009 | S2 | Proofs & History | History-first workflow still not universal; token fallback still appears in operator mental model | Partial productization of label-first history | Wave9 | History reopen/replay/export acceptance tests | Open |
| D010 | S2 | Diagnostics | Raw JSON can still dominate certain troubleshooting flows | Missing high-level structured diagnostic synthesis in edge states | Wave8 | Structured diagnostics workflow tests | Open |
| D011 | S2 | Runbooks | Operator instructions have had ambiguity in shell/command usage and expected cues | Documentation drift and fragmented runbook ownership | Wave12 | First-run operator validation checklist | Open |
| D012 | S2 | CI Throughput | CI checks can consume high minutes and delay iteration | Redundant or heavy jobs without selective optimization | Wave11 | CI duration baseline vs optimized target | Open |
| D013 | S3 | Design Consistency | Visual hierarchy and spacing can vary across workspace cards | Incremental UI evolution without unified design pass | Wave10 | Design consistency checklist pass | Open |
| D014 | S3 | Accessibility | Keyboard/focus behavior incomplete across some controls | Accessibility hardening not yet run end-to-end | Wave10 | Accessibility pass for core flows | Open |

## Defect Exit Criteria

- `S0`: zero tolerated at all times.
- `S1`: zero by end of Wave11.
- `S2`: zero unresolved blockers by end of Wave12.
- `S3`: either resolved or explicitly accepted for post-100 stabilization with rationale.
