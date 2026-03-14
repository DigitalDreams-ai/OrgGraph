import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const repoRoot = path.resolve(import.meta.dirname, '..');
const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:3100';
const outPath = process.argv[2] ?? path.join(repoRoot, 'logs', 'high-risk-review-benchmark.json');
const logsDir = path.join(repoRoot, 'logs');
const runtimeStdoutLog = path.join(logsDir, 'phase17-benchmark-runtime.stdout.log');
const runtimeStderrLog = path.join(logsDir, 'phase17-benchmark-runtime.stderr.log');
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
  process.env.ORGUMENTED_BENCHMARK_LAUNCH_PACKAGED === '1';
const shouldKeepPackagedRuntime =
  process.env.ORGUMENTED_BENCHMARK_KEEP_PACKAGED_RUNTIME === '1';
const debugEnabled = process.env.ORGUMENTED_BENCHMARK_DEBUG === '1';
const benchmarkHttpTimeoutMs = Math.max(
  1000,
  Number(process.env.ORGUMENTED_BENCHMARK_HTTP_TIMEOUT_MS ?? 5000)
);

const reviewQuery = 'Should we approve changing Opportunity.StageName for jane@example.com?';
const baselineQuery = 'What touches Opportunity.StageName?';
const execFileAsync = promisify(execFile);

function debugLog(message) {
  if (debugEnabled) {
    console.error(`[phase17-benchmark] ${message}`);
  }
}

async function isReady() {
  try {
    const res = await fetch(`${apiUrl}/ready`, {
      signal: AbortSignal.timeout(benchmarkHttpTimeoutMs)
    });
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
    const res = await fetch(`${apiUrl}/health`, {
      signal: AbortSignal.timeout(benchmarkHttpTimeoutMs)
    });
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
    debugLog('runtime already grounded');
    return;
  }

  if (shouldAutoLaunchPackaged && !child && (await fileExists(packagedExePath))) {
    throw new Error('Benchmark runtime launch must be initiated before ensureReady is called.');
  }

  const attempts = Math.max(1, Number(process.env.ORGUMENTED_BENCHMARK_READY_ATTEMPTS ?? 45));
  const delayMs = Math.max(1000, Number(process.env.ORGUMENTED_BENCHMARK_READY_DELAY_MS ?? 2000));
  let processExitedBeforeReady = false;

  for (let i = 0; i < attempts; i += 1) {
    debugLog(`polling readiness attempt ${i + 1}/${attempts}`);
    if (child && !(await isProcessRunning(child.pid))) {
      processExitedBeforeReady = true;
      debugLog(`packaged shell pid=${child.pid} exited before readiness; continuing to poll child runtime`);
    }
    if (await isReady()) {
      if (processExitedBeforeReady) {
        debugLog('runtime reached grounded ready state after shell process exit');
      }
      return;
    }
    await sleep(delayMs);
  }

  const stdoutTail = child ? await getLogTail(child.stdoutLogPath) : '<not-started>';
  const stderrTail = child ? await getLogTail(child.stderrLogPath) : '<not-started>';
  throw new Error(
    `API not ready at ${apiUrl}/ready after waiting for benchmark runtime.\nSTDOUT:\n${stdoutTail}\nSTDERR:\n${stderrTail}`
  );
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function escapePowerShell(value) {
  return value.replaceAll("'", "''");
}

async function runPowerShell(command) {
  return execFileAsync(
    'pwsh',
    ['-NoProfile', '-Command', command],
    { cwd: repoRoot, windowsHide: true, maxBuffer: 1024 * 1024 * 10 }
  );
}

async function getLogTail(logPath, lineCount = 40) {
  if (!(await fileExists(logPath))) {
    return `<missing: ${path.relative(repoRoot, logPath).replaceAll('\\', '/')}>`;
  }

  const content = await fs.readFile(logPath, 'utf8');
  const lines = content.trim().length > 0 ? content.trimEnd().split(/\r?\n/) : [];
  if (lines.length === 0) {
    return `<empty: ${path.relative(repoRoot, logPath).replaceAll('\\', '/')}>`;
  }
  return lines.slice(-lineCount).join('\n');
}

async function stopPackagedProcesses() {
  const command = `
$runtimeTargets = Get-Process -Name orgumented-desktop,node -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Path -like "*OrgGraph\\apps\\desktop\\src-tauri\\target\\release*" -or
    $_.Path -like "*OrgGraph\\apps\\desktop\\src-tauri\\runtime*"
  }
$portTarget = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
$targetIds = @(
  $runtimeTargets | Select-Object -ExpandProperty Id
  $portTarget
) | Where-Object { $null -ne $_ } | Sort-Object -Unique
foreach ($targetId in $targetIds) {
  Stop-Process -Id $targetId -Force -ErrorAction SilentlyContinue
}
`;
  await runPowerShell(command);
}

async function startPackagedRuntime() {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.rm(runtimeStdoutLog, { force: true });
  await fs.rm(runtimeStderrLog, { force: true });

  const command = `
$process = Start-Process -FilePath '${escapePowerShell(packagedExePath)}' -WorkingDirectory '${escapePowerShell(path.dirname(packagedExePath))}' -RedirectStandardOutput '${escapePowerShell(runtimeStdoutLog)}' -RedirectStandardError '${escapePowerShell(runtimeStderrLog)}' -PassThru
$process.Id
`;
  const { stdout } = await runPowerShell(command);
  const pid = Number.parseInt(stdout.trim(), 10);
  if (!Number.isInteger(pid)) {
    throw new Error(`Unable to capture packaged runtime pid from PowerShell launch output: ${stdout}`);
  }

  debugLog(`started packaged runtime pid=${pid}`);
  return {
    pid,
    stdoutLogPath: runtimeStdoutLog,
    stderrLogPath: runtimeStderrLog
  };
}

async function isProcessRunning(pid) {
  const command = `
$process = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
if ($null -eq $process) {
  'missing'
} else {
  'running'
}
`;
  const { stdout } = await runPowerShell(command);
  return stdout.trim() === 'running';
}

async function stopPackagedRuntime(runtime) {
  if (!runtime) {
    return;
  }
  debugLog(`stopping packaged runtime pid=${runtime.pid}`);
  try {
    await execFileAsync(
      'taskkill',
      ['/PID', `${runtime.pid}`, '/T', '/F'],
      { cwd: repoRoot, windowsHide: true, maxBuffer: 1024 * 1024 * 10 }
    );
  } catch (error) {
    debugLog(`taskkill returned non-zero while stopping packaged runtime pid=${runtime.pid}: ${String(error)}`);
  }
  await sleep(1000);
}

async function getJson(endpoint) {
  const res = await fetch(`${apiUrl}${endpoint}`, {
    signal: AbortSignal.timeout(benchmarkHttpTimeoutMs)
  });
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
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(benchmarkHttpTimeoutMs)
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
          recommendationVerdict: body.decisionPacket.recommendation?.verdict,
          recommendationSummary: body.decisionPacket.recommendation?.summary,
          riskLevel: body.decisionPacket.riskLevel,
          topRiskDriverCount: Array.isArray(body.decisionPacket.topRiskDrivers)
            ? body.decisionPacket.topRiskDrivers.length
            : 0,
          evidenceGapCount: Array.isArray(body.decisionPacket.evidenceGaps)
            ? body.decisionPacket.evidenceGaps.length
            : 0,
          nextActionCount: Array.isArray(body.decisionPacket.nextActions)
            ? body.decisionPacket.nextActions.length
            : 0
        }
      : null
  };
}

