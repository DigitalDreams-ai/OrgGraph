import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const defaultProxyArtifactPath = path.join(repoRoot, 'logs', 'high-risk-review-benchmark.json');
const defaultOutJson = path.join(repoRoot, 'logs', 'high-risk-review-human-benchmark.json');
const defaultOutMd = path.join(repoRoot, 'logs', 'high-risk-review-human-benchmark.md');

const reviewQuery = 'Should we approve changing Opportunity.StageName for jane@example.com?';

const helpText = `Usage:
  pnpm phase17:benchmark:human -- --operator "<name>" --baseline-time-ms <ms> --baseline-evidence-steps <n> --baseline-workspace-switches <n> --baseline-raw-json <yes|no> --baseline-confidence <1-5> --review-time-ms <ms> --review-evidence-steps <n> --review-workspace-switches <n> --review-raw-json <yes|no> --review-confidence <1-5> [options]

Required:
  --operator <name>
  --baseline-time-ms <ms>
  --baseline-evidence-steps <n>
  --baseline-workspace-switches <n>
  --baseline-raw-json <yes|no>
  --baseline-confidence <1-5>
  --review-time-ms <ms>
  --review-evidence-steps <n>
  --review-workspace-switches <n>
  --review-raw-json <yes|no>
  --review-confidence <1-5>

Optional:
  --date <YYYY-MM-DD>                       Defaults to today in local time
  --query "<text>"                          Defaults to the benchmark scenario query
  --proxy-artifact <path>                   Defaults to logs/high-risk-review-benchmark.json
  --out-json <path>                         Defaults to logs/high-risk-review-human-benchmark.json
  --out-md <path>                           Defaults to logs/high-risk-review-human-benchmark.md
  --baseline-proof-id <id>
  --baseline-replay-token <token>
  --review-proof-id <id>
  --review-replay-token <token>
  --notes "<text>"                          Repeatable

Example:
  pnpm phase17:benchmark:human -- --operator "Sean" --baseline-time-ms 180000 --baseline-evidence-steps 5 --baseline-workspace-switches 4 --baseline-raw-json yes --baseline-confidence 3 --review-time-ms 75000 --review-evidence-steps 1 --review-workspace-switches 0 --review-raw-json no --review-confidence 4 --notes "Packet was sufficient without raw JSON"
`;

function parseArgs(argv) {
  const args = {
    notes: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    if (key === 'help') {
      args.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (typeof value === 'undefined' || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;
    if (key === 'notes') {
      args.notes.push(value);
      continue;
    }
    args[key] = value;
  }

  return args;
}

function toNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number`);
  }
  return parsed;
}

function toWholeNumber(value, label) {
  const parsed = toNumber(value, label);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be an integer`);
  }
  return parsed;
}

function toBooleanYesNo(value, label) {
  if (value === 'yes') {
    return true;
  }
  if (value === 'no') {
    return false;
  }
  throw new Error(`${label} must be yes or no`);
}

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function requireFields(args, fields) {
  for (const field of fields) {
    if (!args[field]) {
      throw new Error(`Missing required argument --${field}`);
    }
  }
}

async function readJson(filePath) {
  const body = await fs.readFile(filePath, 'utf8');
  return JSON.parse(body);
}

function computeThresholds(baseline, review) {
  const timeImprovementRatio =
    baseline.timeToTrustedAnswerMs > 0
      ? Number(
          (
            (baseline.timeToTrustedAnswerMs - review.timeToTrustedAnswerMs) /
            baseline.timeToTrustedAnswerMs
          ).toFixed(4)
        )
      : null;

  const evidenceStepDelta = baseline.evidenceSteps - review.evidenceSteps;
  const workspaceSwitchDelta = baseline.workspaceSwitches - review.workspaceSwitches;
  const confidenceDelta = review.confidenceRating - baseline.confidenceRating;

  return {
    repeatedAskStableRequired: true,
    replayParityRequired: true,
    proofIdentityStableRequired: true,
    timeImprovementRatio,
    evidenceStepDelta,
    workspaceSwitchDelta,
    confidenceDelta,
    checks: {
      timeImprovedByFortyPercent: timeImprovementRatio !== null && timeImprovementRatio >= 0.4,
      evidenceStepsReducedByTwo: evidenceStepDelta >= 2,
      workspaceSwitchesReducedByOne: workspaceSwitchDelta >= 1,
      rawJsonEliminated: review.rawJsonNeeded === false,
      confidenceNotWorse: review.confidenceRating >= baseline.confidenceRating
    }
  };
}

