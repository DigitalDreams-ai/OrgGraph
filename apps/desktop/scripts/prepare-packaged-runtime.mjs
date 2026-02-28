#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const desktopRoot = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = path.resolve(desktopRoot, '../..');
const runtimeRoot = path.join(desktopRoot, 'src-tauri', 'runtime');
const runtimeWebRoot = path.join(runtimeRoot, 'web');
const runtimeApiRoot = path.join(runtimeRoot, 'api');
const runtimeNodeRoot = path.join(runtimeRoot, 'node');
const runtimeConfigPath = path.join(runtimeRoot, 'config.json');
const webNextRoot = path.join(workspaceRoot, 'apps', 'web', '.next');
const webIndexPath = path.join(webNextRoot, 'server', 'app', 'index.html');
const webStaticPath = path.join(webNextRoot, 'static');
const nodeBinaryName = process.platform === 'win32' ? 'node.exe' : 'node';
const runtimeNodePath = path.join(runtimeNodeRoot, nodeBinaryName);
const packagedConfigKeys = [
  'SF_INTEGRATION_ENABLED',
  'CCI_VERSION_PIN',
  'SF_ALIAS',
  'SF_BASE_URL',
  'SF_PROJECT_PATH',
  'SF_PARSE_PATH',
  'SF_WAIT_MINUTES',
  'SF_RETRY_COUNT',
  'SF_RETRY_DELAY_MS',
  'SF_TIMEOUT_SECONDS',
  'SF_AUTO_REFRESH_AFTER_RETRIEVE'
];

function parseDotenvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const raw = readFileSync(filePath, 'utf8');
  const entries = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

function resolvePackagedConfig() {
  const fileDefaults = {
    ...parseDotenvFile(path.join(workspaceRoot, '.env.example')),
    ...parseDotenvFile(path.join(workspaceRoot, '.env.sample')),
    ...parseDotenvFile(path.join(workspaceRoot, '.env')),
    ...parseDotenvFile(path.join(workspaceRoot, '.env.local'))
  };

  const config = {};
  for (const key of packagedConfigKeys) {
    const value = process.env[key] ?? fileDefaults[key];
    if (value !== undefined && String(value).trim() !== '') {
      config[key] = value;
    }
  }
  return config;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForReadableCopy(filePath, attempts = 30, delayMs = 500) {
  if (!existsSync(filePath)) {
    return;
  }

  const probePath = `${filePath}.probe`;
  for (let index = 0; index < attempts; index += 1) {
    try {
      cpSync(filePath, probePath);
      rmSync(probePath, { force: true });
      return;
    } catch (error) {
      rmSync(probePath, { force: true });
      if (index === attempts - 1) {
        throw new Error(`runtime file remained locked after deploy: ${filePath} (${error.message})`);
      }
      sleep(delayMs);
    }
  }
}

function runStep(name, command, args) {
  const commandArgs =
    process.platform === 'win32' && command.toLowerCase().endsWith('.cmd')
      ? ['cmd.exe', ['/d', '/s', '/c', command, ...args]]
      : [command, args];
  const result = spawnSync(commandArgs[0], commandArgs[1], {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
    shell: false
  });

  if (result.error) {
    throw new Error(`${name} failed before launch: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${name} failed with code=${result.status ?? 1}`);
  }
}

function ensureExists(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} missing at ${filePath}`);
  }
}

rmSync(runtimeRoot, { recursive: true, force: true });
mkdirSync(runtimeWebRoot, { recursive: true });
mkdirSync(runtimeApiRoot, { recursive: true });
mkdirSync(runtimeNodeRoot, { recursive: true });

runStep('web-build', 'pnpm.cmd', ['--filter', 'web', 'build']);
runStep('api-build', 'pnpm.cmd', ['--filter', 'api', 'build']);
runStep('api-deploy', 'pnpm.cmd', ['--filter', 'api', 'deploy', '--prod', runtimeApiRoot]);
waitForReadableCopy(path.join(runtimeApiRoot, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'));

ensureExists(webIndexPath, 'web index');
ensureExists(webStaticPath, 'web static assets');
ensureExists(process.execPath, 'node runtime');
ensureExists(path.join(runtimeApiRoot, 'dist', 'main.js'), 'deployed api entrypoint');

cpSync(webIndexPath, path.join(runtimeWebRoot, 'index.html'));
cpSync(webStaticPath, path.join(runtimeWebRoot, '_next', 'static'), { recursive: true });
cpSync(process.execPath, runtimeNodePath);

writeFileSync(
  path.join(runtimeRoot, 'manifest.json'),
  JSON.stringify(
    {
      nodeBinary: nodeBinaryName,
      nodeVersion: process.version,
      apiEntry: path.join('api', 'dist', 'main.js'),
      webEntry: path.join('web', 'index.html'),
      configEntry: 'config.json'
    },
    null,
    2
  )
);

writeFileSync(runtimeConfigPath, JSON.stringify(resolvePackagedConfig(), null, 2));
