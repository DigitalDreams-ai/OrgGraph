import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), 'orgumented-github-session-'));
  const fakeGhDir = join(tempDir, 'fake-gh');
  const statePath = join(tempDir, 'gh-state.json');
  const appDataRoot = join(tempDir, 'appdata');
  mkdirSync(fakeGhDir, { recursive: true });
  mkdirSync(appDataRoot, { recursive: true });

  writeFileSync(
    statePath,
    JSON.stringify({
      authenticated: false,
      token: 'test-gh-token',
      login: 'octocat',
      name: 'Octo Cat',
      url: 'https://github.com/octocat'
    }),
    'utf8'
  );

  const fakeGhScriptPath = join(fakeGhDir, 'gh.js');
  writeFileSync(
    fakeGhScriptPath,
    `
const fs = require('node:fs');
const statePath = process.env.TEST_GH_STATE_PATH;
const args = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const save = (next) => fs.writeFileSync(statePath, JSON.stringify(next), 'utf8');

if (args[0] === '--version') {
  process.stdout.write('gh version 2.74.2\\n');
  process.exit(0);
}

if (args[0] === 'auth' && args[1] === 'status') {
  if (state.authenticated) {
    process.stdout.write('Logged in to github.com as ' + state.login + '\\n');
    process.exit(0);
  }
  process.stderr.write('You are not logged into any GitHub hosts.\\n');
  process.exit(1);
}

if (args[0] === 'auth' && args[1] === 'token') {
  if (state.authenticated) {
    process.stdout.write(state.token + '\\n');
    process.exit(0);
  }
  process.stderr.write('not logged in\\n');
  process.exit(1);
}

if (args[0] === 'auth' && args[1] === 'login') {
  save({ ...state, authenticated: true });
  process.stdout.write('Login complete\\n');
  process.exit(0);
}

process.stderr.write('Unhandled gh command: ' + args.join(' ') + '\\n');
process.exit(1);
`.trim(),
    'utf8'
  );
  writeFileSync(
    join(fakeGhDir, 'gh.cmd'),
    `@echo off\r\n"${process.execPath}" "${fakeGhScriptPath}" %*\r\n`,
    'utf8'
  );

  const previousEnv = {
    PATH: process.env.PATH,
    TEST_GH_STATE_PATH: process.env.TEST_GH_STATE_PATH,
    ORGUMENTED_APP_DATA_ROOT: process.env.ORGUMENTED_APP_DATA_ROOT,
    GITHUB_API_URL: process.env.GITHUB_API_URL,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN
  };

  const githubServer = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      const body = text.length > 0 ? JSON.parse(text) : undefined;

      assert.equal(req.headers.authorization, 'Bearer test-gh-token');
      assert.equal(req.headers['user-agent'], 'Orgumented');

      if (req.method === 'GET' && url.pathname === '/user') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            login: 'octocat',
            name: 'Octo Cat',
            html_url: 'https://github.com/octocat'
          })
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/user/repos') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify([
            {
              name: 'repo-one',
              full_name: 'acme/repo-one',
              private: true,
              visibility: 'private',
              html_url: 'https://github.com/acme/repo-one',
              clone_url: 'https://github.com/acme/repo-one.git',
              description: 'Acme repo one',
              default_branch: 'main',
              owner: { login: 'acme' }
            },
            {
              name: 'repo-two',
              full_name: 'octocat/repo-two',
              private: false,
              visibility: 'public',
              html_url: 'https://github.com/octocat/repo-two',
              clone_url: 'https://github.com/octocat/repo-two.git',
              description: 'Octo repo two',
              default_branch: 'main',
              owner: { login: 'octocat' }
            }
          ])
        );
        return;
      }

      if (req.method === 'POST' && url.pathname === '/user/repos') {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            name: body.name,
            full_name: `octocat/${body.name}`,
            private: body.private === true,
            visibility: body.private === true ? 'private' : 'public',
            html_url: `https://github.com/octocat/${body.name}`,
            clone_url: `https://github.com/octocat/${body.name}.git`,
            description: body.description ?? null,
            default_branch: 'main',
            owner: { login: 'octocat' }
          })
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/repos/acme/repo-one') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            name: 'repo-one',
            full_name: 'acme/repo-one',
            private: true,
            visibility: 'private',
            html_url: 'https://github.com/acme/repo-one',
            clone_url: 'https://github.com/acme/repo-one.git',
            description: 'Acme repo one',
            default_branch: 'main',
            owner: { login: 'acme' }
          })
        );
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `${req.method} ${url.pathname}` }));
    });
  });

  try {
    await new Promise<void>((resolve) => githubServer.listen(0, '127.0.0.1', () => resolve()));
    const address = githubServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to bind fake GitHub server');
    }

    process.env.PATH = `${fakeGhDir};${previousEnv.PATH ?? ''}`;
    process.env.TEST_GH_STATE_PATH = statePath;
    process.env.ORGUMENTED_APP_DATA_ROOT = appDataRoot;
    process.env.GITHUB_API_URL = `http://127.0.0.1:${address.port}`;
    delete process.env.GITHUB_TOKEN;

    const app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const apiAddress = app.getHttpServer().address();
    if (!apiAddress || typeof apiAddress === 'string') {
      throw new Error('Failed to bind API test server');
    }

    try {
      const statusBefore = await fetch(`http://127.0.0.1:${apiAddress.port}/github/session/status`);
      assert.equal(statusBefore.status, 200);
      const statusBeforeJson = (await statusBefore.json()) as { status: string; authSource: string; cliInstalled: boolean };
      assert.equal(statusBeforeJson.status, 'unauthenticated');
      assert.equal(statusBeforeJson.authSource, 'none');
      assert.equal(statusBeforeJson.cliInstalled, true);

      const loginResponse = await fetch(`http://127.0.0.1:${apiAddress.port}/github/session/login`, {
        method: 'POST'
      });
      assert.equal(loginResponse.status, 201);
      const loginJson = (await loginResponse.json()) as { status: string; authSource: string; viewer?: { login: string } };
      assert.equal(loginJson.status, 'authenticated');
      assert.equal(loginJson.authSource, 'gh_cli');
      assert.equal(loginJson.viewer?.login, 'octocat');

      const reposResponse = await fetch(`http://127.0.0.1:${apiAddress.port}/github/repos`);
      assert.equal(reposResponse.status, 200);
      const reposJson = (await reposResponse.json()) as { repos: Array<{ fullName: string; selected?: boolean }> };
      assert.equal(reposJson.repos.length, 2);
      assert.deepEqual(
        reposJson.repos.map((repo) => repo.fullName),
        ['acme/repo-one', 'octocat/repo-two']
      );

      const selectResponse = await fetch(`http://127.0.0.1:${apiAddress.port}/github/session/select-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: 'acme',
          repo: 'repo-one'
        })
      });
      assert.equal(selectResponse.status, 201);
      const selectJson = (await selectResponse.json()) as { repo: { fullName: string } };
      assert.equal(selectJson.repo.fullName, 'acme/repo-one');

      const selectedRepoState = JSON.parse(
        readFileSync(join(appDataRoot, 'github', 'selected-repo.json'), 'utf8')
      ) as { fullName: string };
      assert.equal(selectedRepoState.fullName, 'acme/repo-one');

      const createResponse = await fetch(`http://127.0.0.1:${apiAddress.port}/github/repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'new-repo',
          visibility: 'private'
        })
      });
      assert.equal(createResponse.status, 201);
      const createJson = (await createResponse.json()) as {
        repo: { fullName: string; selected: boolean };
        selectedRepo: { fullName: string };
      };
      assert.equal(createJson.repo.fullName, 'octocat/new-repo');
      assert.equal(createJson.repo.selected, true);
      assert.equal(createJson.selectedRepo.fullName, 'octocat/new-repo');
    } finally {
      await app.close();
    }
  } finally {
    process.env.PATH = previousEnv.PATH;
    process.env.TEST_GH_STATE_PATH = previousEnv.TEST_GH_STATE_PATH;
    process.env.ORGUMENTED_APP_DATA_ROOT = previousEnv.ORGUMENTED_APP_DATA_ROOT;
    process.env.GITHUB_API_URL = previousEnv.GITHUB_API_URL;
    process.env.GITHUB_TOKEN = previousEnv.GITHUB_TOKEN;
    await new Promise<void>((resolve) => githubServer.close(() => resolve()));
    rmSync(tempDir, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
