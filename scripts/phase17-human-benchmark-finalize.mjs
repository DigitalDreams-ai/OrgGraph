import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');

const helpText = `Usage:
  pnpm phase17:benchmark:human:finalize [options]

Optional:
  --proxy-artifact <path>            Forwarded to publish and verify
  --human-artifact <path>            Forwarded to publish and verify
  --results-md <path>                Forwarded to publish and verify
  --allow-synthetic                  Permit synthetic or smoke-only artifacts for non-canonical preview verification
  --help

What it does:
  1. runs pnpm phase17:benchmark:human:publish
  2. runs pnpm phase17:benchmark:human:verify against the same artifact set
  3. fails closed if either step fails
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

function buildPublishArgs(args) {
  const forwarded = [];
  if (args['proxy-artifact']) {
    forwarded.push('--proxy-artifact', args['proxy-artifact']);
  }
  if (args['human-artifact']) {
    forwarded.push('--human-artifact', args['human-artifact']);
  }
  if (args['results-md']) {
    forwarded.push('--out-md', args['results-md']);
  }
  if (args['allow-synthetic']) {
    forwarded.push('--allow-synthetic');
  }

  return forwarded;
}

function buildVerifyArgs(args) {
  const forwarded = [];

  if (args['proxy-artifact']) {
    forwarded.push('--proxy-artifact', args['proxy-artifact']);
  }
  if (args['human-artifact']) {
    forwarded.push('--human-artifact', args['human-artifact']);
  }
  if (args['results-md']) {
    forwarded.push('--results-md', args['results-md']);
  }
  if (args['allow-synthetic']) {
    forwarded.push('--allow-synthetic');
  }

  return forwarded;
}

function runCommand(label, args) {
  const result = spawnSync('pnpm', args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed.`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(helpText);
    return;
  }

  const publishArgs = buildPublishArgs(args);
  const verifyArgs = buildVerifyArgs(args);

  runCommand('Human benchmark publication', [
    'phase17:benchmark:human:publish',
    ...(publishArgs.length > 0 ? ['--', ...publishArgs] : [])
  ]);

  runCommand('Human benchmark verification', [
    'phase17:benchmark:human:verify',
    ...(verifyArgs.length > 0 ? ['--', ...verifyArgs] : [])
  ]);

  process.stdout.write(
    `${JSON.stringify(
      {
        finalized: true,
        syntheticPreview: Boolean(args['allow-synthetic'])
      },
      null,
      2
    )}\n`
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(helpText);
  process.exit(1);
}
