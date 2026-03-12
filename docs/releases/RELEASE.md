# Release Notes

Use this file as the release evidence template for each packaged desktop candidate.

## Release Identity

- Version:
- Tag:
- Commit SHA:
- Date:
- Operator:

## Candidate Scope

- Summary of included slices:
- Notable risk areas:

## Validation Summary

- `pnpm --filter api test`:
- `pnpm --filter web typecheck`:
- `pnpm --filter web build`:
- `pnpm desktop:info`:
- `pnpm desktop:build`:
- `pnpm desktop:smoke:release`:

## Smoke Evidence

- Smoke artifact JSON:
- Smoke artifact log:
- `readyStatus`:
- `relaunchVerified`:
- `metadataSearchStatus`:
- `metadataRetrieveStatus`:

## Real-Org Operator Proof

- Quickstart runbook:
  - `docs/runbooks/REAL_ORG_DESKTOP_QUICKSTART.md`
- Operator:
- Alias:
- Connect proof:
- Browser retrieve proof:
- Refresh handoff proof:
- Ask proof:
- Proof ID:
- Replay token:

## Rollback Target

- Last known-good tag:
- Last known-good commit SHA:
- Last known-good installer/binary path:
- Last known-good smoke artifact:

## Decision

- Release candidate approved: yes/no
- If no, blocker:
- If rollback executed, reason:

## Notes

- Additional operator findings:
- Follow-up defects:
