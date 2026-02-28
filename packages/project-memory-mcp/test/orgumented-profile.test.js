const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function writeWaveTasklist(root, wave, tasksCompleted, tasksPending, exitCompleted, exitPending) {
  const target = path.join(root, 'docs', 'planning', `WAVE_${wave}_TASKLIST.md`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const lines = [`# Wave ${wave} Tasklist`, '', '## Tasks'];
  for (let index = 0; index < tasksCompleted; index += 1) {
    lines.push(`- [x] completed task ${index + 1}`);
  }
  for (let index = 0; index < tasksPending; index += 1) {
    lines.push(`- [ ] pending task ${index + 1}`);
  }
  lines.push('', '## Exit Gates');
  for (let index = 0; index < exitCompleted; index += 1) {
    lines.push(`- [x] completed exit ${index + 1}`);
  }
  for (let index = 0; index < exitPending; index += 1) {
    lines.push(`- [ ] pending exit ${index + 1}`);
  }
  fs.writeFileSync(target, `${lines.join('\n')}\n`, 'utf8');
}

function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-profile-'));
  writeWaveTasklist(root, 'A', 2, 1, 1, 2);
  writeWaveTasklist(root, 'B', 1, 2, 0, 3);
  writeWaveTasklist(root, 'C', 0, 4, 0, 2);
  writeWaveTasklist(root, 'D', 3, 0, 1, 1);
  writeWaveTasklist(root, 'E', 2, 2, 2, 0);
  writeWaveTasklist(root, 'F', 4, 1, 2, 1);
  writeWaveTasklist(root, 'G', 1, 3, 0, 4);

  const {
    createOrgumentedBaselineRecords,
    summarizeOrgumentedWaves
  } = require('../dist/orgumented-profile.js');

  const seeded = createOrgumentedBaselineRecords('codex', '2026-02-28T00:00:00.000Z', (type, title, timestamp) =>
    `${type}:${title}:${timestamp}`
  );
  assert.equal(seeded.length, 5);
  assert.equal(seeded[0].recordType, 'repo_map');
  assert.equal(seeded[0].scope.area, 'api-runtime');
  assert.equal(seeded[1].title, 'Operator surfaces');
  assert.equal(seeded[2].subsystem, 'desktop-transition');

  const waves = summarizeOrgumentedWaves(root);
  assert.equal(waves.length, 7);
  assert.equal(waves[0].taskCounts.completed, 2);
  assert.equal(waves[0].taskCounts.pending, 1);
  assert.equal(waves[4].exitGateCounts.completed, 2);
  assert.equal(waves[4].exitGateCounts.pending, 0);
  assert.equal(waves[5].taskCounts.completed, 4);
  assert.equal(waves[6].exitGateCounts.pending, 4);

  fs.rmSync(root, { recursive: true, force: true });
  console.log('orgumented profile test passed');
}

run();
