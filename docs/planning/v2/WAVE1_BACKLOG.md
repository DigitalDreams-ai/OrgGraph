# Wave1 Prioritized Backlog

Date: March 4, 2026  
Status: active  
Owner: core product execution

Purpose:
- one deduplicated backlog for remaining v2 work
- explicit wave assignment per item
- clear acceptance gate for each item

## Priority Legend

- `P0`: release blocker for Stage 1 trust/runtime integrity
- `P1`: critical workflow blocker for Stage 1 parity
- `P2`: major quality/usability gap with workaround
- `P3`: optimization/polish after parity

## Backlog

| ID | Priority | Area | Backlog Item | Target Wave | Acceptance Gate | Status |
|---|---|---|---|---|---|---|
| B001 | P0 | Runtime | Eliminate packaged bootstrap drift-budget startup failures for standard operator startup | Wave2 | Packaged app starts cleanly with deterministic bootstrap in smoke and manual launch | In Progress |
| B025 | P0 | Governance | Lock stabilization-first execution order and prevent architecture churn/restart drift | Wave11 | v2 planning set enforces no-restart policy, ordered wave sequence, and objective rebuild triggers | In Progress |
| B002 | P0 | Runtime | Ensure runtime unavailability never masquerades as missing `sf`/`cci` tools | Wave2 | Tool status and runtime status are always disambiguated in desktop UI | Complete |
| B003 | P0 | Determinism | Lock replay parity for high-risk query family after planner hardening | Wave6 | Replay parity assertions pass for repeated benchmark asks | Complete |
| B004 | P1 | Sessions | Make connect/switch/restore flows deterministic across restart cycles | Wave3 | Session history and restore behave identically after app relaunch | Complete |
| B005 | P1 | Sessions | Resolve CCI alias registry mismatch workflow (`alias not found`) with actionable next steps | Wave3 | Operator gets exact remediation path; no ambiguous warning-only dead end | Complete |
| B006 | P1 | Browser | Complete explorer-style metadata browsing with tree parity to expected org-browser mental model | Wave4 | Operator can browse families and members without type-first workflow | Complete |
| B007 | P1 | Browser | Ensure search-by-name returns predictable results when catalog is unseeded | Wave4 | Name search works with live metadata discovery and clear empty-state behavior | Complete |
| B026 | P1 | Browser | Remove fixed family ceiling and make family row expansion explicit/reliable in Org Browser | Wave11 | Browser lists full live metadata family catalog and every family row exposes unmistakable coverage state plus deterministic expand/load of nested items | In Progress |
| B008 | P1 | Refresh/Build | Make retrieve -> refresh -> diff -> org-retrieve handoff product-grade | Wave5 | End-to-end handoff works without raw JSON reliance | In Progress |
| B009 | P1 | Ask | Improve flow/object/field grounding quality for real metadata questions | Wave6 | No low-value generic fallback for grounded metadata asks | In Progress |
| B010 | P1 | Decision Packets | Raise packet usefulness for approval decisions (risk drivers, reads/writes, next actions) | Wave7 | Benchmark packet accepted as primary review artifact in runbook scenario | In Progress |
| B011 | P1 | Proofs/History | Complete label-first proof access; remove token-bookkeeping dependency from primary path | Wave9 | Operator can reopen and replay by label/history alone | In Progress |
| B012 | P1 | UX/Layout | Remove clipping/overflow/truncation defects across cards/rails/workspaces | Wave10 | No known clipping defects at supported desktop viewport targets | In Progress |
| B013 | P1 | Quality | Burn down all critical/high Stage 1 defects to zero | Wave11 | P0/P1 defect matrix count reaches zero and stays stable for one cycle | Open |
| B014 | P1 | Release | Finalize release checklist, rollback path, and operator machine validation | Wave12 | Release candidate checklist fully green with evidence artifacts | Open |
| B015 | P2 | Analyze | Deepen explain/analyze workflows to reduce raw JSON dependency | Wave8 | Core analyze tasks complete using structured cards/actions | In Progress |
| B016 | P2 | Diagnostics | Improve diagnostics readability and operator actionability under failure | Wave8 | Runtime/tool/semantic failure states map to direct operator actions | In Progress |
| B017 | P2 | Benchmark | Replace fixture-only benchmark narrative with stronger real-org scenario evidence | Wave7 | Real-org benchmark artifact set published and reproducible | In Progress |
| B018 | P2 | CI Cost | Continue reducing GitHub Actions minute burn without losing required trust gates | Wave11 | CI runtime reduced while validate + desktop smoke integrity remains intact; Actions storage bounded by retention automation | In Progress |
| B019 | P2 | Docs | Consolidate runbooks to explicit, assumption-free operator steps | Wave12 | New operator runbooks pass first-run validation by non-author operator | In Progress |
| B020 | P2 | Accessibility | Keyboard/focus/accessibility baseline for high-value workflows | Wave10 | Accessibility checks pass for Ask, Sessions, Browser, Refresh | In Progress |
| B021 | P3 | Design System | Harmonize spacing, typography hierarchy, and density rhythm across workspaces | Wave10 | Visual consistency checklist passes for all Stage 1 workspaces | Open |
| B022 | P3 | Telemetry | Add structured non-sensitive runtime telemetry for diagnostics correlation | Wave8 | Failure signatures and timings are traceable without exposing secrets | Open |
| B023 | P3 | Automation | Expand deterministic test corpus for edge metadata families | Wave11 | Regression corpus includes expanded metadata family scenarios | Open |
| B024 | P3 | Stabilization | Post-release hotfix/stabilization window before Stage 2 expansion | Wave13 | No unresolved P0/P1 within stabilization window | Open |

## Wave1 Completion Criteria

Wave1 is complete when:

1. Backlog items are deduplicated and wave-assigned.
2. Defect and feature-gap matrices exist and are linked from v2 README.
3. At least one `P0` item is selected for immediate Wave2 execution.
