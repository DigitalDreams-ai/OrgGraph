import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const publishScriptPath = path.join(repoRoot, 'scripts', 'phase17-human-benchmark-publish.mjs');

test('phase17 benchmark publish surfaces recommendation and evidence-gap proxy signals', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orgumented-phase17-publish-'));
  const proxyArtifactPath = path.join(tempDir, 'proxy.json');
  const humanArtifactPath = path.join(tempDir, 'human.json');
  const outMdPath = path.join(tempDir, 'results.md');

  const proxyArtifact = {
    runtimeMode: 'existing-runtime',
    scenario: {
      reviewQuery: 'Should we approve changing Opportunity.StageName for jane@example.com?'
    },
    baseline: {
      operatorProxyElapsedMs: 64,
      evidenceSteps: 5,
      workspaceSwitches: 4
    },
    reviewPacket: {
      operatorProxyElapsedMs: 8,
      evidenceSteps: 1,
      workspaceSwitches: 0,
      ask: {
        decisionPacket: {
          recommendationVerdict: 'do_not_approve_yet',
          recommendationSummary: 'Automation and impact coverage still need operator review.',
          evidenceGapCount: 2
        }
      },
      packetQuality: {
        passed: true,
        hasRecommendation: true,
        evidenceGapCount: 2
      }
    },
    comparison: {
      proxyTimeDeltaMs: 56,
      proxyTimeImprovementRatio: 0.875,
      evidenceStepDelta: 4,
      workspaceSwitchDelta: 4
    },
    notes: ['proxy note']
  };

  const humanArtifact = {
    runDate: '2026-03-13',
    operator: 'Sean',
    query: 'Should we approve changing Opportunity.StageName for jane@example.com?',
    captureTemplatePath: 'logs/high-risk-review-human-capture-template.json',
    captureTemplateSignature: 'sig_123',
    proxyArtifactHash: 'hash_123',
    baseline: {
      timeToTrustedAnswerMs: 400,
      evidenceSteps: 1,
      workspaceSwitches: 2,
      rawJsonNeeded: false,
      confidenceRating: 4,
      proofId: 'proof_base',
      replayToken: 'trace_base'
    },
    reviewPacket: {
      timeToTrustedAnswerMs: 200,
      evidenceSteps: 1,
      workspaceSwitches: 0,
      rawJsonNeeded: false,
      confidenceRating: 5,
      proofId: 'proof_review',
      replayToken: 'trace_review'
    },
    proxyGuards: {
      repeatedAskStable: true,
      replayParity: true,
      proofIdentityStable: true,
      reviewPacketSpecificity: true
    },
    thresholds: {
      timeImprovementRatio: 0.5,
      evidenceStepDelta: 2,
      workspaceSwitchDelta: 2,
      confidenceDelta: 1,
      checks: {
        timeImprovedByFortyPercent: true,
        evidenceStepsReducedByTwo: true,
        workspaceSwitchesReducedByOne: true,
        rawJsonEliminated: true,
        confidenceNotWorse: true
      }
    },
    passed: true,
    notes: ['human note']
  };

  await fs.writeFile(proxyArtifactPath, `${JSON.stringify(proxyArtifact, null, 2)}\n`, 'utf8');
  await fs.writeFile(humanArtifactPath, `${JSON.stringify(humanArtifact, null, 2)}\n`, 'utf8');

  await execFileAsync(
    process.execPath,
    [
      publishScriptPath,
      '--proxy-artifact',
      proxyArtifactPath,
      '--human-artifact',
      humanArtifactPath,
      '--out-md',
      outMdPath
    ],
    { cwd: repoRoot }
  );

  const markdown = await fs.readFile(outMdPath, 'utf8');

  assert.match(markdown, /review packet recommendation verdict: `do_not_approve_yet`/);
  assert.match(
    markdown,
    /review packet recommendation summary: `Automation and impact coverage still need operator review\.`/
  );
  assert.match(markdown, /review packet evidence gaps visible: `2`/);
  assert.match(markdown, /review packet specificity guard: `pass`/);
  assert.match(markdown, /review packet recommendation present: `pass`/);
});
