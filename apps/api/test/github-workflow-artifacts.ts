import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), 'orgumented-github-workflow-artifacts-'));
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

    if (req.method === 'GET' && url.pathname === '/repos/acme/repo-one/actions/workflows/runtime-nightly.yml/runs') {
      assert.equal(url.searchParams.get('per_page'), '10');
      assert.equal(url.searchParams.get('event'), 'workflow_dispatch');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          total_count: 2,
          workflow_runs: [
            {
              id: 4001,
              run_number: 18,
              status: 'completed',
              conclusion: 'success',
              event: 'workflow_dispatch',
              html_url: 'https://github.com/acme/repo-one/actions/runs/4001',
              head_branch: 'main',
              head_sha: 'abcdef1234567890',
              display_title: 'Runtime Nightly',
              created_at: '2026-03-19T08:00:00Z',
              updated_at: '2026-03-19T08:14:00Z',
              actor: { login: 'octocat' }
            },
            {
              id: 4002,
              run_number: 19,
              status: 'completed',
              conclusion: 'success',
              event: 'workflow_dispatch',
              html_url: 'https://github.com/acme/repo-one/actions/runs/4002',
              head_branch: 'release/proof',
              head_sha: '1234567890abcdef',
              display_title: 'Runtime Nightly',
              created_at: '2026-03-19T09:00:00Z',
              updated_at: '2026-03-19T09:15:00Z',
              actor: { login: 'sean' }
            }
          ]
        })
      );
      return;
    }

    if (req.method === 'GET' && url.pathname === '/repos/acme/repo-one/actions/runs/4001/artifacts') {
      assert.equal(url.searchParams.get('per_page'), '10');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          total_count: 2,
          artifacts: [
            {
              id: 9101,
              name: 'runtime-nightly-artifacts',
              size_in_bytes: 24576,
              archive_download_url: 'https://api.github.com/repos/acme/repo-one/actions/artifacts/9101/zip',
              url: 'https://api.github.com/repos/acme/repo-one/actions/artifacts/9101',
              created_at: '2026-03-19T08:14:30Z',
              updated_at: '2026-03-19T08:14:31Z',
              expires_at: '2026-03-20T08:14:30Z',
              expired: false
            },
            {
              id: 9102,
              name: 'desktop-runtime-artifacts',
              size_in_bytes: 53248,
              archive_download_url: 'https://api.github.com/repos/acme/repo-one/actions/artifacts/9102/zip',
              url: 'https://api.github.com/repos/acme/repo-one/actions/artifacts/9102',
              created_at: '2026-03-19T08:14:35Z',
              updated_at: '2026-03-19T08:14:36Z',
              expires_at: '2026-03-20T08:14:35Z',
              expired: false
            }
          ]
        })
      );
      return;
    }

    if (req.method === 'GET' && url.pathname === '/repos/acme/repo-one/actions/runs/4002/artifacts') {
      assert.equal(url.searchParams.get('per_page'), '10');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          total_count: 1,
          artifacts: [
            {
              id: 9201,
              name: 'runtime-nightly-artifacts',
              size_in_bytes: 28672,
              archive_download_url: 'https://api.github.com/repos/acme/repo-one/actions/artifacts/9201/zip',
              url: 'https://api.github.com/repos/acme/repo-one/actions/artifacts/9201',
              created_at: '2026-03-19T09:15:30Z',
              updated_at: '2026-03-19T09:15:31Z',
              expires_at: '2026-03-20T09:15:30Z',
              expired: true
            }
          ]
        })
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

      const artifactsResponse = await fetch(
        `http://127.0.0.1:${apiAddress.port}/github/actions/artifacts?workflowKey=runtime_nightly`
      );
      assert.equal(artifactsResponse.status, 200);
      const artifactsJson = (await artifactsResponse.json()) as {
        repo: { fullName: string };
        workflow: { key: string; workflowFile: string };
        runs: Array<{
          runId: number;
          artifactCount: number;
          artifactsTruncated: boolean;
          artifacts: Array<{ artifactId: number; name: string; expired: boolean }>;
        }>;
        totalCount: number;
        truncated: boolean;
      };

      assert.equal(artifactsJson.repo.fullName, 'acme/repo-one');
      assert.equal(artifactsJson.workflow.key, 'runtime_nightly');
      assert.equal(artifactsJson.workflow.workflowFile, 'runtime-nightly.yml');
      assert.equal(artifactsJson.totalCount, 2);
      assert.equal(artifactsJson.truncated, false);
      assert.deepEqual(
        artifactsJson.runs.map((run) => ({
          runId: run.runId,
          artifactCount: run.artifactCount,
          artifactsTruncated: run.artifactsTruncated,
          artifacts: run.artifacts.map((artifact) => ({
            artifactId: artifact.artifactId,
            name: artifact.name,
            expired: artifact.expired
          }))
        })),
        [
          {
            runId: 4001,
            artifactCount: 2,
            artifactsTruncated: false,
            artifacts: [
              {
                artifactId: 9101,
                name: 'runtime-nightly-artifacts',
                expired: false
              },
              {
                artifactId: 9102,
                name: 'desktop-runtime-artifacts',
                expired: false
              }
            ]
          },
          {
            runId: 4002,
            artifactCount: 1,
            artifactsTruncated: false,
            artifacts: [
              {
                artifactId: 9201,
                name: 'runtime-nightly-artifacts',
                expired: true
              }
            ]
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
