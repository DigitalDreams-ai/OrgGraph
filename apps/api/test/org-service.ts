import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OrgService } from '../src/modules/org/org.service';

class StubToolAdapter {
  calls: Array<{ command: string; args: string[]; cwd?: string }> = [];

  private ok(stdout = '{"status":"ok"}') {
    return { exitCode: 0, stdout, stderr: '', elapsedMs: 12 };
  }

  async probeSf(cwd: string) {
    this.calls.push({ command: 'sf', args: ['--version'], cwd });
    return this.ok('sf 2.0.0');
  }

  async probeCci(cwd: string) {
    this.calls.push({ command: 'cci', args: ['version'], cwd });
    return this.ok('3.78.0');
  }

  async ensureSfInstalled(cwd: string) {
    this.calls.push({ command: 'sf', args: ['--version'], cwd });
  }

  async ensureCciInstalled(cwd: string) {
    this.calls.push({ command: 'cci', args: ['version'], cwd });
  }

  async displayOrg(alias: string, cwd: string) {
    const args = ['org', 'display', '--target-org', alias, '--json'];
    this.calls.push({ command: 'sf', args, cwd });
    return this.ok('{"result":{"username":"user@example.com"}}');
  }

  async cciOrgInfo(alias: string, cwd: string) {
    const args = ['org', 'info', alias];
    this.calls.push({ command: 'cci', args, cwd });
    return this.ok();
  }

  async importAliasIntoCci(alias: string, username: string, cwd: string) {
    const args = ['org', 'import', alias, username];
    this.calls.push({ command: 'cci', args, cwd });
    return this.ok();
  }

  async retrieveMetadata(alias: string, metadataArgs: string[], cwd: string) {
    const args = ['project', 'retrieve', 'start', '--target-org', alias, '--wait', '1', '--json'];
    for (const metadataArg of metadataArgs) {
      args.push('--metadata', metadataArg);
    }
    this.calls.push({ command: 'sf', args, cwd });
  }

  extractSfUsername(stdout: string) {
    return JSON.parse(stdout).result.username;
  }

  extractCciVersion(stdout: string) {
    return stdout.match(/(\d+\.\d+\.\d+)/)?.[1];
  }

  toActionableBadRequest() {
    return undefined;
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

  const fakePaths = {
    sfProjectPath: () => sfProjectDir,
    sfParsePath: () => parsePath,
    orgSessionStatePath: () => path.join(root, 'data', 'org', 'session-state.json'),
    orgAuthAuditPath: () => path.join(root, 'data', 'org', 'auth-session-audit.log'),
    orgRetrieveAuditPath: () => path.join(root, 'data', 'org', 'sf-retrieve-audit.log')
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

  const toolAdapter = new StubToolAdapter();
  const service = new OrgService(fakeConfig as never, fakePaths as never, fakeIngestion as never, toolAdapter as never);

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
    assert.ok(toolAdapter.calls.length >= 2, 'expected auth and retrieve sf commands');
    const retrieveCall = toolAdapter.calls.find(
      (call) => call.command === 'sf' && call.args.includes('project') && call.args.includes('retrieve')
    );
    assert.ok(retrieveCall, 'expected retrieve sf command');
    assert.ok(retrieveCall?.args.includes('--metadata'), 'expected selector-based metadata retrieve');
    assert.ok(!retrieveCall?.args.includes('--manifest'), 'manifest retrieve must not be used');

    await assert.rejects(
      service.retrieveAndRefresh({ runAuth: false, runRetrieve: true, autoRefresh: false, selections: [] }),
      (error: unknown) => {
        const response = (error as { response?: { details?: { code?: string } } }).response;
        return response?.details?.code === 'SF_METADATA_SELECTIONS_REQUIRED';
      }
    );
    console.log('org service test passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
