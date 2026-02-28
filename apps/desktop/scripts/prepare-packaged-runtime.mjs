#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const desktopRoot = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = path.resolve(desktopRoot, '../..');
const runtimeRoot = path.join(desktopRoot, 'src-tauri', 'runtime');
const runtimeWebRoot = path.join(runtimeRoot, 'web');
const runtimeApiRoot = path.join(runtimeRoot, 'api');
const runtimeNodeRoot = path.join(runtimeRoot, 'node');
const webNextRoot = path.join(workspaceRoot, 'apps', 'web', '.next');
const webIndexPath = path.join(webNextRoot, 'server', 'app', 'index.html');
const webStaticPath = path.join(webNextRoot, 'static');
const nodeBinaryName = process.platform === 'win32' ? 'node.exe' : 'node';
const runtimeNodePath = path.join(runtimeNodeRoot, nodeBinaryName);

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
      webEntry: path.join('web', 'index.html')
    },
    null,
    2
  )
);
