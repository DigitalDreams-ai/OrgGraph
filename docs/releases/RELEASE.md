# Release Notes And Evidence Record

Use this file as the canonical release evidence record for each packaged desktop candidate.

Canonical path reference:
- [Release Artifact Paths](./ARTIFACT_PATHS.md)
- [Release Checklist](./RELEASE_CHECKLIST.md)
- [Rollback Playbook](./ROLLBACK_PLAYBOOK.md)
- [Rollback Result Template](./ROLLBACK_RESULT_TEMPLATE.md)
- [Real Org Operator Proof Results](../planning/v2/REAL_ORG_OPERATOR_PROOF_RESULTS.md)
- [Clean Machine Operator Proof](../runbooks/CLEAN_MACHINE_OPERATOR_PROOF.md)

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
- Desktop executable path:
- Installer path used for validation:
- `readyStatus`:
- `relaunchVerified`:
- `metadataSearchStatus`:
- `metadataRetrieveStatus`:
- Smoke evidence captured by:

## Real-Org Operator Proof

- Quickstart runbook:
  - `docs/runbooks/REAL_ORG_DESKTOP_QUICKSTART.md`
- Operator:
- Machine:
- Alias:
- Candidate commit SHA:
- Connect proof:
- Browser retrieve proof:
- Refresh handoff proof:
- Ask proof:
- Proof ID:
- Replay token:
- Canonical proof-results entry:

## Clean-Machine Operator Proof

- Worksheet:
  - `docs/runbooks/CLEAN_MACHINE_OPERATOR_PROOF.md`
- Operator:
- Machine:
- Date:
- Candidate commit SHA:
- Alias:
- Desktop executable path:
- Installer path:
- Prior Orgumented runtime on this machine: yes/no
- `sf` available: yes/no
- `cci 4.5.0` available: yes/no
- Build completed: pass/fail
- Org Sessions connect result:
- Org Browser retrieve result:
- Refresh handoff result:
- Ask proof result:
- Ask query:
- Proof ID:
- Replay token:
- Canonical proof-results entry:
- Screenshot paths:
- Overall result:
- Blockers:

## Rollback Target

- Last known-good tag:
- Last known-good commit SHA:
- Last known-good installer/binary path:
- Last known-good smoke artifact:
- Rollback target recorded by:

## Rollback Validation

- Rollback executed: yes/no
- Rollback result record:
  - `docs/releases/ROLLBACK_RESULT_TEMPLATE.md`
- Failed release tag:
- Failed release commit SHA:
- Restored release tag:
- Restored release commit SHA:
- Rollback trigger reason:
- Restored desktop executable path:
- Restored installer path:
- Restored smoke JSON path:
- Restored smoke log path:
- Screenshot path showing restored ready state:
- Packaged runtime reached `ready`: yes/no
- Packaged relaunch reached `ready`: yes/no
- Metadata search/retrieve smoke status:
- Real-org quickstart recheck performed: yes/no
- Quickstart result:
- Rollback successful: yes/no
- Remaining blockers:

## Decision

- Release candidate approved: yes/no
- If no, blocker:
- If rollback executed, reason:

## Notes

- Additional operator findings:
- Follow-up defects:
