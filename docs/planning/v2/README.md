# Orgumented v2 Planning Set

Date: March 1, 2026
Status: active planning control surface

Purpose:
- compress the current planning sprawl into a smaller v2 control surface
- preserve the important decisions, risks, roadmap, and architecture direction
- give future work one place to start instead of many overlapping files

## File Set

1. `docs/planning/v2/ORGUMENTED_V2_STRATEGY.md`
- product wedge
- strategic stages
- commercial reality
- core claims and constraints

2. `docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md`
- target runtime model
- semantic stack boundaries
- build-vs-borrow direction
- key architectural laws

3. `docs/planning/v2/ORGUMENTED_V2_ROADMAP.md`
- stage and wave mapping
- near-term and later-phase sequencing
- current active priorities

4. `docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md`
- authoritative completion plan organized as `wave1`, `wave2`, ...
- full-scope sequencing across runtime, UX, quality, and release
- acceptance gates and branch/PR convention per wave

5. `docs/planning/v2/ORGUMENTED_V2_EXECUTION.md`
- current execution focus
- next major slices
- verification bar
- immediate planning and implementation sequence

6. `docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md`
- success gates
- kill-switches
- risk summary
- decision discipline

7. `docs/planning/v2/ORGUMENTED_V2_PIVOT_LOCK.md`
- locked no-restart execution decision
- mandatory wave order for Stage 1 closure
- objective module-rebuild/full-rebuild triggers

8. `docs/planning/v2/ORGUMENTED_V2_LEXICON.md`
- canonical terms
- wording discipline
- banned terms
- precision rules for trusted outputs

9. `docs/planning/v2/ORGUMENTED_V2_SOURCE_MAP.md`
- which older planning files informed this set
- where each topic was consolidated
- what remains historical/reference-only

10. `docs/planning/v2/ORGUMENTED_V2_MULTI_AGENT_OPERATING_MODEL.md`
- simplified agent operating model
- primary-agent-first execution
- optional verifier usage
- merge and replay gates

11. `docs/planning/v2/ORGUMENTED_V2_MULTI_AGENT_TASK_BOARD.md`
- lightweight execution board
- current-slice visibility
- optional verifier handoff
- merge-readiness notes

12. `docs/planning/v2/ORGUMENTED_V2_CODEX_MULTI_AGENT_RUNBOOK.md`
- Codex-native execution and handoff runbook
- primary and verifier session flow
- verification and recovery steps

13. `scripts/verify-worker-branch.ps1`
- verifier gate script
- structured pass/fail JSON output
- runs typecheck, tests, build, desktop smoke, replay parity, scope check

## Wave1 Baseline Artifacts

1. `docs/planning/v2/WAVE1_BACKLOG.md`
- deduplicated prioritized backlog with explicit wave assignment

2. `docs/planning/v2/WAVE1_DEFECT_MATRIX.md`
- severity-based defect ledger with wave ownership and verification gates

3. `docs/planning/v2/WAVE1_FEATURE_GAP_MATRIX.md`
- workflow capability gaps mapped to numbered waves and acceptance outcomes

## Reading Order

Recommended order:
1. `ORGUMENTED_V2_STRATEGY.md`
2. `ORGUMENTED_V2_ARCHITECTURE.md`
3. `ORGUMENTED_V2_ROADMAP.md`
4. `ORGUMENTED_V2_WAVES_100_PLAN.md`
5. `ORGUMENTED_V2_EXECUTION.md`
6. `ORGUMENTED_V2_GOVERNANCE.md`
7. `ORGUMENTED_V2_PIVOT_LOCK.md`
8. `ORGUMENTED_V2_LEXICON.md`
9. `ORGUMENTED_V2_MULTI_AGENT_OPERATING_MODEL.md`
10. `ORGUMENTED_V2_CODEX_MULTI_AGENT_RUNBOOK.md`
11. `ORGUMENTED_V2_SOURCE_MAP.md`

## Default Execution Mode

Default repo execution is now:
- one primary implementation agent
- one optional verifier agent
- one branch for one coherent slice
- one PR for one coherent slice

The older always-on coordinator/planner/workflow swarm is retired as the default because the coordination overhead outweighed the gain.

## Consolidation Intent

This v2 set is meant to absorb the important content from:
- strategy and positioning docs
- architecture and transition docs
- roadmap and 90-day planning docs
- risk and success-gate docs
- build-vs-borrow and inspiration-alignment docs

This set does not replace:
- slice-specific evaluation files under `docs/planning/v2/`
- archived source material kept under `docs/planning/archive/` for evidence, execution traceability, and historical context

## Current Position

Orgumented v2 is:
- a Windows-native desktop product
- Tauri shell + embedded Next UI + local Nest engine
- deterministic and proof-backed by default
- focused on trusted Salesforce change decision support first
- intentionally not a hosted web app
- intentionally not a generic AI copilot
- intentionally not a domain-agnostic context platform

## Source of Truth Rule

Use the v2 set for compact planning and decision direction.

Use archived planning files only when you need:
- detailed execution history,
- pre-v2 wave and DNA task tracking,
- branch-level proof artifacts,
- raw architectural evidence not carried forward into the v2 summaries.
