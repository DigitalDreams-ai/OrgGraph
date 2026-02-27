import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OrgService } from '../src/modules/org/org.service';

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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-org-'));
  const sfProjectDir = path.join(root, 'data', 'sf-project');
  const parsePath = path.join(sfProjectDir, 'force-app', 'main', 'default');

  fs.mkdirSync(parsePath, { recursive: true });

  process.env.SF_INTEGRATION_ENABLED = 'true';
  process.env.SF_PROJECT_PATH = sfProjectDir;
  process.env.SF_PARSE_PATH = parsePath;
  process.env.SF_AUTO_REFRESH_AFTER_RETRIEVE = 'true';
  process.env.SF_RETRY_COUNT = '0';
  process.env.SF_WAIT_MINUTES = '1';

  const fakeConfig = {
    sfIntegrationEnabled: () => true,
    sfAuthMode: () => 'sf_cli_keychain' as const,
    cciVersionPin: () => '3.78.0',
    sfAlias: () => 'orgumented-sandbox',
    sfProjectPath: () => sfProjectDir,
    sfParsePath: () => parsePath,
    sfAutoRefreshAfterRetrieve: () => true,
    sfRetryCount: () => 0,
    sfRetryDelayMs: () => 1,
    sfTimeoutSeconds: () => 30,
    sfWaitMinutes: () => 1,
    sfBaseUrl: () => 'https://test.salesforce.com'
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
      databasePath: path.join(root, 'data', 'orgumented.db'),
      evidenceIndexPath: path.join(root, 'data', 'evidence', 'index.json')
    })
  };

  const runner = new StubRunner();
  const service = new OrgService(fakeConfig as never, fakeIngestion as never, runner as never);

  try {
    const preflight = await service.preflight();
    assert.equal(preflight.integrationEnabled, true);
    assert.equal(preflight.checks.sfInstalled, true);
    assert.equal(preflight.checks.aliasAuthenticated, true);

    const result = await service.retrieveAndRefresh({
      selections: [{ type: 'CustomObject', members: ['Account'] }]
    });
    assert.equal(result.status, 'completed');
    assert.ok(result.steps.some((step) => step.step === 'auth' && step.status === 'completed'));
    assert.ok(result.steps.some((step) => step.step === 'retrieve' && step.status === 'completed'));
    assert.ok(result.steps.some((step) => step.step === 'refresh' && step.status === 'completed'));
    assert.deepEqual(result.metadataArgs, ['CustomObject:Account']);
    assert.ok(runner.calls.length >= 2, 'expected auth and retrieve sf commands');
    const retrieveCall = runner.calls.find(
      (call) => call.command === 'sf' && call.args.includes('project') && call.args.includes('retrieve')
    );
    assert.ok(retrieveCall, 'expected retrieve sf command');
    assert.ok(retrieveCall?.args.includes('--metadata'), 'expected selector-based metadata retrieve');
    assert.ok(!retrieveCall?.args.includes('--manifest'), 'manifest retrieve must not be used');
    console.log('org service test passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
