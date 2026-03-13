import assert from 'node:assert/strict';
import test from 'node:test';

import { findReleaseEvidenceIssues, parseReleaseEvidence } from './release-evidence-check.mjs';

const passingDocument = `
# Release Notes And Evidence Record

## Release Identity

- Version: 0.1.0
- Tag: v0.1.0
- Commit SHA: abc1234
- Date: 2026-03-12
- Operator: release-engineer

## Validation Summary

- \`pnpm --filter api test\`: pass
- \`pnpm --filter web typecheck\`: pass
- \`pnpm --filter web build\`: pass
- \`pnpm desktop:info\`: pass
- \`pnpm desktop:build\`: pass
- \`pnpm desktop:smoke:release\`: pass

## Smoke Evidence

- Smoke artifact JSON: logs/desktop-release-smoke-20260312.json
- Smoke artifact log: logs/desktop-release-smoke.20260312.log
- Desktop executable path: apps/desktop/src-tauri/target/release/orgumented-desktop.exe
- Installer path used for validation: apps/desktop/src-tauri/target/release/bundle/nsis/Orgumented_0.1.0_x64-setup.exe
- \`readyStatus\`: verified
- \`relaunchVerified\`: true
- \`metadataSearchStatus\`: verified
- \`metadataRetrieveStatus\`: verified
- Smoke evidence captured by: release-engineer

## Real-Org Operator Proof

- Quickstart runbook:
- Operator: operator-a
- Machine: qa-01
- Alias: shulman-uat
- Candidate commit SHA: abc1234
- Connect proof: screenshot-1.png
- Browser retrieve proof: screenshot-2.png
- Refresh handoff proof: screenshot-3.png
- Ask proof: screenshot-4.png
- Proof ID: proof_123
- Replay token: trace_123
- Canonical proof-results entry: docs/planning/v2/REAL_ORG_OPERATOR_PROOF_RESULTS.md#candidate-001

## Clean-Machine Operator Proof

- Worksheet:
- Operator: operator-b
- Machine: clean-01
- Date: 2026-03-12
- Candidate commit SHA: abc1234
- Alias: shulman-uat
- Desktop executable path: apps/desktop/src-tauri/target/release/orgumented-desktop.exe
- Installer path: apps/desktop/src-tauri/target/release/bundle/nsis/Orgumented_0.1.0_x64-setup.exe
- Prior Orgumented runtime on this machine: no
- \`sf\` available: yes
- \`cci 4.5.0\` available: yes
- Build completed: pass
- Org Sessions connect result: pass
- Org Browser retrieve result: pass
- Refresh handoff result: pass
- Ask proof result: pass
- Ask query: Based only on the latest retrieve, explain what Flow Civil_Rights_Intake_Questionnaire reads and writes.
- Proof ID: proof_456
- Replay token: trace_456
- Canonical proof-results entry: docs/planning/v2/REAL_ORG_OPERATOR_PROOF_RESULTS.md#clean-machine-001
- Screenshot paths: screenshots/connect.png; screenshots/browser.png
- Overall result: pass
- Blockers:

## Rollback Target

- Last known-good tag: v0.0.9
- Last known-good commit SHA: def5678
- Last known-good installer/binary path: installers/v0.0.9/Orgumented_0.0.9_x64-setup.exe
- Last known-good smoke artifact: logs/v0.0.9/desktop-release-smoke.json
- Rollback target recorded by: release-engineer

## Rollback Validation

- Rollback executed: no
- Rollback result record:
- Failed release tag: v0.1.0-rc1
- Failed release commit SHA: abc1234
- Restored release tag: v0.0.9
- Restored release commit SHA: def5678
- Rollback trigger reason: release candidate validation
- Restored desktop executable path: apps/desktop/src-tauri/target/release/orgumented-desktop.exe
- Restored installer path: installers/v0.0.9/Orgumented_0.0.9_x64-setup.exe
- Restored smoke JSON path: logs/v0.0.9/desktop-release-smoke.json
- Restored smoke log path: logs/v0.0.9/desktop-release-smoke.log
- Screenshot path showing restored ready state: screenshots/restored-ready.png
- Packaged runtime reached \`ready\`: yes
- Packaged relaunch reached \`ready\`: yes
- Metadata search/retrieve smoke status: explicit skip on disconnected rollback validation
- Real-org quickstart recheck performed: no
- Quickstart result: not rerun during rollback validation
- Rollback successful: yes
- Remaining blockers:

## Decision

- Release candidate approved: yes
- If no, blocker:
- If rollback executed, reason:
`;

test('parseReleaseEvidence indexes fields by section and label', () => {
  const sections = parseReleaseEvidence(passingDocument);
  assert.equal(sections.get('Release Identity')?.get('Version'), '0.1.0');
  assert.equal(sections.get('Smoke Evidence')?.get('`readyStatus`'), 'verified');
});

test('findReleaseEvidenceIssues passes for a fully populated evidence record', () => {
  assert.deepEqual(findReleaseEvidenceIssues(passingDocument), []);
});

test('findReleaseEvidenceIssues reports blank and placeholder values', () => {
  const failingDocument = passingDocument
    .replace('- Version: 0.1.0', '- Version:')
    .replace('- Release candidate approved: yes', '- Release candidate approved: yes/no');

  const issues = findReleaseEvidenceIssues(failingDocument);
  assert.match(issues.join('\n'), /Release Identity -> Version: missing field/);
  assert.match(issues.join('\n'), /Decision -> Release candidate approved: unresolved placeholder \(yes\/no\)/);
});
