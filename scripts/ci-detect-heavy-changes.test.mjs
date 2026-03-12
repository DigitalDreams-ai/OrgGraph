import test from 'node:test';
import assert from 'node:assert/strict';

import { detectHeavyChanges, getChangedPaths, isHeavyPath, normalizePath } from './ci-detect-heavy-changes.mjs';

test('normalizePath converts windows separators and strips leading dot slash', () => {
  assert.equal(normalizePath('.\\apps\\web\\app\\page.tsx'), 'apps/web/app/page.tsx');
});

test('isHeavyPath matches runtime-impacting prefixes and exact files', () => {
  assert.equal(isHeavyPath('apps/api/src/main.ts'), true);
  assert.equal(isHeavyPath('packages/project-memory/src/index.ts'), true);
  assert.equal(isHeavyPath('scripts/desktop-release-smoke.ps1'), true);
  assert.equal(isHeavyPath('.github/workflows/ci.yml'), true);
  assert.equal(isHeavyPath('package.json'), true);
  assert.equal(isHeavyPath('docs/planning/v2/ORGUMENTED_V2_EXECUTION.md'), false);
});

test('detectHeavyChanges reports docs-only diffs as non-heavy', () => {
  const result = detectHeavyChanges([
    'docs/planning/v2/ORGUMENTED_V2_EXECUTION.md',
    'docs/runbooks/REAL_ORG_DESKTOP_QUICKSTART.md'
  ]);

  assert.equal(result.heavy, false);
  assert.deepEqual(result.heavyPaths, []);
});

test('detectHeavyChanges reports mixed diffs as heavy and deduplicated', () => {
  const result = detectHeavyChanges([
    'apps/web/app/page.tsx',
    '.\\apps\\web\\app\\page.tsx',
    'docs/README.md',
    '.github/workflows/ci.yml'
  ]);

  assert.equal(result.heavy, true);
  assert.deepEqual(result.heavyPaths, ['apps/web/app/page.tsx', '.github/workflows/ci.yml']);
});

test('getChangedPaths falls back to show when base is all zeroes', () => {
  const paths = getChangedPaths('0000000000000000000000000000000000000000', 'HEAD');
  assert.ok(Array.isArray(paths));
});
