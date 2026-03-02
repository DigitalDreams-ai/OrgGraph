# Orgumented v2 Multi-Agent Task Board

Date: March 2, 2026
Status: active coordination board

## Team Shape

- Coordinator: `orgumented-coordinator`
- Worker 1: `orgumented-worker-planner`
- Worker 2: `orgumented-worker-workflow`

## Coordination Rules

- one branch per worker
- one worktree per worker
- no shared worktree edits
- no overlapping replay-sensitive files
- merge order is controlled by the coordinator

## Worktree Layout

| Role | Worktree | Branch | Status |
| --- | --- | --- | --- |
| coordinator | `..\\org-coord` | `dna-coordination-*` | idle |
| planner worker | `..\\org-pla` | `dna-planner-*` | idle |
| workflow worker | `..\\org-ui` | `dna-workflow-*` | idle |

## Active Assignment Template

### Coordinator

- branch:
- worktree:
- active focus:
- merge order note:

### Planner Worker

- branch:
- worktree:
- slice:
- likely files:
- required checks:
- dependency note:

### Workflow Worker

- branch:
- worktree:
- slice:
- likely files:
- required checks:
- dependency note:

## Merge Gate Checklist

- scope remains Stage 1
- replay parity not regressed
- proof identity not regressed
- UI owns no business or policy logic
- packaged desktop parity preserved
- docs updated if behavior changed

## Current Default Merge Order

1. runtime and CI prerequisites
2. planner worker branch
3. workflow worker branch
4. evidence and benchmark follow-ons
