import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

test('actions retention cleanup default stays aligned at 14 runs', async () => {
  const workflow = await readRepoFile('.github/workflows/actions-retention-cleanup.yml');

  assert.match(
    workflow,
    /default:\s*"14"/,
    'workflow input should advertise 14 kept runs by default'
  );
  assert.match(
    workflow,
    /keep_runs_per_workflow \|\| '14'/,
    'scheduled/manual fallback should also default to 14 kept runs'
  );
});

test('runtime artifact uploads remain one-day retained in CI and nightly', async () => {
  const ciWorkflow = await readRepoFile('.github/workflows/ci.yml');
  const nightlyWorkflow = await readRepoFile('.github/workflows/runtime-nightly.yml');

  assert.match(
    ciWorkflow,
    /Upload runtime artifacts[\s\S]*retention-days:\s*1/,
    'CI runtime artifacts should retain for one day'
  );
  assert.match(
    nightlyWorkflow,
    /Upload nightly artifacts[\s\S]*retention-days:\s*1/,
    'nightly runtime artifacts should retain for one day'
  );
});
