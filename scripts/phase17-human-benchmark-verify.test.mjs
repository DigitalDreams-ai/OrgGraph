import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const verifyScriptPath = path.join(repoRoot, 'scripts', 'phase17-human-benchmark-verify.mjs');

test('phase17 benchmark verify accepts proxy-only canonical results when packet quality passes', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orgumented-phase17-verify-proxy-'));
  const proxyArtifactPath = path.join(tempDir, 'proxy.json');
  const resultsPath = path.join(tempDir, 'results.md');

  const proxyArtifact = {
    scenario: {
      reviewQuery: 'Should we approve changing Opportunity.StageName for jane@example.com?'
    },
    reviewPacket: {
      ask: {
        decisionPacket: {
          recommendationVerdict: 'do_not_approve_yet',
          recommendationSummary: 'Do not approve yet. Resolve deterministic permission gaps first.'
        }
      },
      packetQuality: {
        passed: true
      }
    }
  };

  await fs.writeFile(proxyArtifactPath, `${JSON.stringify(proxyArtifact, null, 2)}\n`, 'utf8');
  const proxyHash = crypto
    .createHash('sha256')
    .update(await fs.readFile(proxyArtifactPath))
    .digest('hex');

  await fs.writeFile(
    resultsPath,
    `# High-Risk Review Benchmark Results

Acceptance mode:
- \`proxy_only\`

Proxy artifact:
- path: \`${path.relative(repoRoot, proxyArtifactPath).replaceAll('\\', '/')}\`
- hash: \`${proxyHash}\`

Scenario:
- \`${proxyArtifact.scenario.reviewQuery}\`

- review packet recommendation verdict: \`${proxyArtifact.reviewPacket.ask.decisionPacket.recommendationVerdict}\`
- review packet recommendation summary: \`${proxyArtifact.reviewPacket.ask.decisionPacket.recommendationSummary}\`
`,
    'utf8'
  );

  const { stdout } = await execFileAsync(
    process.execPath,
    [
      verifyScriptPath,
      '--proxy-artifact',
      proxyArtifactPath,
      '--results-md',
      resultsPath
    ],
    { cwd: repoRoot }
  );

  const summary = JSON.parse(stdout);
  assert.equal(summary.verified, true);
  assert.equal(summary.mode, 'proxy_only');
  assert.equal(summary.humanArtifactPath, null);
});
