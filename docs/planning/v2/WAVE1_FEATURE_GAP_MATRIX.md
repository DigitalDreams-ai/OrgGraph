# Wave1 Feature Gap Matrix

Date: March 4, 2026  
Status: active

Purpose:
- capture missing or incomplete v2 capabilities by workflow
- map every gap to a numbered wave
- make acceptance outcomes explicit

## Feature Gaps

| Gap ID | Workflow | Missing Capability | Why It Matters | Target Wave | Acceptance Outcome | Status |
|---|---|---|---|---|---|---|
| G001 | Runtime | Fully converged packaged and local behavior contract | Prevent hidden regression between dev and operator runtime | Wave2 | No known packaged vs local behavioral divergence for core paths | In Progress |
| G002 | Runtime | Deterministic bootstrap resilience for real-org operator startup | Operators must not hit startup abort loops | Wave2 | Startup consistently reaches ready state under supported baseline | In Progress |
| G003 | Org Sessions | Robust connect/switch/restore state machine | Session flow is foundational for all org workflows | Wave3 | Connect/switch/restore/disconnect validated end-to-end | In Progress |
| G004 | Org Sessions | Actionable remediation for tool/auth/session/preflight failures | Reduces operator confusion and support burden | Wave3 | Every failure state includes direct next action | In Progress |
| G005 | Org Browser | True explorer-style browsing by names and families | Matches expected org-browser mental model | Wave4 | User can browse and search by real metadata names | In Progress |
| G006 | Org Browser | Deterministic checkbox selection model across search and browse | Reduces interaction ambiguity and retrieval errors | Wave4 | Single selection model works in all browser states | In Progress |
| G007 | Browser + Refresh | First-class retrieve handoff workflow | Retrieval must flow directly into rebuild/compare actions | Wave5 | Retrieve handoff visible, valid, and executable without JSON | In Progress |
| G008 | Refresh & Build | Product-grade staged workflow with clear summaries | Core operator workflow for semantic rebuild and drift review | Wave5 | Rebuild/diff/retrieve path is clear and repeatable | In Progress |
| G009 | Ask Planner | Deep typed query planning beyond regex-heavy routing | Needed for trust, accuracy, and Stage 1 credibility | Wave6 | Planner accuracy improvement proven on target query families | In Progress |
| G010 | Ask Planner | Strong metadata intent grounding (flow/object/field/action) | Avoids generic or misleading answers | Wave6 | Metadata-specific asks consistently grounded to evidence | In Progress |
| G011 | Decision Packets | High-value approval-ready packet quality | Packets must be operational artifacts, not demos | Wave7 | Benchmark packet accepted in review workflow test | In Progress |
| G012 | Decision Packets | Better reads/writes/change-impact synthesis for retrieved metadata | Enables admin/dev practical impact analysis | Wave7 | Packet includes consistent reads/writes/impact narrative | In Progress |
| G013 | Explain & Analyze | Structured operator flows for permissions/automation/impact/map | Reduces dependency on raw JSON inspection | Wave8 | Core analysis tasks complete via primary UI cards | In Progress |
| G014 | Diagnostics | Structured diagnostics triage for runtime/tool/semantic issues | Faster and safer incident triage | Wave8 | Diagnostics cards provide actionable triage paths | In Progress |
| G015 | Proofs & History | Label-first proof/replay lifecycle completion | Supports auditability and team collaboration | Wave9 | History-first proof operations are complete and stable | In Progress |
| G016 | Design/Layout | Cross-workspace visual and layout consistency | Improves reliability, readability, and trust | Wave10 | Layout/design checklist green across all workspaces | In Progress |
| G017 | Accessibility | Keyboard and focus compliance for core operations | Required quality baseline for production usage | Wave10 | Accessibility checks pass for critical workflows | Open |
| G018 | Quality | Zero critical/high defect state with regression protection | Required for production confidence | Wave11 | Critical/high defect count reaches zero with test lock | Open |
| G019 | CI/Release | Efficient but strict CI gate architecture | Maintains safety while controlling iteration cost | Wave11 | CI optimization delivered without gate reduction | In Progress |
| G020 | Runbooks | Assumption-free operator quickstart + troubleshooting | Enables repeatable onboarding and field usage | Wave12 | Runbooks validated by clean-machine operator run | In Progress |
| G021 | Release Ops | Release and rollback discipline for packaged desktop | Reduces production deployment risk | Wave12 | Release checklist and rollback proof complete | Open |
| G022 | Stabilization | Post-release hotfix window before Stage 2 expansion | Protects quality and trust before scope growth | Wave13 | Stabilization exit criteria satisfied | Open |
| G023 | Governance | Locked no-restart execution policy with objective rebuild triggers | Prevents churn and preserves progress toward Stage 1 gates | Wave11 | Pivot-lock rules are codified and used as active execution policy | In Progress |

## Mapping Rule

Every new gap discovered after Wave1 must include:

1. A new `Gap ID`.
2. Severity/impact note in `WAVE1_DEFECT_MATRIX.md` if defect-driven.
3. Explicit target wave in this matrix.
4. Acceptance outcome and verification gate.
