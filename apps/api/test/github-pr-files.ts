import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), 'orgumented-github-pr-files-'));
  const fakeGhDir = join(tempDir, 'fake-gh');
  const statePath = join(tempDir, 'gh-state.json');
  const appDataRoot = join(tempDir, 'appdata');
  mkdirSync(fakeGhDir, { recursive: true });
  mkdirSync(appDataRoot, { recursive: true });

  writeFileSync(
    statePath,
    JSON.stringify({
      authenticated: true,
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
const state = JSON.parse(fs.readFileSync(process.env.TEST_GH_STATE_PATH, 'utf8'));
const args = process.argv.slice(2);

if (args[0] === '--version') {
  process.stdout.write('gh version 2.74.2\\n');
  process.exit(0);
}

if (args[0] === 'auth' && args[1] === 'token') {
  process.stdout.write(state.token + '\\n');
  process.exit(0);
}

if (args[0] === 'auth' && args[1] === 'status') {
  process.stdout.write('Logged in to github.com as ' + state.login + '\\n');
  process.exit(0);
}

process.stderr.write('Unhandled gh command: ' + args.join(' ') + '\\n');
process.exit(1);
`.trim(),
    'utf8'
  );
  writeFileSync(join(fakeGhDir, 'gh.cmd'), `@echo off\r\n"${process.execPath}" "${fakeGhScriptPath}" %*\r\n`, 'utf8');

  const previousEnv = {
    PATH: process.env.PATH,
    TEST_GH_STATE_PATH: process.env.TEST_GH_STATE_PATH,
    ORGUMENTED_APP_DATA_ROOT: process.env.ORGUMENTED_APP_DATA_ROOT,
    GITHUB_API_URL: process.env.GITHUB_API_URL,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN
  };

  const githubServer = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
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

    if (req.method === 'GET' && url.pathname === '/repos/acme/repo-one/pulls/17') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          number: 17,
          title: 'Add repo file scope support',
          state: 'open',
          html_url: 'https://github.com/acme/repo-one/pull/17',
          user: { login: 'octocat' },
          draft: false,
          head: { ref: 'feature/github-pr-files' },
          base: { ref: 'main' },
          created_at: '2026-03-19T09:00:00Z',
          updated_at: '2026-03-19T10:00:00Z',
          changed_files: 3
        })
      );
      return;
    }

    if (req.method === 'GET' && url.pathname === '/repos/acme/repo-one/pulls/17/files') {
      assert.equal(url.searchParams.get('per_page'), '100');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify([
          {
            filename: 'apps/api/src/modules/github/github.service.ts',
            status: 'modified',
            additions: 14,
            deletions: 2,
            changes: 16,
            blob_url: 'https://github.com/acme/repo-one/blob/main/apps/api/src/modules/github/github.service.ts',
            raw_url: 'https://raw.githubusercontent.com/acme/repo-one/main/apps/api/src/modules/github/github.service.ts',
            patch: '@@ -1,3 +1,4 @@'
          },
          {
            filename: 'docs/planning/v2/ORGUMENTED_V2_EXECUTION.md',
            status: 'renamed',
            additions: 3,
            deletions: 1,
            changes: 4,
            previous_filename: 'docs/planning/v2/EXECUTION_OLD.md',
            blob_url: 'https://github.com/acme/repo-one/blob/main/docs/planning/v2/ORGUMENTED_V2_EXECUTION.md'
          }
        ])
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `${req.method} ${url.pathname}` }));
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
      const selectResponse = await fetch(`http://127.0.0.1:${apiAddress.port}/github/session/select-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: 'acme',
          repo: 'repo-one'
        })
      });
      assert.equal(selectResponse.status, 201);

      const filesResponse = await fetch(`http://127.0.0.1:${apiAddress.port}/github/pr/files?pullNumber=17`);
      assert.equal(filesResponse.status, 200);
      const filesJson = (await filesResponse.json()) as {
        repo: { fullName: string };
        pullRequest: { number: number; title: string; changedFileCount?: number };
        files: Array<{ filename: string; status: string; previousFilename?: string; patchTruncated?: boolean }>;
        totalCount: number;
        truncated: boolean;
      };

      assert.equal(filesJson.repo.fullName, 'acme/repo-one');
      assert.equal(filesJson.pullRequest.number, 17);
      assert.equal(filesJson.pullRequest.title, 'Add repo file scope support');
      assert.equal(filesJson.pullRequest.changedFileCount, 3);
      assert.equal(filesJson.totalCount, 3);
      assert.equal(filesJson.truncated, true);
      assert.deepEqual(
        filesJson.files.map((file) => ({
          filename: file.filename,
          status: file.status,
          previousFilename: file.previousFilename,
          patchTruncated: file.patchTruncated
        })),
        [
          {
            filename: 'apps/api/src/modules/github/github.service.ts',
            status: 'modified',
            previousFilename: undefined,
            patchTruncated: false
          },
          {
            filename: 'docs/planning/v2/ORGUMENTED_V2_EXECUTION.md',
            status: 'renamed',
            previousFilename: 'docs/planning/v2/EXECUTION_OLD.md',
            patchTruncated: true
          }
        ]
      );
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
