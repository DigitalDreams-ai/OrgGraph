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

const PROOF_RESULTS_PATH = 'docs/planning/v2/REAL_ORG_OPERATOR_PROOF_RESULTS.md';
const PROOF_RESULTS_FIELDS = [
  ['Real-Org Operator Proof', 'Canonical proof-results entry'],
  ['Clean-Machine Operator Proof', 'Canonical proof-results entry']
];

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

export function slugifyHeading(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function parseHeadingAnchors(markdown) {
  const anchors = new Set();

  for (const rawLine of markdown.split(/\r?\n/)) {
    const headingMatch = rawLine.match(/^##+\s+(.*)$/);
    if (!headingMatch) {
      continue;
    }
    const anchor = slugifyHeading(headingMatch[1]);
    if (anchor) {
      anchors.add(anchor);
    }
  }

  return anchors;
}

export function parseHeadingSections(markdown) {
  const sections = new Map();
  let currentAnchor = null;
  let buffer = [];

  const flush = () => {
    if (!currentAnchor) {
      return;
    }
    sections.set(currentAnchor, buffer.join('\n').trim());
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const headingMatch = rawLine.match(/^##+\s+(.*)$/);
    if (headingMatch) {
      flush();
      currentAnchor = slugifyHeading(headingMatch[1]);
      buffer = [];
      continue;
    }

    if (currentAnchor) {
      buffer.push(rawLine);
    }
  }

  flush();
  return sections;
}

export function parseBulletFields(markdown) {
  const fields = new Map();

  for (const rawLine of markdown.split(/\r?\n/)) {
    if (!rawLine.startsWith('- ')) {
      continue;
    }

    const separatorIndex = rawLine.indexOf(': ');
    if (separatorIndex < 0) {
      continue;
    }

    const label = rawLine.slice(2, separatorIndex).trim();
    const value = rawLine.slice(separatorIndex + 2).trim();
    fields.set(label, value);
  }

  return fields;
}

const PROOF_RESULT_SECTION_REQUIREMENTS = new Map([
  ['Real-Org Operator Proof', ['Operator', 'Result', 'Proof ID', 'Replay Token']],
  ['Clean-Machine Operator Proof', ['Operator', 'Result', 'Proof ID', 'Replay Token']]
]);

export function findReleaseEvidenceIssues(markdown, options = {}) {
  const sections = parseReleaseEvidence(markdown);
  const issues = [];
  const proofResultsMarkdown = typeof options.proofResultsMarkdown === 'string' ? options.proofResultsMarkdown : null;
  const proofResultAnchors = proofResultsMarkdown ? parseHeadingAnchors(proofResultsMarkdown) : null;
  const proofResultSections = proofResultsMarkdown ? parseHeadingSections(proofResultsMarkdown) : null;

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

  for (const [section, label] of PROOF_RESULTS_FIELDS) {
    const value = sections.get(section)?.get(label);
    if (typeof value !== 'string' || PLACEHOLDER_VALUES.has(value)) {
      continue;
    }

    if (!value.startsWith(`${PROOF_RESULTS_PATH}#`)) {
      issues.push(`${section} -> ${label}: must reference ${PROOF_RESULTS_PATH}#<anchor>`);
      continue;
    }

    const anchor = value.slice(value.indexOf('#') + 1).trim();
    if (!anchor) {
      issues.push(`${section} -> ${label}: missing proof-results anchor`);
      continue;
    }

    if (proofResultAnchors && !proofResultAnchors.has(anchor)) {
      issues.push(`${section} -> ${label}: unknown proof-results anchor (${anchor})`);
      continue;
    }

    const anchorSectionMarkdown = proofResultSections?.get(anchor);
    const anchorFields = anchorSectionMarkdown ? parseBulletFields(anchorSectionMarkdown) : null;

    for (const requiredField of PROOF_RESULT_SECTION_REQUIREMENTS.get(section) ?? []) {
      const anchorValue = anchorFields?.get(requiredField);
      if (typeof anchorValue !== 'string') {
        issues.push(`${section} -> ${label}: proof-results section ${anchor} missing field (${requiredField})`);
        continue;
      }

      if (PLACEHOLDER_VALUES.has(anchorValue)) {
        issues.push(`${section} -> ${label}: proof-results section ${anchor} has unresolved placeholder (${requiredField}: ${anchorValue || 'blank'})`);
      }
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
  const proofResultsPath = path.resolve(process.cwd(), PROOF_RESULTS_PATH);
  const proofResultsMarkdown = fs.existsSync(proofResultsPath) ? fs.readFileSync(proofResultsPath, 'utf8') : '';
  const issues = findReleaseEvidenceIssues(markdown, { proofResultsMarkdown });

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