function buildMarkdown(artifact) {
  const checks = artifact.thresholds.checks;
  const passFail = artifact.passed ? 'PASS' : 'FAIL';
  const noteLines = artifact.notes.length > 0 ? artifact.notes.map((note) => `- ${note}`).join('\n') : '- none';

  return `# High-Risk Review Human Benchmark

Date:
- ${artifact.runDate}
Operator:
- ${artifact.operator}
Result:
- ${passFail}

Scenario:
- \`${artifact.query}\`

Proxy artifact:
- \`${artifact.proxyArtifactPath}\`

## Human Capture

| Path | Time To Trusted Answer (ms) | Evidence Steps | Workspace Switches | Raw JSON Needed | Confidence 1-5 | Proof ID | Replay Token |
| --- | ---: | ---: | ---: | --- | ---: | --- | --- |
| baseline | ${artifact.baseline.timeToTrustedAnswerMs} | ${artifact.baseline.evidenceSteps} | ${artifact.baseline.workspaceSwitches} | ${artifact.baseline.rawJsonNeeded ? 'yes' : 'no'} | ${artifact.baseline.confidenceRating} | ${artifact.baseline.proofId ?? ''} | ${artifact.baseline.replayToken ?? ''} |
| review-packet | ${artifact.reviewPacket.timeToTrustedAnswerMs} | ${artifact.reviewPacket.evidenceSteps} | ${artifact.reviewPacket.workspaceSwitches} | ${artifact.reviewPacket.rawJsonNeeded ? 'yes' : 'no'} | ${artifact.reviewPacket.confidenceRating} | ${artifact.reviewPacket.proofId ?? ''} | ${artifact.reviewPacket.replayToken ?? ''} |

## Threshold Check

| Gate | Result |
| --- | --- |
| repeated ask stable | ${artifact.proxyGuards.repeatedAskStable ? 'pass' : 'fail'} |
| replay parity | ${artifact.proxyGuards.replayParity ? 'pass' : 'fail'} |
| proof identity stable | ${artifact.proxyGuards.proofIdentityStable ? 'pass' : 'fail'} |
| time improved by at least 40% | ${checks.timeImprovedByFortyPercent ? 'pass' : 'fail'} |
| evidence steps reduced by at least 2 | ${checks.evidenceStepsReducedByTwo ? 'pass' : 'fail'} |
| workspace switches reduced by at least 1 | ${checks.workspaceSwitchesReducedByOne ? 'pass' : 'fail'} |
| raw JSON eliminated | ${checks.rawJsonEliminated ? 'pass' : 'fail'} |
| confidence not worse than baseline | ${checks.confidenceNotWorse ? 'pass' : 'fail'} |

## Comparison

- time improvement ratio: ${artifact.thresholds.timeImprovementRatio ?? 'n/a'}
- evidence step delta: ${artifact.thresholds.evidenceStepDelta}
- workspace switch delta: ${artifact.thresholds.workspaceSwitchDelta}
- confidence delta: ${artifact.thresholds.confidenceDelta}

## Notes

${noteLines}
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(helpText);
    return;
  }

  requireFields(args, [
    'operator',
    'baseline-time-ms',
    'baseline-evidence-steps',
    'baseline-workspace-switches',
    'baseline-raw-json',
    'baseline-confidence',
    'review-time-ms',
    'review-evidence-steps',
    'review-workspace-switches',
    'review-raw-json',
    'review-confidence'
  ]);

  const proxyArtifactPath = path.resolve(args['proxy-artifact'] ?? defaultProxyArtifactPath);
  const outJsonPath = path.resolve(args['out-json'] ?? defaultOutJson);
  const outMdPath = path.resolve(args['out-md'] ?? defaultOutMd);
  const proxyArtifact = await readJson(proxyArtifactPath);

  const baseline = {
    timeToTrustedAnswerMs: toWholeNumber(args['baseline-time-ms'], 'baseline-time-ms'),
    evidenceSteps: toWholeNumber(args['baseline-evidence-steps'], 'baseline-evidence-steps'),
    workspaceSwitches: toWholeNumber(args['baseline-workspace-switches'], 'baseline-workspace-switches'),
    rawJsonNeeded: toBooleanYesNo(args['baseline-raw-json'], 'baseline-raw-json'),
    confidenceRating: toWholeNumber(args['baseline-confidence'], 'baseline-confidence'),
    proofId: args['baseline-proof-id'] ?? proxyArtifact?.baseline?.proofId ?? null,
    replayToken: args['baseline-replay-token'] ?? proxyArtifact?.baseline?.askSummary?.replayToken ?? null
  };

  const reviewPacket = {
    timeToTrustedAnswerMs: toWholeNumber(args['review-time-ms'], 'review-time-ms'),
    evidenceSteps: toWholeNumber(args['review-evidence-steps'], 'review-evidence-steps'),
    workspaceSwitches: toWholeNumber(args['review-workspace-switches'], 'review-workspace-switches'),
    rawJsonNeeded: toBooleanYesNo(args['review-raw-json'], 'review-raw-json'),
    confidenceRating: toWholeNumber(args['review-confidence'], 'review-confidence'),
    proofId: args['review-proof-id'] ?? proxyArtifact?.reviewPacket?.ask?.proofId ?? null,
    replayToken: args['review-replay-token'] ?? proxyArtifact?.reviewPacket?.ask?.replayToken ?? null
  };

  if (baseline.confidenceRating < 1 || baseline.confidenceRating > 5) {
    throw new Error('baseline-confidence must be between 1 and 5');
  }
  if (reviewPacket.confidenceRating < 1 || reviewPacket.confidenceRating > 5) {
    throw new Error('review-confidence must be between 1 and 5');
  }

  const thresholds = computeThresholds(baseline, reviewPacket);
  const proxyGuards = {
    repeatedAskStable: Boolean(proxyArtifact?.reviewPacket?.repeatedAskStable),
    replayParity:
      Boolean(proxyArtifact?.reviewPacket?.replay?.matched) &&
      Boolean(proxyArtifact?.reviewPacket?.replay?.corePayloadMatched) &&
      Boolean(proxyArtifact?.reviewPacket?.replay?.metricsMatched),
    proofIdentityStable:
      proxyArtifact?.reviewPacket?.ask?.proofId === proxyArtifact?.reviewPacket?.proofLookup?.proofId &&
      proxyArtifact?.reviewPacket?.ask?.replayToken === proxyArtifact?.reviewPacket?.proofLookup?.replayToken
  };

  const passed =
    proxyGuards.repeatedAskStable &&
    proxyGuards.replayParity &&
    proxyGuards.proofIdentityStable &&
    thresholds.checks.timeImprovedByFortyPercent &&
    thresholds.checks.evidenceStepsReducedByTwo &&
    thresholds.checks.workspaceSwitchesReducedByOne &&
    thresholds.checks.rawJsonEliminated &&
    thresholds.checks.confidenceNotWorse;

  const artifact = {
    generatedAt: new Date().toISOString(),
    runDate: args.date ?? todayIsoDate(),
    operator: args.operator,
    query: args.query ?? reviewQuery,
    proxyArtifactPath: path.relative(repoRoot, proxyArtifactPath).replaceAll('\\', '/'),
    baseline,
    reviewPacket,
    proxyGuards,
    thresholds,
    passed,
    notes: args.notes
  };

  await fs.mkdir(path.dirname(outJsonPath), { recursive: true });
  await fs.mkdir(path.dirname(outMdPath), { recursive: true });
  await fs.writeFile(outJsonPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  await fs.writeFile(outMdPath, buildMarkdown(artifact), 'utf8');
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(helpText);
  process.exit(1);
});
