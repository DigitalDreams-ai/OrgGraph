#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const workspaceRoot = new URL('../../../', import.meta.url);
const apiPort = process.env.ORGUMENTED_DESKTOP_API_PORT || '3100';
const webPort = process.env.ORGUMENTED_DESKTOP_WEB_PORT || '3001';
const hostname = process.env.ORGUMENTED_DESKTOP_HOST || '127.0.0.1';
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function resolveCommand(command, args) {
  if (process.platform !== 'win32') {
    return { command, args, shell: false };
  }

  if (command.toLowerCase().endsWith('.cmd')) {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', command, ...args],
      shell: false
    };
  }

  return { command, args, shell: false };
}

const children = [];
let shuttingDown = false;

function startChild(name, command, args, env = {}) {
  const resolved = resolveCommand(command, args);
  const child = spawn(resolved.command, resolved.args, {
    cwd: workspaceRoot,
    env: { ...process.env, ...env },
    shell: resolved.shell,
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
  const resolved = resolveCommand(command, args);
  const result = spawnSync(resolved.command, resolved.args, {
    cwd: workspaceRoot,
    env: { ...process.env, ...env },
    shell: resolved.shell,
    stdio: 'inherit'
  });
  if (result.error) {
    process.stderr.write(`[${name}] setup failed before launch: ${result.error.message}\n`);
    process.exit(result.status ?? 1);
  }
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

runSetupStep('api-build', pnpmCommand, ['--filter', 'api', 'build']);

startChild('api', pnpmCommand, ['--filter', 'api', 'start'], {
  PORT: apiPort
});

startChild('web', pnpmCommand, ['--filter', 'web', 'dev', '--hostname', hostname, '--port', webPort], {});
