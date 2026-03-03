import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const defaultProxyArtifactPath = path.join(repoRoot, 'logs', 'high-risk-review-benchmark.json');
const defaultHumanArtifactPath = path.join(repoRoot, 'logs', 'high-risk-review-human-benchmark.json');
const defaultOutMdPath = path.join(
  repoRoot,
  'docs',
  'planning',
  'v2',
  'HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md'
);

const helpText = `Usage:
  pnpm phase17:benchmark:human:publish [options]

Optional:
  --proxy-artifact <path>            Defaults to logs/high-risk-review-benchmark.json
  --human-artifact <path>            Defaults to logs/high-risk-review-human-benchmark.json
  --out-md <path>                    Defaults to docs/planning/v2/HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md
  --allow-synthetic                  Permit synthetic/smoke artifacts for non-canonical verification

Example:
  pnpm phase17:benchmark:human:publish
  pnpm phase17:benchmark:human:publish -- --human-artifact logs/high-risk-review-human-benchmark-smoke.json --out-md logs/high-risk-review-human-benchmark-preview.md --allow-synthetic
`;

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    if (key === 'help' || key === 'allow-synthetic') {
      args[key] = true;
      continue;
    }

    const value = argv[index + 1];
    if (typeof value === 'undefined' || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

async function readJson(filePath) {
  const body = await fs.readFile(filePath, 'utf8');
  return JSON.parse(body);
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll('\\', '/');
}

function isCanonicalOutput(filePath) {
  return path.resolve(filePath) === path.resolve(defaultOutMdPath);
}

function detectSyntheticHumanArtifact(humanArtifact, humanArtifactPath) {
  const signals = [];
  const notes = Array.isArray(humanArtifact?.notes) ? humanArtifact.notes : [];
  const operator = String(humanArtifact?.operator ?? '').trim().toLowerCase();
  const artifactPath = relativePath(humanArtifactPath).toLowerCase();

  if (operator === 'smoke') {
    signals.push('operator is smoke');
  }
  if (artifactPath.includes('smoke')) {
    signals.push('artifact path contains smoke');
  }
  if (notes.some((note) => /synthetic|smoke/i.test(String(note)))) {
    signals.push('notes contain synthetic or smoke markers');
  }

  return {
    synthetic: signals.length > 0,
    signals
  };
}

function formatRatio(value) {
  return Number.isFinite(value) ? value.toFixed(4) : 'n/a';
}

function formatPercent(ratio) {
  return Number.isFinite(ratio) ? `${(ratio * 100).toFixed(1)}%` : 'n/a';
}

function boolPass(value) {
  return value ? 'pass' : 'fail';
}

function formatRawJson(value) {
  return value ? 'yes' : 'no';
}

function buildMarkdown(proxyArtifact, humanArtifact, metadata) {
  const proxyComparison = proxyArtifact.comparison ?? {};
  const thresholdChecks = humanArtifact.thresholds?.checks ?? {};
  const proxyNotes = Array.isArray(proxyArtifact.notes) ? proxyArtifact.notes : [];
  const humanNotes = Array.isArray(humanArtifact.notes) ? humanArtifact.notes : [];
  const noteLines =
    humanNotes.length > 0 ? humanNotes.map((note) => `- ${note}`).join('\n') : '- none recorded';

  return `# High-Risk Review Benchmark Results

Date: ${humanArtifact.runDate}
Artifacts:
- \`${metadata.proxyArtifactPath}\`
- \`${metadata.humanArtifactPath}\`

## Latest Automated Proxy Run

Runtime mode:
- ${proxyArtifact.runtimeMode ?? 'unknown'}

Scenario:
- \`${proxyArtifact?.scenario?.reviewQuery ?? humanArtifact.query}\`

## Automated Proxy Summary

The typed review-packet path materially reduced workflow friction on the automated proxy benchmark:
- proxy time improved from \`${proxyArtifact?.baseline?.operatorProxyElapsedMs ?? 'n/a'}ms\` to \`${proxyArtifact?.reviewPacket?.operatorProxyElapsedMs ?? 'n/a'}ms\`
- evidence steps dropped from \`${proxyArtifact?.baseline?.evidenceSteps ?? 'n/a'}\` to \`${proxyArtifact?.reviewPacket?.evidenceSteps ?? 'n/a'}\`
- workspace switches dropped from \`${proxyArtifact?.baseline?.workspaceSwitches ?? 'n/a'}\` to \`${proxyArtifact?.reviewPacket?.workspaceSwitches ?? 'n/a'}\`
- repeated identical review asks preserved:
  - \`proofId\`
  - \`replayToken\`
  - replay parity
- both baseline and review-packet asks returned:
  - \`trustLevel = trusted\`

Proxy comparison:
- proxy time delta: \`${proxyComparison.proxyTimeDeltaMs ?? 'n/a'}ms\`
- proxy time improvement ratio: \`${formatRatio(proxyComparison.proxyTimeImprovementRatio)}\`
- evidence-step delta: \`${proxyComparison.evidenceStepDelta ?? 'n/a'}\`
- workspace-switch delta: \`${proxyComparison.workspaceSwitchDelta ?? 'n/a'}\`

## Human Benchmark Capture

Operator:
- \`${humanArtifact.operator}\`

| Path | Time To Trusted Answer | Evidence Steps | Workspace Switches | Raw JSON Needed | Confidence 1-5 | Proof ID | Replay Token |
| --- | ---: | ---: | ---: | --- | ---: | --- | --- |
| baseline | ${humanArtifact.baseline.timeToTrustedAnswerMs}ms | ${humanArtifact.baseline.evidenceSteps} | ${humanArtifact.baseline.workspaceSwitches} | ${formatRawJson(humanArtifact.baseline.rawJsonNeeded)} | ${humanArtifact.baseline.confidenceRating} | ${humanArtifact.baseline.proofId ?? ''} | ${humanArtifact.baseline.replayToken ?? ''} |
| review-packet | ${humanArtifact.reviewPacket.timeToTrustedAnswerMs}ms | ${humanArtifact.reviewPacket.evidenceSteps} | ${humanArtifact.reviewPacket.workspaceSwitches} | ${formatRawJson(humanArtifact.reviewPacket.rawJsonNeeded)} | ${humanArtifact.reviewPacket.confidenceRating} | ${humanArtifact.reviewPacket.proofId ?? ''} | ${humanArtifact.reviewPacket.replayToken ?? ''} |

## Threshold Check

| Gate | Result |
| --- | --- |
| repeated ask stable | ${boolPass(humanArtifact.proxyGuards?.repeatedAskStable)} |
| replay parity | ${boolPass(humanArtifact.proxyGuards?.replayParity)} |
| proof identity stable | ${boolPass(humanArtifact.proxyGuards?.proofIdentityStable)} |
| time improved by at least 40% | ${boolPass(thresholdChecks.timeImprovedByFortyPercent)} |
| evidence steps reduced by at least 2 | ${boolPass(thresholdChecks.evidenceStepsReducedByTwo)} |
| workspace switches reduced by at least 1 | ${boolPass(thresholdChecks.workspaceSwitchesReducedByOne)} |
| raw JSON eliminated | ${boolPass(thresholdChecks.rawJsonEliminated)} |
| confidence not worse than baseline | ${boolPass(thresholdChecks.confidenceNotWorse)} |

## Interpretation

Human comparison:
- time improvement ratio: \`${formatPercent(humanArtifact.thresholds?.timeImprovementRatio)}\`
- evidence-step delta: \`${humanArtifact.thresholds?.evidenceStepDelta ?? 'n/a'}\`
- workspace-switch delta: \`${humanArtifact.thresholds?.workspaceSwitchDelta ?? 'n/a'}\`
- confidence delta: \`${humanArtifact.thresholds?.confidenceDelta ?? 'n/a'}\`
- overall result: \`${humanArtifact.passed ? 'PASS' : 'FAIL'}\`

Proxy notes:
${proxyNotes.length > 0 ? proxyNotes.map((note) => `- ${note}`).join('\n') : '- none recorded'}

Human notes:
${noteLines}

## Publication Discipline

- generated from artifacts with \`pnpm phase17:benchmark:human:publish\`
- manual transcription into this file is not allowed
- synthetic or smoke-only human artifacts are rejected unless \`--allow-synthetic\` is used for a non-canonical preview
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(helpText);
    return;
  }

  const proxyArtifactPath = path.resolve(args['proxy-artifact'] ?? defaultProxyArtifactPath);
  const humanArtifactPath = path.resolve(args['human-artifact'] ?? defaultHumanArtifactPath);
  const outMdPath = path.resolve(args['out-md'] ?? defaultOutMdPath);

  const proxyArtifact = await readJson(proxyArtifactPath);
  const humanArtifact = await readJson(humanArtifactPath);
  const syntheticCheck = detectSyntheticHumanArtifact(humanArtifact, humanArtifactPath);

  if (syntheticCheck.synthetic && !args['allow-synthetic']) {
    throw new Error(
      `Refusing to publish synthetic human benchmark artifact (${syntheticCheck.signals.join(
        '; '
      )}). Use --allow-synthetic only for non-canonical preview output.`
    );
  }

  if (syntheticCheck.synthetic && isCanonicalOutput(outMdPath)) {
    throw new Error(
      'Refusing to write synthetic or smoke-only evidence to the canonical benchmark results file.'
    );
  }

  const markdown = buildMarkdown(proxyArtifact, humanArtifact, {
    proxyArtifactPath: relativePath(proxyArtifactPath),
    humanArtifactPath: relativePath(humanArtifactPath)
  });

  await fs.mkdir(path.dirname(outMdPath), { recursive: true });
  await fs.writeFile(outMdPath, markdown, 'utf8');

  process.stdout.write(
    `${JSON.stringify(
      {
        proxyArtifactPath: relativePath(proxyArtifactPath),
        humanArtifactPath: relativePath(humanArtifactPath),
        outMdPath: relativePath(outMdPath),
        synthetic: syntheticCheck.synthetic,
        passed: Boolean(humanArtifact.passed)
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(helpText);
  process.exit(1);
});
