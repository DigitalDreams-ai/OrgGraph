# Rollback Result Template

Use this template after executing [Rollback Playbook](./ROLLBACK_PLAYBOOK.md).

Copy the completed block into the active release evidence record.

```md
## Rollback Validation

- Failed release tag:
- Failed release commit SHA:
- Restored release tag:
- Restored release commit SHA:
- Operator:
- Date:
- Trigger reason:

### Artifact Paths

- Restored desktop executable path:
- Restored installer path:
- Restored smoke JSON path:
- Restored smoke log path:
- Screenshot path showing restored ready state:

### Validation Result

- Packaged runtime reached `ready`: yes/no
- Packaged relaunch reached `ready`: yes/no
- Metadata search/retrieve smoke status:
- Real-org quickstart recheck performed: yes/no
- Quickstart result:

### Outcome

- Rollback successful: yes/no
- Remaining blockers:
- Follow-up fix branch:
- Notes:
```
