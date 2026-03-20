import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), 'orgumented-github-binding-'));
  const appDataRoot = join(tempDir, 'appdata');
  const selectedRepoPath = join(appDataRoot, 'github', 'selected-repo.json');
  mkdirSync(join(appDataRoot, 'github'), { recursive: true });

  const previousEnv = {
    ORGUMENTED_APP_DATA_ROOT: process.env.ORGUMENTED_APP_DATA_ROOT,
    GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER,
    GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME
  };

  try {
    process.env.ORGUMENTED_APP_DATA_ROOT = appDataRoot;
    process.env.GITHUB_REPO_OWNER = 'DigitalDreams-ai';
    process.env.GITHUB_REPO_NAME = 'OrgGraph';

    const app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to bind API test server');
    }

    try {
      writeFileSync(
        selectedRepoPath,
        JSON.stringify(
          {
            owner: 'DigitalDreams-ai',
            repo: 'OrgGraph',
            fullName: 'DigitalDreams-ai/OrgGraph',
            visibility: 'private',
            private: true,
            url: 'https://github.com/DigitalDreams-ai/OrgGraph',
            cloneUrl: 'https://github.com/DigitalDreams-ai/OrgGraph.git',
            defaultBranch: 'main',
            selectedAt: '2026-03-19T00:00:00Z'
          },
          null,
          2
        ),
        'utf8'
      );

      const blockedResponse = await fetch(`http://127.0.0.1:${address.port}/github/repo/binding`);
      assert.equal(blockedResponse.status, 200);
      const blockedJson = (await blockedResponse.json()) as {
        status: string;
        metadataCommitEligible: boolean;
        productRepo?: { fullName: string; source: string };
        issues: Array<{ code: string }>;
      };
      assert.equal(blockedJson.status, 'blocked');
      assert.equal(blockedJson.metadataCommitEligible, false);
      assert.equal(blockedJson.productRepo?.fullName, 'DigitalDreams-ai/OrgGraph');
      assert.equal(blockedJson.productRepo?.source, 'env_config');
      assert.ok(blockedJson.issues.some((issue) => issue.code === 'PRODUCT_REPO_SELECTED'));

      writeFileSync(
        selectedRepoPath,
        JSON.stringify(
          {
            owner: 'sean',
            repo: 'orgumented-runtime',
            fullName: 'sean/orgumented-runtime',
            visibility: 'private',
            private: true,
            url: 'https://github.com/sean/orgumented-runtime',
            cloneUrl: 'https://github.com/sean/orgumented-runtime.git',
            defaultBranch: 'main',
            selectedAt: '2026-03-19T00:10:00Z'
          },
          null,
          2
        ),
        'utf8'
      );

      const readyResponse = await fetch(`http://127.0.0.1:${address.port}/github/repo/binding`);
      assert.equal(readyResponse.status, 200);
      const readyJson = (await readyResponse.json()) as {
        status: string;
        metadataCommitEligible: boolean;
        selectedRepo?: { fullName: string };
        issues: Array<{ code: string }>;
      };
      assert.equal(readyJson.status, 'ready');
      assert.equal(readyJson.metadataCommitEligible, true);
      assert.equal(readyJson.selectedRepo?.fullName, 'sean/orgumented-runtime');
      assert.equal(readyJson.issues.length, 0);
    } finally {
      await app.close();
    }
  } finally {
    process.env.ORGUMENTED_APP_DATA_ROOT = previousEnv.ORGUMENTED_APP_DATA_ROOT;
    process.env.GITHUB_REPO_OWNER = previousEnv.GITHUB_REPO_OWNER;
    process.env.GITHUB_REPO_NAME = previousEnv.GITHUB_REPO_NAME;
    rmSync(tempDir, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
