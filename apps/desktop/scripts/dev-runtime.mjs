#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const workspaceRoot = new URL('../../../', import.meta.url);
const apiPort = process.env.ORGUMENTED_DESKTOP_API_PORT || '3100';
const webPort = process.env.ORGUMENTED_DESKTOP_WEB_PORT || '3001';
const hostname = process.env.ORGUMENTED_DESKTOP_HOST || '127.0.0.1';

const children = [];
let shuttingDown = false;

function startChild(name, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: workspaceRoot,
    env: { ...process.env, ...env },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      process.stderr.write(`[${name}] exited unexpectedly (code=${code ?? 'null'} signal=${signal ?? 'null'})\n`);
      shutdown(code ?? 1);
    }
  });
  children.push(child);
  return child;
}

function runSetupStep(name, command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    env: { ...process.env, ...env },
    shell: false,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    process.stderr.write(`[${name}] setup failed with code=${result.status ?? 1}\n`);
    process.exit(result.status ?? 1);
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(exitCode), 250);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

process.stdout.write(
  `[desktop-runtime] starting api on ${hostname}:${apiPort} and web on ${hostname}:${webPort}\n`
);

runSetupStep('api-build', 'pnpm', ['--filter', 'api', 'build']);

startChild('api', 'pnpm', ['--filter', 'api', 'start'], {
  PORT: apiPort
});

startChild('web', 'pnpm', ['--filter', 'web', 'exec', 'next', 'dev', '--hostname', hostname, '--port', webPort], {});
