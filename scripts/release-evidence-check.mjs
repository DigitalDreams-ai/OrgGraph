import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REQUIRED_FIELDS = [
  ['Release Identity', 'Version'],
  ['Release Identity', 'Tag'],
  ['Release Identity', 'Commit SHA'],
  ['Release Identity', 'Date'],
  ['Release Identity', 'Operator'],
  ['Validation Summary', '`pnpm --filter api test`'],
  ['Validation Summary', '`pnpm --filter web typecheck`'],
  ['Validation Summary', '`pnpm --filter web build`'],
  ['Validation Summary', '`pnpm desktop:info`'],
  ['Validation Summary', '`pnpm desktop:build`'],
  ['Validation Summary', '`pnpm desktop:smoke:release`'],
  ['Smoke Evidence', 'Smoke artifact JSON'],
  ['Smoke Evidence', 'Smoke artifact log'],
  ['Smoke Evidence', 'Desktop executable path'],
  ['Smoke Evidence', 'Installer path used for validation'],
  ['Smoke Evidence', '`readyStatus`'],
  ['Smoke Evidence', '`relaunchVerified`'],
  ['Smoke Evidence', '`metadataSearchStatus`'],
  ['Smoke Evidence', '`metadataRetrieveStatus`'],
  ['Smoke Evidence', 'Smoke evidence captured by'],
  ['Real-Org Operator Proof', 'Operator'],
  ['Real-Org Operator Proof', 'Machine'],
  ['Real-Org Operator Proof', 'Alias'],
  ['Real-Org Operator Proof', 'Candidate commit SHA'],
  ['Real-Org Operator Proof', 'Connect proof'],
  ['Real-Org Operator Proof', 'Browser retrieve proof'],
  ['Real-Org Operator Proof', 'Refresh handoff proof'],
  ['Real-Org Operator Proof', 'Ask proof'],
  ['Real-Org Operator Proof', 'Proof ID'],
  ['Real-Org Operator Proof', 'Replay token'],
  ['Real-Org Operator Proof', 'Canonical proof-results entry'],
  ['Clean-Machine Operator Proof', 'Operator'],
  ['Clean-Machine Operator Proof', 'Machine'],
  ['Clean-Machine Operator Proof', 'Date'],
  ['Clean-Machine Operator Proof', 'Candidate commit SHA'],
  ['Clean-Machine Operator Proof', 'Alias'],
  ['Clean-Machine Operator Proof', 'Desktop executable path'],
  ['Clean-Machine Operator Proof', 'Installer path'],
  ['Clean-Machine Operator Proof', 'Prior Orgumented runtime on this machine'],
  ['Clean-Machine Operator Proof', '`sf` available'],
  ['Clean-Machine Operator Proof', '`cci 4.5.0` available'],
  ['Clean-Machine Operator Proof', 'Build completed'],
  ['Clean-Machine Operator Proof', 'Org Sessions connect result'],
  ['Clean-Machine Operator Proof', 'Org Browser retrieve result'],
  ['Clean-Machine Operator Proof', 'Refresh handoff result'],
  ['Clean-Machine Operator Proof', 'Ask proof result'],
  ['Clean-Machine Operator Proof', 'Ask query'],
  ['Clean-Machine Operator Proof', 'Proof ID'],
  ['Clean-Machine Operator Proof', 'Replay token'],
  ['Clean-Machine Operator Proof', 'Canonical proof-results entry'],
  ['Clean-Machine Operator Proof', 'Screenshot paths'],
  ['Clean-Machine Operator Proof', 'Overall result'],
  ['Rollback Target', 'Last known-good tag'],
  ['Rollback Target', 'Last known-good commit SHA'],
  ['Rollback Target', 'Last known-good installer/binary path'],
  ['Rollback Target', 'Last known-good smoke artifact'],
  ['Rollback Target', 'Rollback target recorded by'],
  ['Rollback Validation', 'Rollback executed'],
  ['Rollback Validation', 'Failed release tag'],
  ['Rollback Validation', 'Failed release commit SHA'],
  ['Rollback Validation', 'Restored release tag'],
  ['Rollback Validation', 'Restored release commit SHA'],
  ['Rollback Validation', 'Rollback trigger reason'],
  ['Rollback Validation', 'Restored desktop executable path'],
  ['Rollback Validation', 'Restored installer path'],
  ['Rollback Validation', 'Restored smoke JSON path'],
  ['Rollback Validation', 'Restored smoke log path'],
  ['Rollback Validation', 'Screenshot path showing restored ready state'],
  ['Rollback Validation', 'Packaged runtime reached `ready`'],
  ['Rollback Validation', 'Packaged relaunch reached `ready`'],
  ['Rollback Validation', 'Metadata search/retrieve smoke status'],
  ['Rollback Validation', 'Real-org quickstart recheck performed'],
  ['Rollback Validation', 'Quickstart result'],
  ['Rollback Validation', 'Rollback successful'],
  ['Decision', 'Release candidate approved']
];

const PLACEHOLDER_VALUES = new Set([
  '',
  'yes/no',
  'pass/fail',
  'n/a',
  'vX.Y.Z',
  '<alias>'
]);

export function parseReleaseEvidence(markdown) {
  const sections = new Map();
  let currentSection = '';

  for (const rawLine of markdown.split(/\r?\n/)) {
    const headingMatch = rawLine.match(/^##\s+(.*)$/);
    if (headingMatch) {
      currentSection = headingMatch[1].trim();
      if (!sections.has(currentSection)) {
        sections.set(currentSection, new Map());
      }
      continue;
    }

    if (!rawLine.startsWith('- ') || !currentSection) {
      continue;
    }

    const separatorIndex = rawLine.indexOf(': ');
    if (separatorIndex < 0) {
      continue;
    }

    const label = rawLine.slice(2, separatorIndex).trim();
    const value = rawLine.slice(separatorIndex + 2).trim();
    sections.get(currentSection)?.set(label, value);
  }

  return sections;
}

export function findReleaseEvidenceIssues(markdown) {
  const sections = parseReleaseEvidence(markdown);
  const issues = [];

  for (const [section, label] of REQUIRED_FIELDS) {
    const value = sections.get(section)?.get(label);
    if (typeof value !== 'string') {
      issues.push(`${section} -> ${label}: missing field`);
      continue;
    }
    if (PLACEHOLDER_VALUES.has(value)) {
      issues.push(`${section} -> ${label}: unresolved placeholder (${value || 'blank'})`);
    }
  }

  return issues;
}

function resolveTargetPath() {
  const candidate = process.argv[2] || 'docs/releases/RELEASE.md';
  return path.resolve(process.cwd(), candidate);
}

function main() {
  const targetPath = resolveTargetPath();
  const markdown = fs.readFileSync(targetPath, 'utf8');
  const issues = findReleaseEvidenceIssues(markdown);

  if (issues.length > 0) {
    console.error(`Release evidence check failed for ${targetPath}`);
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(`Release evidence check passed for ${targetPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
