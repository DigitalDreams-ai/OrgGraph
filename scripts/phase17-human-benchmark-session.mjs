import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:3100';
const packagedExePath = path.join(
  repoRoot,
  'apps',
  'desktop',
  'src-tauri',
  'target',
  'release',
  'orgumented-desktop.exe'
);

const helpText = `Usage:
  pnpm phase17:benchmark:human:session -- --operator "<name>" [options]

Required:
  --operator "<name>"

Optional:
  --query "<text>"                   Override the benchmark query passed into the prepare step
  --proxy-artifact <path>            Forwarded to phase17:benchmark:human:prepare
  --out-json <path>                  Forwarded to phase17:benchmark:human:prepare
  --out-md <path>                    Forwarded to phase17:benchmark:human:prepare
  --skip-smoke                       Skip pnpm desktop:smoke:release
  --skip-proxy                       Skip pnpm phase17:benchmark
  --help

What it does:
  1. archives stale human Phase 17 artifacts with pnpm phase17:benchmark:human:reset --preserve-proxy
  2. runs pnpm desktop:smoke:release unless --skip-smoke is set
  3. launches the packaged desktop runtime and waits for /ready
  4. refreshes pnpm phase17:benchmark unless --skip-proxy is set
  5. runs pnpm phase17:benchmark:human:prepare with your operator name
  6. prints the exact pnpm phase17:benchmark:human command you should execute after the manual run
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
    if (key === 'help' || key === 'skip-smoke' || key === 'skip-proxy') {
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

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function runPowerShell(command) {
  const result = spawnSync(
    'pwsh',
    ['-NoProfile', '-Command', command],
    {
      cwd: repoRoot,
      env: process.env,
      shell: false,
      encoding: 'utf8'
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `PowerShell command failed: ${command}`);
  }

  return result.stdout?.trim() ?? '';
}

function escapePowerShell(value) {
  return value.replaceAll("'", "''");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function isReady() {
  try {
    const response = await fetch(`${apiUrl}/ready`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      return false;
    }
    const body = await response.json();
    return body?.status === 'ready';
  } catch {
    return false;
  }
}

function launchPackagedRuntime() {
  runPowerShell(
    `Start-Process -FilePath '${escapePowerShell(packagedExePath)}' -WorkingDirectory '${escapePowerShell(path.dirname(packagedExePath))}'`
  );
}

async function ensureGroundedRuntime() {
  if (await isReady()) {
    return;
  }

  if (!(await fileExists(packagedExePath))) {
    throw new Error(`Packaged desktop runtime not found at ${packagedExePath}. Run pnpm desktop:build first.`);
  }

  launchPackagedRuntime();

  const attempts = 180;
  for (let index = 0; index < attempts; index += 1) {
    if (await isReady()) {
      return;
    }
    await sleep(1000);
  }

  throw new Error(`Packaged desktop runtime did not reach ${apiUrl}/ready in time.`);
}

function buildPrepareArgs(args) {
  const prepareArgs = ['phase17:benchmark:human:prepare', '--', '--operator', args.operator];

  if (args.query) {
    prepareArgs.push('--query', args.query);
  }
  if (args['proxy-artifact']) {
    prepareArgs.push('--proxy-artifact', args['proxy-artifact']);
  }
  if (args['out-json']) {
    prepareArgs.push('--out-json', args['out-json']);
  }
  if (args['out-md']) {
    prepareArgs.push('--out-md', args['out-md']);
  }

  return prepareArgs;
}

function buildCaptureCommand(args) {
  const command = [
    'pnpm phase17:benchmark:human --',
    `--capture-template "${args['out-json'] ?? 'logs/high-risk-review-human-capture-template.json'}"`,
    `--operator "${args.operator}"`
  ];

  if (args.query) {
    command.push(`--query "${args.query}"`);
  }
  if (args['proxy-artifact']) {
    command.push(`--proxy-artifact "${args['proxy-artifact']}"`);
  }

  command.push('--baseline-time-ms <ms>');
  command.push('--baseline-evidence-steps <n>');
  command.push('--baseline-workspace-switches <n>');
  command.push('--baseline-raw-json yes');
  command.push('--baseline-confidence <1-5>');
  command.push('--review-time-ms <ms>');
  command.push('--review-evidence-steps <n>');
  command.push('--review-workspace-switches <n>');
  command.push('--review-raw-json no');
  command.push('--review-confidence <1-5>');
  command.push('--notes "<observation>"');

  return command.join(' ');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(helpText);
    return;
  }

  if (!args.operator) {
    throw new Error('Missing required argument --operator');
  }

  runCommand('pnpm', ['phase17:benchmark:human:reset', '--', '--preserve-proxy']);

  if (!args['skip-smoke']) {
    runCommand('pnpm', ['desktop:smoke:release']);
  }

  await ensureGroundedRuntime();

  if (!args['skip-proxy']) {
    runCommand('pnpm', ['phase17:benchmark']);
  }

  runCommand('pnpm', buildPrepareArgs(args));

  process.stdout.write('\nHuman benchmark session is prepared.\n');
  process.stdout.write('Orgumented should now remain open for the manual review.\n');
  process.stdout.write('After you complete the manual desktop review, run:\n\n');
  process.stdout.write(`${buildCaptureCommand(args)}\n\n`);
  process.stdout.write('Then publish and verify canonical results with:\n\n');
  process.stdout.write('pnpm phase17:benchmark:human:finalize\n');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(helpText);
  process.exit(1);
}
