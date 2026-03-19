import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), 'orgumented-github-workflow-'));
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

  let dispatchBody: Record<string, unknown> | null = null;
  const githubServer = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      const body = text.length > 0 ? (JSON.parse(text) as Record<string, unknown>) : undefined;

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

      if (
        req.method === 'GET' &&
        url.pathname === '/repos/acme/repo-one/actions/workflows/runtime-nightly.yml/runs'
      ) {
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
                status: 'in_progress',
                conclusion: null,
                event: 'workflow_dispatch',
                html_url: 'https://github.com/acme/repo-one/actions/runs/4002',
                head_branch: 'release/proof',
                head_sha: '1234567890abcdef',
                display_title: 'Runtime Nightly',
                created_at: '2026-03-19T09:00:00Z',
                updated_at: '2026-03-19T09:03:00Z',
                actor: { login: 'sean' }
              }
            ]
          })
        );
        return;
      }

      if (
        req.method === 'POST' &&
        url.pathname === '/repos/acme/repo-one/actions/workflows/runtime-nightly.yml/dispatches'
      ) {
        dispatchBody = body ?? null;
        res.writeHead(204);
        res.end();
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
      const selectResponse = await fetch(`http://127.0.0.1:${apiAddress.port}/github/session/select-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: 'acme',
          repo: 'repo-one'
        })
      });
      assert.equal(selectResponse.status, 201);

      const workflowCatalogResponse = await fetch(`http://127.0.0.1:${apiAddress.port}/github/actions/workflows`);
      assert.equal(workflowCatalogResponse.status, 200);
      const workflowCatalogJson = (await workflowCatalogResponse.json()) as {
        repo: { fullName: string };
        workflows: Array<{ key: string; name: string; workflowFile: string; dispatchEnabled: boolean }>;
      };
      assert.equal(workflowCatalogJson.repo.fullName, 'acme/repo-one');
      assert.deepEqual(workflowCatalogJson.workflows, [
        {
          key: 'runtime_nightly',
          name: 'Runtime Nightly',
          workflowFile: 'runtime-nightly.yml',
          description: 'Dispatch the packaged desktop build-and-smoke workflow and read back recent workflow_dispatch runs.',
          dispatchEnabled: true,
          inputs: []
        }
      ]);

      const runsResponse = await fetch(
        `http://127.0.0.1:${apiAddress.port}/github/actions/runs?workflowKey=runtime_nightly`
      );
      assert.equal(runsResponse.status, 200);
      const runsJson = (await runsResponse.json()) as {
        workflow: { key: string; name: string };
        runs: Array<{
          runId: number;
          runNumber?: number;
          status: string;
          conclusion?: string;
          branch?: string;
          actor?: string;
          event?: string;
        }>;
        totalCount: number;
        truncated: boolean;
      };
      assert.equal(runsJson.workflow.key, 'runtime_nightly');
      assert.equal(runsJson.workflow.name, 'Runtime Nightly');
      assert.equal(runsJson.totalCount, 2);
      assert.equal(runsJson.truncated, false);
      assert.deepEqual(
        runsJson.runs.map((run) => ({
          runId: run.runId,
          runNumber: run.runNumber,
          status: run.status,
          conclusion: run.conclusion,
          branch: run.branch,
          actor: run.actor,
          event: run.event
        })),
        [
          {
            runId: 4001,
            runNumber: 18,
            status: 'completed',
            conclusion: 'success',
            branch: 'main',
            actor: 'octocat',
            event: 'workflow_dispatch'
          },
          {
            runId: 4002,
            runNumber: 19,
            status: 'in_progress',
            conclusion: undefined,
            branch: 'release/proof',
            actor: 'sean',
            event: 'workflow_dispatch'
          }
        ]
      );

      const dispatchResponse = await fetch(`http://127.0.0.1:${apiAddress.port}/github/actions/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowKey: 'runtime_nightly',
          ref: 'main'
        })
      });
      assert.equal(dispatchResponse.status, 201);
      const dispatchJson = (await dispatchResponse.json()) as {
        owner: string;
        repo: string;
        workflow: { key: string; workflowFile: string };
        ref: string;
        inputs: Record<string, string>;
      };
      assert.equal(dispatchJson.owner, 'acme');
      assert.equal(dispatchJson.repo, 'repo-one');
      assert.equal(dispatchJson.workflow.key, 'runtime_nightly');
      assert.equal(dispatchJson.workflow.workflowFile, 'runtime-nightly.yml');
      assert.equal(dispatchJson.ref, 'main');
      assert.deepEqual(dispatchJson.inputs, {});
      assert.deepEqual(dispatchBody, { ref: 'main' });
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
