import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');

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
  1. runs pnpm desktop:smoke:release unless --skip-smoke is set
  2. runs pnpm phase17:benchmark unless --skip-proxy is set
  3. runs pnpm phase17:benchmark:human:prepare with your operator name
  4. prints the exact pnpm phase17:benchmark:human command you should execute after the manual run
`;

function parseArgs(argv) {
  const args = {
    extras: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
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
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
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

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(helpText);
    return;
  }

  if (!args.operator) {
    throw new Error('Missing required argument --operator');
  }

  if (!args['skip-smoke']) {
    runCommand('pnpm', ['desktop:smoke:release']);
  }

  if (!args['skip-proxy']) {
    runCommand('pnpm', ['phase17:benchmark']);
  }

  runCommand('pnpm', buildPrepareArgs(args));

  process.stdout.write('\nHuman benchmark session is prepared.\n');
  process.stdout.write('After you complete the manual desktop review, run:\n\n');
  process.stdout.write(`${buildCaptureCommand(args)}\n\n`);
  process.stdout.write('Then publish canonical results with:\n\n');
  process.stdout.write('pnpm phase17:benchmark:human:publish\n');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(helpText);
  process.exit(1);
}
