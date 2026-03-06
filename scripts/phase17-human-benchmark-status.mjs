import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const defaultProxyArtifactPath = path.join(repoRoot, 'logs', 'high-risk-review-benchmark.json');
const defaultHumanArtifactPath = path.join(repoRoot, 'logs', 'high-risk-review-human-benchmark.json');
const defaultResultsPath = path.join(
  repoRoot,
  'docs',
  'planning',
  'v2',
  'HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md'
);

const helpText = `Usage:
  pnpm phase17:benchmark:human:status [options]

Optional:
  --proxy-artifact <path>            Defaults to logs/high-risk-review-benchmark.json
  --human-artifact <path>            Defaults to logs/high-risk-review-human-benchmark.json
  --results-md <path>                Defaults to docs/planning/v2/HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md
  --allow-synthetic                  Permit synthetic or smoke-only artifacts for non-canonical status checks
  --help

What it does:
  - reports whether Stage 1 human benchmark evidence is still pending, synthetic-only, unverified, or fully verified
  - fails closed only for malformed command usage; evidence gaps are reported as structured status output
`;

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') {
      continue;
    }
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

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll('\\', '/');
}

function isCanonicalResults(filePath) {
  return path.resolve(filePath) === path.resolve(defaultResultsPath);
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

function resultsContain(resultsMarkdown, value) {
  return typeof value === 'string' && value.length > 0 && resultsMarkdown.includes(value);
}

function buildSummary({
  code,
  verified,
  reason,
  proxyArtifactPath,
  humanArtifactPath,
  resultsPath,
  synthetic,
  operator,
  query
}) {
  return {
    status: code,
    verified,
    reason,
    synthetic,
    proxyArtifactPath: relativePath(proxyArtifactPath),
    humanArtifactPath: relativePath(humanArtifactPath),
    resultsPath: relativePath(resultsPath),
    operator: operator ?? null,
    query: query ?? null
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(helpText);
    return;
  }

  const proxyArtifactPath = path.resolve(args['proxy-artifact'] ?? defaultProxyArtifactPath);
  const humanArtifactPath = path.resolve(args['human-artifact'] ?? defaultHumanArtifactPath);
  const resultsPath = path.resolve(args['results-md'] ?? defaultResultsPath);

  if (!(await pathExists(proxyArtifactPath))) {
    process.stdout.write(
      `${JSON.stringify(
        buildSummary({
          code: 'pending_proxy_artifact_missing',
          verified: false,
          reason: 'Proxy benchmark artifact is missing.',
          proxyArtifactPath,
          humanArtifactPath,
          resultsPath,
          synthetic: false
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  if (!(await pathExists(humanArtifactPath))) {
    process.stdout.write(
      `${JSON.stringify(
        buildSummary({
          code: 'pending_human_artifact_missing',
          verified: false,
          reason: 'No real human benchmark artifact is present yet.',
          proxyArtifactPath,
          humanArtifactPath,
          resultsPath,
          synthetic: false
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  const humanArtifact = await readJson(humanArtifactPath);
  const syntheticCheck = detectSyntheticHumanArtifact(humanArtifact, humanArtifactPath);

  if (syntheticCheck.synthetic && !args['allow-synthetic']) {
    process.stdout.write(
      `${JSON.stringify(
        buildSummary({
          code: 'pending_synthetic_human_artifact',
          verified: false,
          reason: `Human benchmark artifact is synthetic or smoke-only (${syntheticCheck.signals.join(
            '; '
          )}).`,
          proxyArtifactPath,
          humanArtifactPath,
          resultsPath,
          synthetic: true,
          operator: humanArtifact.operator,
          query: humanArtifact.query
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  if (!(await pathExists(resultsPath))) {
    process.stdout.write(
      `${JSON.stringify(
        buildSummary({
          code: 'pending_results_missing',
          verified: false,
          reason: 'Canonical benchmark results markdown is missing.',
          proxyArtifactPath,
          humanArtifactPath,
          resultsPath,
          synthetic: syntheticCheck.synthetic,
          operator: humanArtifact.operator,
          query: humanArtifact.query
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  const [proxyArtifact, resultsMarkdown] = await Promise.all([
    readJson(proxyArtifactPath),
    readText(resultsPath)
  ]);

  if (syntheticCheck.synthetic && isCanonicalResults(resultsPath)) {
    process.stdout.write(
      `${JSON.stringify(
        buildSummary({
          code: 'pending_canonical_results_synthetic',
          verified: false,
          reason: 'Canonical results cannot be backed by a synthetic human artifact.',
          proxyArtifactPath,
          humanArtifactPath,
          resultsPath,
          synthetic: true,
          operator: humanArtifact.operator,
          query: humanArtifact.query
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  if (humanArtifact.passed !== true) {
    process.stdout.write(
      `${JSON.stringify(
        buildSummary({
          code: 'pending_threshold_failure',
          verified: false,
          reason: 'Human benchmark artifact does not pass the Stage 1 threshold checks.',
          proxyArtifactPath,
          humanArtifactPath,
          resultsPath,
          synthetic: syntheticCheck.synthetic,
          operator: humanArtifact.operator,
          query: humanArtifact.query
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  if (
    humanArtifact.proxyGuards?.repeatedAskStable !== true ||
    humanArtifact.proxyGuards?.replayParity !== true ||
    humanArtifact.proxyGuards?.proofIdentityStable !== true ||
    humanArtifact.proxyGuards?.reviewPacketSpecificity !== true
  ) {
    process.stdout.write(
      `${JSON.stringify(
        buildSummary({
          code: 'pending_replay_or_proof_guard_failure',
          verified: false,
          reason: 'Human benchmark artifact does not preserve replay/proof guard requirements.',
          proxyArtifactPath,
          humanArtifactPath,
          resultsPath,
          synthetic: syntheticCheck.synthetic,
          operator: humanArtifact.operator,
          query: humanArtifact.query
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  if (proxyArtifact?.scenario?.reviewQuery !== humanArtifact.query) {
    process.stdout.write(
      `${JSON.stringify(
        buildSummary({
          code: 'pending_query_mismatch',
          verified: false,
          reason: 'Human benchmark query does not match the current proxy benchmark scenario.',
          proxyArtifactPath,
          humanArtifactPath,
          resultsPath,
          synthetic: syntheticCheck.synthetic,
          operator: humanArtifact.operator,
          query: humanArtifact.query
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  const missingFields = [];
  if (!resultsContain(resultsMarkdown, humanArtifact.captureTemplateSignature)) {
    missingFields.push('captureTemplateSignature');
  }
  if (!resultsContain(resultsMarkdown, humanArtifact.proxyArtifactHash)) {
    missingFields.push('proxyArtifactHash');
  }
  if (!resultsContain(resultsMarkdown, humanArtifact.captureTemplatePath)) {
    missingFields.push('captureTemplatePath');
  }
  if (!resultsContain(resultsMarkdown, humanArtifact.operator)) {
    missingFields.push('operator');
  }

  if (missingFields.length > 0) {
    process.stdout.write(
      `${JSON.stringify(
        buildSummary({
          code: 'pending_results_unverified',
          verified: false,
          reason: `Published benchmark results are missing provenance fields: ${missingFields.join(
            ', '
          )}.`,
          proxyArtifactPath,
          humanArtifactPath,
          resultsPath,
          synthetic: syntheticCheck.synthetic,
          operator: humanArtifact.operator,
          query: humanArtifact.query
        }),
        null,
        2
      )}\n`
    );
    return;
  }

  process.stdout.write(
    `${JSON.stringify(
      buildSummary({
        code: syntheticCheck.synthetic ? 'verified_synthetic_preview' : 'verified_real_human_evidence',
        verified: true,
        reason: syntheticCheck.synthetic
          ? 'Synthetic benchmark evidence passed guard checks in allow-synthetic preview mode.'
          : 'Real human benchmark evidence is present, passed, and matches the published results provenance.',
        proxyArtifactPath,
        humanArtifactPath,
        resultsPath,
        synthetic: syntheticCheck.synthetic,
        operator: humanArtifact.operator,
        query: humanArtifact.query
      }),
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
