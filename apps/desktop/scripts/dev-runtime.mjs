#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const workspaceRoot = new URL('../../../', import.meta.url);
const apiPort = process.env.ORGUMENTED_DESKTOP_API_PORT || '3100';
const webPort = process.env.ORGUMENTED_DESKTOP_WEB_PORT || '3001';
const hostname = process.env.ORGUMENTED_DESKTOP_HOST || '127.0.0.1';
const webMode = (process.env.ORGUMENTED_DESKTOP_WEB_MODE || 'production').toLowerCase();
const rebuildWeb = process.env.ORGUMENTED_DESKTOP_WEB_REBUILD === '1';
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const standaloneWebServer = fileURLToPath(
  new URL('../../web/.next/standalone/apps/web/server.js', import.meta.url)
);
const windowsCliPaths = process.platform === 'win32'
  ? [
      process.env.APPDATA ? path.join(process.env.APPDATA, 'npm') : undefined,
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.local', 'bin') : undefined,
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.cargo', 'bin') : undefined
    ].filter((entry) => Boolean(entry))
  : [];

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
  const mergedEnv = buildRuntimeEnv(env);
  const child = spawn(resolved.command, resolved.args, {
    cwd: workspaceRoot,
    env: mergedEnv,
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
  const mergedEnv = buildRuntimeEnv(env);
  const result = spawnSync(resolved.command, resolved.args, {
    cwd: workspaceRoot,
    env: mergedEnv,
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

function buildRuntimeEnv(env = {}) {
  const mergedEnv = { ...process.env, ...env };
  if (process.platform !== 'win32') {
    return mergedEnv;
  }

  const separator = ';';
  const existingPath = mergedEnv.PATH || process.env.PATH || '';
  const pathEntries = existingPath
    .split(separator)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  for (const cliPath of windowsCliPaths) {
    if (!pathEntries.includes(cliPath)) {
      pathEntries.unshift(cliPath);
    }
  }
  return {
    ...mergedEnv,
    PATH: pathEntries.join(separator),
    ComSpec: mergedEnv.ComSpec || process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
    SystemRoot: mergedEnv.SystemRoot || process.env.SystemRoot || 'C:\\Windows'
  };
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
  `[desktop-runtime] starting api on ${hostname}:${apiPort} and web on ${hostname}:${webPort} (mode=${webMode})\n`
);

runSetupStep('api-build', pnpmCommand, ['--filter', 'api', 'build']);
if (webMode === 'production' && (rebuildWeb || !existsSync(standaloneWebServer))) {
  runSetupStep('web-build', pnpmCommand, ['--filter', 'web', 'build']);
}

startChild('api', pnpmCommand, ['--filter', 'api', 'start'], {
  PORT: apiPort
});

startChild(
  'web',
  webMode === 'development' ? pnpmCommand : process.execPath,
  webMode === 'development'
    ? ['--filter', 'web', 'dev', '--hostname', hostname, '--port', webPort]
    : [standaloneWebServer],
  webMode === 'development'
    ? {}
    : {
        HOSTNAME: hostname,
        PORT: webPort
      }
);
