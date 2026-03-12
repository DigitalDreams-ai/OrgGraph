import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const HEAVY_PREFIXES = ['apps/', 'packages/', 'scripts/'];
const HEAVY_EXACT = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.npmrc',
  '.github/requirements-cumulusci.txt',
  '.github/workflows/ci.yml'
]);

export function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\/+/, '');
}

export function isHeavyPath(value) {
  const path = normalizePath(value);
  if (!path) {
    return false;
  }

  if (HEAVY_EXACT.has(path)) {
    return true;
  }

  return HEAVY_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function detectHeavyChanges(paths) {
  const normalizedPaths = Array.from(new Set((paths || []).map(normalizePath).filter(Boolean)));
  const heavyPaths = normalizedPaths.filter(isHeavyPath);
  return {
    heavy: heavyPaths.length > 0,
    changedPaths: normalizedPaths,
    heavyPaths
  };
}

export function getChangedPaths(base, head) {
  if (/^0+$/.test(base)) {
    const stdout = execFileSync('git', ['show', '--pretty=', '--name-only', head], { encoding: 'utf8' });
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const args = ['diff', '--name-only', base, head];
  const stdout = execFileSync('git', args, { encoding: 'utf8' });
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function appendGitHubOutput(lines) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  appendFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      continue;
    }
    args[arg.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.base;
  const head = args.head;

  if (!base || !head) {
    throw new Error('ci-detect-heavy-changes requires --base and --head');
  }

  const result = detectHeavyChanges(getChangedPaths(base, head));
  appendGitHubOutput([
    `run-heavy=${result.heavy ? 'true' : 'false'}`,
    `heavy-count=${String(result.heavyPaths.length)}`
  ]);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
