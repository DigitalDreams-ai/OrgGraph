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
  pnpm phase17:benchmark:human:verify [options]

Optional:
  --proxy-artifact <path>            Defaults to logs/high-risk-review-benchmark.json
  --human-artifact <path>            Defaults to logs/high-risk-review-human-benchmark.json
  --results-md <path>                Defaults to docs/planning/v2/HIGH_RISK_REVIEW_BENCHMARK_RESULTS.md
  --allow-synthetic                  Permit synthetic or smoke-only artifacts for non-canonical verification

Example:
  pnpm phase17:benchmark:human:verify
  pnpm phase17:benchmark:human:verify -- --human-artifact logs/high-risk-review-human-benchmark.test.json --results-md logs/high-risk-review-benchmark-results.test.md --allow-synthetic
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

function fail(message) {
  throw new Error(message);
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

  const [proxyArtifact, humanArtifact, resultsMarkdown] = await Promise.all([
    readJson(proxyArtifactPath),
    readJson(humanArtifactPath),
    readText(resultsPath)
  ]);

  const syntheticCheck = detectSyntheticHumanArtifact(humanArtifact, humanArtifactPath);
  if (syntheticCheck.synthetic && !args['allow-synthetic']) {
    fail(
      `Refusing synthetic or smoke-only human benchmark artifact (${syntheticCheck.signals.join(
        '; '
      )}).`
    );
  }

  if (syntheticCheck.synthetic && isCanonicalResults(resultsPath)) {
    fail('Canonical benchmark verification requires a non-synthetic human artifact.');
  }

  if (humanArtifact.passed !== true) {
    fail('Human benchmark artifact does not pass the Stage 1 threshold checks.');
  }

  if (humanArtifact.proxyGuards?.repeatedAskStable !== true) {
    fail('Human benchmark artifact does not preserve repeated ask stability.');
  }

  if (humanArtifact.proxyGuards?.replayParity !== true) {
    fail('Human benchmark artifact does not preserve replay parity.');
  }

  if (humanArtifact.proxyGuards?.proofIdentityStable !== true) {
    fail('Human benchmark artifact does not preserve proof identity stability.');
  }

  if (proxyArtifact?.scenario?.reviewQuery !== humanArtifact.query) {
    fail('Human benchmark query does not match the current proxy benchmark scenario.');
  }

  if (!resultsContain(resultsMarkdown, humanArtifact.captureTemplateSignature)) {
    fail('Published benchmark results do not contain the human capture-template signature.');
  }

  if (!resultsContain(resultsMarkdown, humanArtifact.proxyArtifactHash)) {
    fail('Published benchmark results do not contain the human proxy-artifact hash.');
  }

  if (!resultsContain(resultsMarkdown, humanArtifact.captureTemplatePath)) {
    fail('Published benchmark results do not contain the human capture-template path.');
  }

  if (!resultsContain(resultsMarkdown, humanArtifact.operator)) {
    fail('Published benchmark results do not contain the human benchmark operator.');
  }

  const summary = {
    verified: true,
    synthetic: syntheticCheck.synthetic,
    proxyArtifactPath: relativePath(proxyArtifactPath),
    humanArtifactPath: relativePath(humanArtifactPath),
    resultsPath: relativePath(resultsPath),
    query: humanArtifact.query,
    operator: humanArtifact.operator,
    passed: humanArtifact.passed
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(helpText);
  process.exit(1);
});