function buildReviewPacketQuality(decisionPacket) {
  if (!decisionPacket || typeof decisionPacket !== 'object') {
    return {
      hasDecisionPacket: false,
      hasTopAutomationSpotlight: false,
      hasTopImpactSpotlight: false,
      hasSpecificAutomationAction: false,
      hasSpecificImpactAction: false,
      passed: false
    };
  }

  const topRiskDrivers = Array.isArray(decisionPacket.topRiskDrivers)
    ? decisionPacket.topRiskDrivers.map((driver) => String(driver))
    : [];
  const topAutomationNames = Array.isArray(decisionPacket?.automationImpact?.topAutomationNames)
    ? decisionPacket.automationImpact.topAutomationNames.map((name) => String(name))
    : [];
  const topImpactedSources = Array.isArray(decisionPacket?.changeImpact?.topImpactedSources)
    ? decisionPacket.changeImpact.topImpactedSources.map((source) => String(source))
    : [];
  const nextActions = Array.isArray(decisionPacket.nextActions)
    ? decisionPacket.nextActions
    : [];
  const recommendationVerdict = String(decisionPacket?.recommendation?.verdict ?? '');
  const recommendationSummary = String(decisionPacket?.recommendation?.summary ?? '');
  const evidenceGaps = Array.isArray(decisionPacket?.evidenceGaps)
    ? decisionPacket.evidenceGaps.map((gap) => String(gap))
    : [];
  const automationAction = nextActions.find(
    (action) => action && String(action.label) === 'Inspect impacted automation'
  );
  const impactAction = nextActions.find(
    (action) => action && String(action.label) === 'Inspect impact paths'
  );

  const hasTopAutomationSpotlight = topRiskDrivers.some((driver) =>
    driver.toLowerCase().includes('top automation')
  ) || topRiskDrivers.some((driver) => driver.toLowerCase().includes('no deterministic automation names matched'));
  const hasTopImpactSpotlight = topRiskDrivers.some((driver) =>
    driver.toLowerCase().includes('top impact source')
  ) || topRiskDrivers.some((driver) => driver.toLowerCase().includes('no deterministic impact sources matched'));
  const hasSpecificAutomationAction =
    typeof automationAction?.rationale === 'string' &&
    (topAutomationNames.length > 0
      ? topAutomationNames.some((name) => automationAction.rationale.includes(name))
      : automationAction.rationale.toLowerCase().includes('confirm no hidden automation exists'));
  const hasSpecificImpactAction =
    typeof impactAction?.rationale === 'string' &&
    (topImpactedSources.length > 0
      ? topImpactedSources.some((source) => impactAction.rationale.includes(source))
      : impactAction.rationale.toLowerCase().includes('no impact path found'));
  const hasRecommendation = recommendationVerdict.length > 0 && recommendationSummary.length > 0;
  const passed =
    hasTopAutomationSpotlight &&
    hasTopImpactSpotlight &&
    hasSpecificAutomationAction &&
    hasSpecificImpactAction &&
    hasRecommendation;

  return {
    hasDecisionPacket: true,
    hasTopAutomationSpotlight,
    hasTopImpactSpotlight,
    hasSpecificAutomationAction,
    hasSpecificImpactAction,
    hasRecommendation,
    recommendationVerdict,
    recommendationSummary,
    evidenceGapCount: evidenceGaps.length,
    passed
  };
}

