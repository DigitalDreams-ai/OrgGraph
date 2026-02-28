#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const desktopRoot = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = path.resolve(desktopRoot, '../..');
const runtimeRoot = path.join(desktopRoot, 'src-tauri', 'runtime');
const runtimeWebRoot = path.join(runtimeRoot, 'web');
const runtimeApiRoot = path.join(runtimeRoot, 'api');
const runtimeNodeRoot = path.join(runtimeRoot, 'node');
const runtimeConfigPath = path.join(runtimeRoot, 'config.json');
const runtimeApiBundlePath = path.join(runtimeApiRoot, 'main.cjs');
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
const packagedApiPruneTargets = [
  'apps',
  'dist',
  'package.json',
  'src',
  'test',
  'nest-cli.json',
  'tsconfig.build.json',
  'tsconfig.json',
  path.join('node_modules', '.modules.yaml'),
  path.join('node_modules', '.pnpm'),
  path.join('node_modules', '.bin'),
  path.join('node_modules', '@orgumented'),
  path.join('node_modules', '@nestjs'),
  path.join('node_modules', 'accepts'),
  path.join('node_modules', 'append-field'),
  path.join('node_modules', 'array-flatten'),
  path.join('node_modules', 'base64-js'),
  path.join('node_modules', 'body-parser'),
  path.join('node_modules', 'busboy'),
  path.join('node_modules', 'bytes'),
  path.join('node_modules', 'concat-stream'),
  path.join('node_modules', 'consola'),
  path.join('node_modules', 'content-disposition'),
  path.join('node_modules', 'content-type'),
  path.join('node_modules', 'cookie'),
  path.join('node_modules', 'cookie-signature'),
  path.join('node_modules', 'cors'),
  path.join('node_modules', 'debug'),
  path.join('node_modules', 'depd'),
  path.join('node_modules', 'destroy'),
  path.join('node_modules', 'ee-first'),
  path.join('node_modules', 'encodeurl'),
  path.join('node_modules', 'es-errors'),
  path.join('node_modules', 'escape-html'),
  path.join('node_modules', 'etag'),
  path.join('node_modules', 'express'),
  path.join('node_modules', 'fast-xml-parser'),
  path.join('node_modules', 'fflate'),
  path.join('node_modules', 'finalhandler'),
  path.join('node_modules', 'forwarded'),
  path.join('node_modules', 'fresh'),
  path.join('node_modules', 'function-bind'),
  path.join('node_modules', 'get-intrinsic'),
  path.join('node_modules', 'get-proto'),
  path.join('node_modules', 'gopd'),
  path.join('node_modules', 'has-symbols'),
  path.join('node_modules', 'hasown'),
  path.join('node_modules', 'http-errors'),
  path.join('node_modules', 'iconv-lite'),
  path.join('node_modules', 'inherits'),
  path.join('node_modules', 'ipaddr.js'),
  path.join('node_modules', 'isarray'),
  path.join('node_modules', 'math-intrinsics'),
  path.join('node_modules', 'media-typer'),
  path.join('node_modules', 'merge-descriptors'),
  path.join('node_modules', 'methods'),
  path.join('node_modules', 'mime'),
  path.join('node_modules', 'mime-db'),
  path.join('node_modules', 'mime-types'),
  path.join('node_modules', 'minimist'),
  path.join('node_modules', 'mkdirp-classic'),
  path.join('node_modules', 'ms'),
  path.join('node_modules', 'multer'),
  path.join('node_modules', 'negotiator'),
  path.join('node_modules', 'node-abi'),
  path.join('node_modules', 'node-addon-api'),
  path.join('node_modules', 'node-fetch'),
  path.join('node_modules', 'object-inspect'),
  path.join('node_modules', 'on-finished'),
  path.join('node_modules', 'parseurl'),
  path.join('node_modules', 'path-to-regexp'),
  path.join('node_modules', 'pg'),
  path.join('node_modules', 'pg-cloudflare'),
  path.join('node_modules', 'pg-connection-string'),
  path.join('node_modules', 'pg-int8'),
  path.join('node_modules', 'pg-pool'),
  path.join('node_modules', 'pg-protocol'),
  path.join('node_modules', 'pg-types'),
  path.join('node_modules', 'pgpass'),
  path.join('node_modules', 'postgres-array'),
  path.join('node_modules', 'postgres-bytea'),
  path.join('node_modules', 'postgres-date'),
  path.join('node_modules', 'postgres-interval'),
  path.join('node_modules', 'proxy-addr'),
  path.join('node_modules', 'qs'),
  path.join('node_modules', 'range-parser'),
  path.join('node_modules', 'raw-body'),
  path.join('node_modules', 'readable-stream'),
  path.join('node_modules', 'reflect-metadata'),
  path.join('node_modules', 'router'),
  path.join('node_modules', 'rxjs'),
  path.join('node_modules', 'safe-buffer'),
  path.join('node_modules', 'safer-buffer'),
  path.join('node_modules', 'send'),
  path.join('node_modules', 'serve-static'),
  path.join('node_modules', 'setprototypeof'),
  path.join('node_modules', 'side-channel'),
  path.join('node_modules', 'split2'),
  path.join('node_modules', 'statuses'),
  path.join('node_modules', 'streamsearch'),
  path.join('node_modules', 'string_decoder'),
  path.join('node_modules', 'strnum'),
  path.join('node_modules', 'toidentifier'),
  path.join('node_modules', 'tr46'),
  path.join('node_modules', 'tslib'),
  path.join('node_modules', 'type-is'),
  path.join('node_modules', 'typedarray'),
  path.join('node_modules', 'uid'),
  path.join('node_modules', 'undici-types'),
  path.join('node_modules', 'unpipe'),
  path.join('node_modules', 'util-deprecate'),
  path.join('node_modules', 'vary'),
  path.join('node_modules', 'webidl-conversions'),
  path.join('node_modules', 'whatwg-url'),
  path.join('node_modules', 'xtend'),
  path.join('node_modules', 'yallist'),
  path.join('node_modules', 'better-sqlite3', 'deps'),
  path.join('node_modules', 'better-sqlite3', 'src'),
  path.join('node_modules', 'better-sqlite3', 'binding.gyp')
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

function stopLingeringPackagedProcesses() {
  if (process.platform !== 'win32') {
    return;
  }

  const cleanupScriptPath = path.join(os.tmpdir(), 'orgumented-packaged-process-cleanup.ps1');
  writeFileSync(
    cleanupScriptPath,
    [
      "$targets = Get-Process -Name orgumented-desktop,node -ErrorAction SilentlyContinue |",
      "  Where-Object {",
      "    $_.Path -like '*OrgGraph\\apps\\desktop\\src-tauri\\target\\release*' -or",
      "    $_.Path -like '*OrgGraph\\apps\\desktop\\src-tauri\\runtime*'",
      '  }',
      'if ($targets) {',
      '  $targets | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }',
      '  Start-Sleep -Milliseconds 500',
      '}'
    ].join('\n')
  );

  try {
    runStep('packaged-process-cleanup', 'pwsh.exe', ['-NoProfile', '-File', cleanupScriptPath]);
  } finally {
    rmSync(cleanupScriptPath, { force: true });
  }
}

function ensureExists(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} missing at ${filePath}`);
  }
}

function prunePackagedApiArtifacts() {
  for (const relativeTarget of packagedApiPruneTargets) {
    const absoluteTarget = path.join(runtimeApiRoot, relativeTarget);
    rmSync(absoluteTarget, { recursive: true, force: true });
  }
}

function bundlePackagedApi() {
  runStep('api-bundle', 'pnpm.cmd', [
    '--filter',
    'desktop',
    'exec',
    'esbuild',
    path.join(workspaceRoot, 'apps', 'api', 'dist', 'main.js'),
    '--bundle',
    '--platform=node',
    '--format=cjs',
    '--target=node20',
    `--outfile=${runtimeApiBundlePath}`,
    '--external:better-sqlite3',
    '--external:class-transformer',
    '--external:class-validator',
    '--external:@nestjs/microservices',
    '--external:@nestjs/microservices/microservices-module',
    '--external:@nestjs/websockets',
    '--external:@nestjs/websockets/socket-module'
  ]);
}

stopLingeringPackagedProcesses();
rmSync(runtimeRoot, { recursive: true, force: true });
mkdirSync(runtimeWebRoot, { recursive: true });
mkdirSync(runtimeApiRoot, { recursive: true });
mkdirSync(runtimeNodeRoot, { recursive: true });

runStep('web-build', 'pnpm.cmd', ['--filter', 'web', 'build']);
runStep('api-build', 'pnpm.cmd', ['--filter', 'api', 'build']);
runStep('api-deploy', 'pnpm.cmd', ['--filter', 'api', 'deploy', '--prod', runtimeApiRoot]);
waitForReadableCopy(path.join(runtimeApiRoot, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'));
bundlePackagedApi();
prunePackagedApiArtifacts();

ensureExists(webIndexPath, 'web index');
ensureExists(webStaticPath, 'web static assets');
ensureExists(process.execPath, 'node runtime');
ensureExists(runtimeApiBundlePath, 'bundled api entrypoint');

cpSync(webIndexPath, path.join(runtimeWebRoot, 'index.html'));
cpSync(webStaticPath, path.join(runtimeWebRoot, '_next', 'static'), { recursive: true });
cpSync(process.execPath, runtimeNodePath);

writeFileSync(
  path.join(runtimeRoot, 'manifest.json'),
  JSON.stringify(
    {
      nodeBinary: nodeBinaryName,
      nodeVersion: process.version,
      apiEntry: path.join('api', 'main.cjs'),
      webEntry: path.join('web', 'index.html'),
      configEntry: 'config.json'
    },
    null,
    2
  )
);

writeFileSync(runtimeConfigPath, JSON.stringify(resolvePackagedConfig(), null, 2));
