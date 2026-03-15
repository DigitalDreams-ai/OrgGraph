const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function writeV2WavesPlan(root) {
  const target = path.join(root, 'docs', 'planning', 'v2', 'ORGUMENTED_V2_WAVES_100_PLAN.md');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(
    target,
    [
      '# Orgumented v2 100% Completion Plan',
      '',
      '## Wave Progress Snapshot',
      '',
      '| Wave | Theme | Primary IDs | Status | Next Gate |',
      '|---|---|---|---|---|',
      '| wave1 | baseline lock and triage | B001 | Complete | Maintain drift-free docs |',
      '| wave2 | runtime convergence | B002 | In Progress | Runtime parity proof |',
      '| wave3 | sessions and toolchain reliability | B003 | Complete | Session restore proof |',
      '| wave4 | org browser explorer | B004 | Complete | Browser parity hold |',
      '| wave5 | retrieve -> refresh handoff | B005 | In Progress | Real-org handoff proof |',
      '| wave6 | ask planner/compiler depth | B006 | In Progress | Semantic-frame depth |',
      '',
      '## wave1 - Baseline Lock And Triage'
    ].join('\n'),
    'utf8'
  );
}

function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-profile-'));
  writeV2WavesPlan(root);

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
  assert.equal(seeded[2].subsystem, 'desktop-runtime');
  assert.ok(seeded[4].docRefs.includes('docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md'));

  const waves = summarizeOrgumentedWaves(root);
  assert.equal(waves.length, 6);
  assert.equal(waves[0].wave, 'wave1');
  assert.equal(waves[0].order, 1);
  assert.equal(waves[0].status, 'Complete');
  assert.equal(waves[1].theme, 'runtime convergence');
  assert.equal(waves[1].nextGate, 'Runtime parity proof');
  assert.equal(waves[5].primaryIds, 'B006');
  assert.equal(waves[5].path, 'docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('orgumented profile test passed');
}

run();