async function main() {
  let packagedRuntime = null;
  let forceExitAfterSuccess = false;
  const ready = await isReady();
  debugLog(`initial grounded readiness=${ready}`);
  if (!ready && shouldAutoLaunchPackaged && (await fileExists(packagedExePath))) {
    if (await isReachable()) {
      throw new Error(
        `Existing runtime is reachable at ${apiUrl} but not grounded. Stop the stale process or refresh it before benchmarking.`
      );
    }
    debugLog('stopping stale packaged processes before benchmark launch');
    await stopPackagedProcesses();
    debugLog('launching packaged runtime for benchmark');
    packagedRuntime = startPackagedRuntime();
  }

  if (!ready && !packagedRuntime) {
    throw new Error(
      `Benchmark requires an already grounded runtime at ${apiUrl}. Start the packaged desktop shell first, or set ORGUMENTED_BENCHMARK_LAUNCH_PACKAGED=1 for best-effort auto-launch.`
    );
  }

  await ensureReady(await packagedRuntime);
  debugLog('runtime grounded; starting benchmark sequence');
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  try {
    const baselineSteps = [];
    debugLog('running baseline ask');
    baselineSteps.push(
      await measure('ask-impact', () =>
        postJson('/ask', { query: baselineQuery, traceLevel: 'standard', consistencyCheck: true })
      )
    );
    baselineSteps.push(
      await measure('impact', () => getJson('/impact?field=Opportunity.StageName'))
    );
    debugLog('running automation query');
    baselineSteps.push(
      await measure('automation', () => getJson('/automation?object=Opportunity'))
    );
    debugLog('running permission query');
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

    debugLog('running review ask');
    const reviewAsk = await measure('review-packet-ask', () =>
      postJson('/ask', { query: reviewQuery, traceLevel: 'standard', consistencyCheck: true })
    );
    debugLog('running repeated review ask');
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
    debugLog('running replay verification');
    const reviewReplay = await measure('review-replay', () =>
      postJson('/ask/replay', { replayToken: reviewReplayToken })
    );
    const reviewPacketQuality = buildReviewPacketQuality(reviewAsk.result?.decisionPacket);

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
        },
        packetQuality: reviewPacketQuality
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
    debugLog(`wrote benchmark artifact to ${path.relative(repoRoot, outPath).replaceAll('\\', '/')}`);
    process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
    if (packagedRuntime && shouldKeepPackagedRuntime) {
      debugLog('keeping packaged runtime alive after benchmark bootstrap');
      forceExitAfterSuccess = true;
    }
  } finally {
    if (packagedRuntime && !shouldKeepPackagedRuntime) {
      await stopPackagedRuntime(await packagedRuntime);
      debugLog('stopping any lingering packaged runtime processes');
      await stopPackagedProcesses();
    }
  }

  return { forceExitAfterSuccess };
}

main()
  .then(({ forceExitAfterSuccess }) => {
    if (forceExitAfterSuccess) {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
