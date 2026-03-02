import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:3100';
const outPath = process.argv[2] ?? path.join(repoRoot, 'logs', 'high-risk-review-benchmark.json');
const packagedExePath = path.join(
  repoRoot,
  'apps',
  'desktop',
  'src-tauri',
  'target',
  'release',
  'orgumented-desktop.exe'
);
const shouldAutoLaunchPackaged =
  process.env.ORGUMENTED_BENCHMARK_LAUNCH_PACKAGED !== '0';

const reviewQuery = 'Should we approve changing Opportunity.StageName for jane@example.com?';
const baselineQuery = 'What touches Opportunity.StageName?';

async function isReady() {
  try {
    const res = await fetch(`${apiUrl}/ready`);
    if (!res.ok) {
      return false;
    }
    const body = await res.json();
    return (
      body?.status === 'ready' &&
      Number(body?.checks?.db?.nodeCount ?? 0) > 0 &&
      Number(body?.checks?.db?.edgeCount ?? 0) > 0 &&
      body?.checks?.evidence?.ok === true
    );
  } catch {
    return false;
  }
}

async function isReachable() {
  try {
    const res = await fetch(`${apiUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureReady(child) {
  if (await isReady()) {
    return;
  }

  if (shouldAutoLaunchPackaged && !child && (await fileExists(packagedExePath))) {
    throw new Error('Benchmark runtime launch must be initiated before ensureReady is called.');
  }

  for (let i = 0; i < 45; i += 1) {
    if (child?.exitCode !== null) {
      throw new Error(`Packaged desktop benchmark runtime exited before readiness (code=${child.exitCode})`);
    }
    if (await isReady()) {
      return;
    }
    await sleep(2000);
  }

  throw new Error(`API not ready at ${apiUrl}/ready after waiting for benchmark runtime`);
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function startPackagedRuntime() {
  const child = spawn(packagedExePath, {
    cwd: path.dirname(packagedExePath),
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
  return child;
}

async function getJson(endpoint) {
  const res = await fetch(`${apiUrl}${endpoint}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`GET ${endpoint} failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function postJson(endpoint, payload) {
  const res = await fetch(`${apiUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`POST ${endpoint} failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function measure(label, fn) {
  const startedAt = Date.now();
  const result = await fn();
  return {
    label,
    durationMs: Date.now() - startedAt,
    result
  };
}

function summarizeAskResponse(body) {
  return {
    trustLevel: body.trustLevel,
    proofId: body.proof?.proofId,
    replayToken: body.proof?.replayToken,
    planIntent: body.plan?.intent,
    decisionPacket: body.decisionPacket
      ? {
          kind: body.decisionPacket.kind,
          focus: body.decisionPacket.focus,
          targetLabel: body.decisionPacket.targetLabel,
          riskLevel: body.decisionPacket.riskLevel,
          topRiskDriverCount: Array.isArray(body.decisionPacket.topRiskDrivers)
            ? body.decisionPacket.topRiskDrivers.length
            : 0,
          nextActionCount: Array.isArray(body.decisionPacket.nextActions)
            ? body.decisionPacket.nextActions.length
            : 0
        }
      : null
  };
}

async function main() {
  let packagedRuntime = null;
  const ready = await isReady();
  if (!ready && shouldAutoLaunchPackaged && (await fileExists(packagedExePath))) {
    if (await isReachable()) {
      throw new Error(
        `Existing runtime is reachable at ${apiUrl} but not grounded. Stop the stale process or refresh it before benchmarking.`
      );
    }
    packagedRuntime = startPackagedRuntime();
  }

  await ensureReady(packagedRuntime);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  try {
    const baselineSteps = [];
    baselineSteps.push(
      await measure('ask-impact', () =>
        postJson('/ask', { query: baselineQuery, traceLevel: 'standard', consistencyCheck: true })
      )
    );
    baselineSteps.push(
      await measure('impact', () => getJson('/impact?field=Opportunity.StageName'))
    );
    baselineSteps.push(
      await measure('automation', () => getJson('/automation?object=Opportunity'))
    );
    baselineSteps.push(
      await measure('perms', () =>
        getJson('/perms?user=jane@example.com&object=Opportunity&field=Opportunity.StageName')
      )
    );
    const baselineProofId = baselineSteps[0].result?.proof?.proofId;
    if (!baselineProofId) {
      throw new Error('Baseline ask did not return a proofId');
    }
    baselineSteps.push(
      await measure('proof-lookup', () => getJson(`/ask/proof/${encodeURIComponent(baselineProofId)}`))
    );

    const reviewAsk = await measure('review-packet-ask', () =>
      postJson('/ask', { query: reviewQuery, traceLevel: 'standard', consistencyCheck: true })
    );
    const repeatReviewAsk = await measure('review-packet-ask-repeat', () =>
      postJson('/ask', { query: reviewQuery, traceLevel: 'standard', consistencyCheck: true })
    );
    const reviewProofId = reviewAsk.result?.proof?.proofId;
    const reviewReplayToken = reviewAsk.result?.proof?.replayToken;
    if (!reviewProofId || !reviewReplayToken) {
      throw new Error('Review packet ask did not return proof identifiers');
    }
    const reviewProof = await measure('review-proof-lookup', () =>
      getJson(`/ask/proof/${encodeURIComponent(reviewProofId)}`)
    );
    const reviewReplay = await measure('review-replay', () =>
      postJson('/ask/replay', { replayToken: reviewReplayToken })
    );

    const baselineTotalMs = baselineSteps.reduce((sum, step) => sum + step.durationMs, 0);
    const reviewOperatorTotalMs = reviewAsk.durationMs;
    const baselineEvidenceSteps = 5;
    const reviewEvidenceSteps = 1;
    const baselineWorkspaceSwitches = 4;
    const reviewWorkspaceSwitches = 0;

    const artifact = {
      generatedAt: new Date().toISOString(),
      apiUrl,
      runtimeMode: packagedRuntime ? 'auto-launched-packaged' : 'existing-runtime',
      scenario: {
        name: 'high-risk-field-change-review',
        reviewQuery,
        baselineQuery,
        target: 'Opportunity.StageName'
      },
      baseline: {
        path: 'fragmented-evidence-gathering',
        operatorProxyElapsedMs: baselineTotalMs,
        evidenceSteps: baselineEvidenceSteps,
        workspaceSwitches: baselineWorkspaceSwitches,
        rawJsonRequired: true,
        calls: baselineSteps.map((step) => ({
          label: step.label,
          durationMs: step.durationMs
        })),
        proofId: baselineProofId,
        askSummary: summarizeAskResponse(baselineSteps[0].result)
      },
      reviewPacket: {
        path: 'typed-review-packet',
        operatorProxyElapsedMs: reviewOperatorTotalMs,
        evidenceSteps: reviewEvidenceSteps,
        workspaceSwitches: reviewWorkspaceSwitches,
        rawJsonRequired: false,
        ask: {
          durationMs: reviewAsk.durationMs,
          ...summarizeAskResponse(reviewAsk.result)
        },
        repeatedAskStable:
          repeatReviewAsk.result?.proof?.proofId === reviewProofId &&
          repeatReviewAsk.result?.proof?.replayToken === reviewReplayToken,
        proofLookup: {
          durationMs: reviewProof.durationMs,
          proofId: reviewProof.result?.proof?.proofId,
          replayToken: reviewProof.result?.proof?.replayToken
        },
        replay: {
          durationMs: reviewReplay.durationMs,
          matched: Boolean(reviewReplay.result?.matched),
          corePayloadMatched: Boolean(reviewReplay.result?.corePayloadMatched),
          metricsMatched: Boolean(reviewReplay.result?.metricsMatched)
        }
      },
      comparison: {
        proxyTimeDeltaMs: baselineTotalMs - reviewOperatorTotalMs,
        proxyTimeImprovementRatio:
          baselineTotalMs > 0
            ? Number(((baselineTotalMs - reviewOperatorTotalMs) / baselineTotalMs).toFixed(4))
            : null,
        evidenceStepDelta: baselineEvidenceSteps - reviewEvidenceSteps,
        workspaceSwitchDelta: baselineWorkspaceSwitches - reviewWorkspaceSwitches
      },
      notes: [
        'This harness captures deterministic API-path proxy metrics for the benchmark workflow.',
        'Human operator confidence and real desktop timing still need to be recorded separately when formal benchmark evidence is captured.'
      ]
    };

    await fs.writeFile(outPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
  } finally {
    if (packagedRuntime && packagedRuntime.exitCode === null) {
      packagedRuntime.kill();
      await sleep(1000);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
