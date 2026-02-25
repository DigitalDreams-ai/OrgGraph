import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OrgService } from '../src/org/org.service';

class StubRunner {
  calls: Array<{ command: string; args: string[]; cwd?: string }> = [];

  async run(
    command: string,
    args: string[],
    options: { cwd?: string; timeoutMs?: number } = {}
  ): Promise<{ exitCode: number; stdout: string; stderr: string; elapsedMs: number }> {
    this.calls.push({ command, args, cwd: options.cwd });
    return { exitCode: 0, stdout: '{"status":"ok"}', stderr: '', elapsedMs: 12 };
  }
}

async function run(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orggraph-org-'));
  const manifestDir = path.join(root, 'manifest');
  const secretsDir = path.join(root, '.secrets');
  const sfProjectDir = path.join(root, 'data', 'sf-project');
  const parsePath = path.join(sfProjectDir, 'force-app', 'main', 'default');

  fs.mkdirSync(manifestDir, { recursive: true });
  fs.mkdirSync(secretsDir, { recursive: true });
  fs.mkdirSync(parsePath, { recursive: true });

  const manifestPath = path.join(manifestDir, 'package.xml');
  const authFile = path.join(secretsDir, 'sandbox.sfdx-url.txt');
  fs.writeFileSync(manifestPath, '<Package/>', 'utf8');
  fs.writeFileSync(authFile, 'force://token@example', 'utf8');

  process.env.SF_INTEGRATION_ENABLED = 'true';
  process.env.SF_AUTH_MODE = 'sfdx_url';
  process.env.SF_AUTH_URL_PATH = authFile;
  process.env.SF_PROJECT_PATH = sfProjectDir;
  process.env.SF_MANIFEST_PATH = manifestPath;
  process.env.SF_PARSE_PATH = parsePath;
  process.env.SF_AUTO_REFRESH_AFTER_RETRIEVE = 'true';
  process.env.SF_RETRY_COUNT = '0';
  process.env.SF_WAIT_MINUTES = '1';

  const fakeConfig = {
    sfIntegrationEnabled: () => true,
    sfAuthMode: () => 'sfdx_url' as const,
    sfAuthUrlPath: () => authFile,
    sfAlias: () => 'orggraph-sandbox',
    sfProjectPath: () => sfProjectDir,
    sfManifestPath: () => manifestPath,
    sfParsePath: () => parsePath,
    sfAutoRefreshAfterRetrieve: () => true,
    sfRetryCount: () => 0,
    sfRetryDelayMs: () => 1,
    sfTimeoutSeconds: () => 30,
    sfWaitMinutes: () => 1,
    sfClientId: () => undefined,
    sfJwtKeyPath: () => undefined,
    sfUsername: () => undefined,
    sfInstanceUrl: () => undefined
  };

  const fakeIngestion = {
    refresh: () => ({
      mode: 'full',
      skipped: false,
      nodeCount: 1,
      edgeCount: 1,
      evidenceCount: 1,
      elapsedMs: 1,
      sourcePath: parsePath,
      databasePath: path.join(root, 'data', 'orggraph.db'),
      evidenceIndexPath: path.join(root, 'data', 'evidence', 'index.json')
    })
  };

  const runner = new StubRunner();
  const service = new OrgService(fakeConfig as never, fakeIngestion as never, runner as never);

  try {
    const result = await service.retrieveAndRefresh();
    assert.equal(result.status, 'completed');
    assert.ok(result.steps.some((step) => step.step === 'auth' && step.status === 'completed'));
    assert.ok(result.steps.some((step) => step.step === 'retrieve' && step.status === 'completed'));
    assert.ok(result.steps.some((step) => step.step === 'refresh' && step.status === 'completed'));
    assert.ok(runner.calls.length >= 2, 'expected auth and retrieve sf commands');
    console.log('org service test passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
