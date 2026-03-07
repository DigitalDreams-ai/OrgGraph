import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OrgService } from '../src/modules/org/org.service';

class StubToolAdapter {
  calls: Array<{ command: string; args: string[]; cwd?: string }> = [];
  inaccessibleAliases = new Set<string>();
  cciAliases = new Set<string>(['orgumented-sandbox']);

  private ok(stdout = '{"status":"ok"}') {
    return { exitCode: 0, stdout, stderr: '', elapsedMs: 12 };
  }

  async probeSf(cwd: string) {
    this.calls.push({ command: 'sf', args: ['--version'], cwd });
    return this.ok('sf 2.0.0');
  }

  async probeCci(cwd: string) {
    this.calls.push({ command: 'cci', args: ['version'], cwd });
    return this.ok('4.5.0');
  }

  async ensureSfInstalled(cwd: string) {
    this.calls.push({ command: 'sf', args: ['--version'], cwd });
  }

  async ensureCciInstalled(cwd: string) {
    this.calls.push({ command: 'cci', args: ['version'], cwd });
  }

  async ensureCciProjectScaffold(cwd: string) {
    this.calls.push({ command: 'cci-scaffold', args: ['git-init', 'cumulusci-yml'], cwd });
  }

  async displayOrg(alias: string, cwd: string) {
    const args = ['org', 'display', '--target-org', alias, '--json'];
    this.calls.push({ command: 'sf', args, cwd });
    if (this.inaccessibleAliases.has(alias)) {
      return { exitCode: 1, stdout: '', stderr: `No authorization information found for ${alias}.`, elapsedMs: 12 };
    }
    return this.ok('{"result":{"username":"user@example.com","id":"00Dxx0000000001","instanceUrl":"https://example.my.salesforce.com"}}');
  }

  async listAliases(cwd: string) {
    this.calls.push({ command: 'sf', args: ['org', 'list', '--json'], cwd });
    return this.ok(
      JSON.stringify({
        result: {
          nonScratchOrgs: [
            {
              alias: 'orgumented-sandbox',
              username: 'user@example.com',
              orgId: '00Dxx0000000001',
              instanceUrl: 'https://example.my.salesforce.com',
              isDefaultUsername: true
            }
          ]
        }
      })
    );
  }

  async cciOrgInfo(alias: string, cwd: string) {
    const args = ['org', 'info', alias];
    this.calls.push({ command: 'cci', args, cwd });
    if (this.cciAliases.has(alias)) {
      return this.ok();
    }
    return { exitCode: 1, stdout: '', stderr: `Alias ${alias} not found`, elapsedMs: 12 };
  }

  async importAliasIntoCci(alias: string, username: string, cwd: string) {
    const args = ['org', 'import', alias, alias];
    this.calls.push({ command: 'cci', args, cwd });
    this.cciAliases.add(alias);
    return this.ok();
  }

  async retrieveMetadata(alias: string, metadataArgs: string[], cwd: string) {
    const args = ['project', 'retrieve', 'start', '--target-org', alias, '--wait', '1', '--json'];
    for (const metadataArg of metadataArgs) {
      args.push('--metadata', metadataArg);
    }
    this.calls.push({ command: 'sf', args, cwd });
  }

  async listMetadata(alias: string, metadataType: string, cwd: string) {
    const args = ['org', 'list', 'metadata', '--target-org', alias, '--metadata-type', metadataType, '--json'];
    this.calls.push({ command: 'sf', args, cwd });
    const fixtures: Record<string, Array<{ type: string; fullName: string; fileName?: string }>> = {
      CustomObject: [
        { type: 'CustomObject', fullName: 'Account', fileName: 'objects/Account/Account.object-meta.xml' },
        { type: 'CustomObject', fullName: 'Opportunity', fileName: 'objects/Opportunity/Opportunity.object-meta.xml' }
      ],
      Layout: [
        { type: 'Layout', fullName: 'Opportunity-Opportunity Layout', fileName: 'layouts/Opportunity-Opportunity Layout.layout-meta.xml' }
      ],
      CustomField: [
        { type: 'CustomField', fullName: 'Opportunity.StageName', fileName: 'objects/Opportunity/fields/StageName.field-meta.xml' }
      ]
    };
    return this.ok(JSON.stringify({ result: fixtures[metadataType] ?? [] }));
  }

  async listMetadataTypes(alias: string, cwd: string) {
    const args = ['org', 'list', 'metadata-types', '--target-org', alias, '--json'];
    this.calls.push({ command: 'sf', args, cwd });
    return this.ok(
      JSON.stringify({
        result: {
          metadataObjects: [
            {
              xmlName: 'CustomObject',
              directoryName: 'objects',
              inFolder: false,
              metaFile: false,
              suffix: 'object',
              childXmlNames: ['CustomField', 'RecordType']
            },
            {
              xmlName: 'Layout',
              directoryName: 'layouts',
              inFolder: false,
              metaFile: false,
              suffix: 'layout',
              childXmlNames: []
            },
            {
              xmlName: 'Flow',
              directoryName: 'flows',
              inFolder: false,
              metaFile: false,
              suffix: 'flow',
              childXmlNames: []
            },
            {
              xmlName: 'PermissionSet',
              directoryName: 'permissionsets',
              inFolder: false,
              metaFile: false,
              suffix: 'permissionset',
              childXmlNames: []
            }
          ]
        }
      })
    );
  }

  extractSfUsername(stdout: string) {
    return JSON.parse(stdout).result.username;
  }

  extractCciVersion(stdout: string) {
    return stdout.match(/(\d+\.\d+\.\d+)/)?.[1];
  }

  parseDisplayedOrg(stdout: string) {
    const parsed = JSON.parse(stdout).result;
    return {
      username: parsed.username,
      orgId: parsed.id,
      instanceUrl: parsed.instanceUrl
    };
  }

  parseAliasList(stdout: string) {
    return JSON.parse(stdout).result.nonScratchOrgs.map((org: Record<string, unknown>) => ({
      alias: org.alias,
      username: org.username,
      orgId: org.orgId,
      instanceUrl: org.instanceUrl,
      isDefault: Boolean(org.isDefaultUsername),
      source: 'sf_cli_keychain' as const
    }));
  }

  parseMetadataList(stdout: string) {
    return (JSON.parse(stdout).result ?? []).map((item: Record<string, unknown>) => ({
      type: String(item.type ?? ''),
      fullName: String(item.fullName ?? ''),
      fileName: typeof item.fileName === 'string' ? item.fileName : undefined
    }));
  }

  parseMetadataTypes(stdout: string) {
    return (JSON.parse(stdout).result?.metadataObjects ?? [])
      .map((item: Record<string, unknown>) => String(item.xmlName ?? '').trim())
      .filter((xmlName: string) => xmlName.length > 0);
  }

  parseMetadataTypeCatalog(stdout: string) {
    return (JSON.parse(stdout).result?.metadataObjects ?? [])
      .map((item: Record<string, unknown>) => ({
        type: String(item.xmlName ?? '').trim(),
        directoryName: typeof item.directoryName === 'string' ? item.directoryName : undefined,
        inFolder: item.inFolder === true,
        metaFile: item.metaFile === true,
        suffix: typeof item.suffix === 'string' ? item.suffix : undefined,
        childXmlNames: Array.isArray(item.childXmlNames)
          ? item.childXmlNames.filter((entry): entry is string => typeof entry === 'string')
          : []
      }))
      .filter((item: { type: string }) => item.type.length > 0);
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
    cciVersionPin: () => '4.5.0',
    sfAlias: () => 'orgumented-default',
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

    const aliases = await service.listSessionAliases();
    assert.equal(aliases.aliases.length, 1);
    assert.equal(aliases.aliases[0].alias, 'orgumented-sandbox');
    assert.equal(aliases.aliases[0].isDefault, true);

    const aliasValidation = await service.validateSessionAlias('orgumented-sandbox');
    assert.equal(aliasValidation.sfAccessible, true);
    assert.equal(aliasValidation.cciAvailable, true);
    assert.equal(aliasValidation.username, 'user@example.com');
    assert.equal(aliasValidation.orgId, '00Dxx0000000001');
    assert.ok(aliasValidation.issues.some((issue) => issue.code === 'SESSION_DISCONNECTED'));

    const connected = await service.connectSession({ alias: 'orgumented-sandbox' });
    assert.equal(connected.status, 'connected');
    assert.equal(connected.activeAlias, 'orgumented-sandbox');

    toolAdapter.inaccessibleAliases.add('invalid-alias');
    await assert.rejects(
      service.switchSessionAlias('invalid-alias'),
      (error: unknown) => {
        const response = (error as { response?: { details?: { code?: string } } }).response;
        return response?.details?.code === 'SF_SESSION_SWITCH_DENIED';
      }
    );
    const statusAfterFailedSwitch = service.sessionStatus();
    assert.equal(statusAfterFailedSwitch.status, 'disconnected');
    assert.equal(
      statusAfterFailedSwitch.activeAlias,
      'orgumented-sandbox',
      'failed switch should preserve last active alias for deterministic restore'
    );

    const restartedService = new OrgService(fakeConfig as never, fakePaths as never, fakeIngestion as never, toolAdapter as never);
    const restoreAfterRestart = restartedService.sessionHistory(5);
    assert.equal(restoreAfterRestart.activeAlias, 'orgumented-sandbox');
    assert.equal(restoreAfterRestart.restoreAlias, 'orgumented-sandbox');
    assert.equal(restoreAfterRestart.entries[0].action, 'switch_failed');
    assert.equal(restoreAfterRestart.entries[1].action, 'connect');

    toolAdapter.cciAliases.delete('orgumented-sandbox');
    const cciImportCallsBeforeSwitch = toolAdapter.calls.filter(
      (call) => call.command === 'cci' && call.args[0] === 'org' && call.args[1] === 'import'
    ).length;
    const switched = await restartedService.switchSessionAlias('orgumented-sandbox');
    assert.equal(switched.status, 'connected');
    assert.equal(switched.activeAlias, 'orgumented-sandbox');
    const restartedAfterSwitch = new OrgService(fakeConfig as never, fakePaths as never, fakeIngestion as never, toolAdapter as never);
    const statusAfterRestartedSwitch = restartedAfterSwitch.sessionStatus();
    assert.equal(statusAfterRestartedSwitch.status, 'connected');
    assert.equal(statusAfterRestartedSwitch.activeAlias, 'orgumented-sandbox');
    assert.equal(
      statusAfterRestartedSwitch.switchedAt,
      switched.switchedAt,
      'switch timestamp should persist across restart for deterministic session history'
    );
    const cciImportCallsAfterSwitch = toolAdapter.calls.filter(
      (call) => call.command === 'cci' && call.args[0] === 'org' && call.args[1] === 'import'
    ).length;
    assert.equal(
      cciImportCallsAfterSwitch,
      cciImportCallsBeforeSwitch + 1,
      'switch should bridge alias into cci when alias is missing'
    );

    const disconnected = restartedService.disconnectSession();
    assert.equal(disconnected.status, 'disconnected');
    assert.equal(disconnected.activeAlias, 'orgumented-sandbox');

    const sessionHistory = restartedService.sessionHistory(6);
    assert.equal(sessionHistory.activeAlias, 'orgumented-sandbox');
    assert.equal(sessionHistory.restoreAlias, 'orgumented-sandbox');
    assert.equal(sessionHistory.entries.length, 4);
    assert.equal(sessionHistory.entries[0].action, 'disconnect');
    assert.equal(sessionHistory.entries[1].action, 'switch');
    assert.equal(sessionHistory.entries[2].action, 'switch_failed');
    assert.equal(sessionHistory.entries[3].action, 'connect');
    fs.writeFileSync(fakePaths.orgAuthAuditPath(), '', 'utf8');
    const noAuditHistory = restartedService.sessionHistory(5);
    assert.equal(
      noAuditHistory.restoreAlias,
      'orgumented-sandbox',
      'restore alias should remain deterministic from persisted session state when audit history is pruned'
    );

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

    fs.mkdirSync(path.join(parsePath, 'objects', 'Opportunity', 'fields'), { recursive: true });
    fs.mkdirSync(path.join(parsePath, 'objects', 'Account', 'fields'), { recursive: true });
    fs.writeFileSync(
      path.join(parsePath, 'objects', 'Opportunity', 'Opportunity.object-meta.xml'),
      '<CustomObject><fullName>Opportunity</fullName></CustomObject>',
      'utf8'
    );
    fs.writeFileSync(
      path.join(parsePath, 'objects', 'Opportunity', 'fields', 'StageName.field-meta.xml'),
      '<CustomField><fullName>StageName</fullName></CustomField>',
      'utf8'
    );
    fs.writeFileSync(
      path.join(parsePath, 'objects', 'Account', 'Account.object-meta.xml'),
      '<CustomObject><fullName>Account</fullName></CustomObject>',
      'utf8'
    );

    const metadataCatalog = await service.metadataCatalog({ refresh: true, limit: 50 });
    assert.ok(metadataCatalog.types.some((item) => item.type === 'CustomObject'));
    const customObjectCatalog = metadataCatalog.types.find((item) => item.type === 'CustomObject');
    assert.equal(customObjectCatalog?.directoryName, 'objects');
    assert.equal(customObjectCatalog?.suffix, 'object');
    assert.deepEqual(customObjectCatalog?.childXmlNames, ['CustomField', 'RecordType']);
    assert.equal(customObjectCatalog?.childFamilyCount, 2);

    const metadataMembers = await service.metadataMembers({
      type: 'CustomObject',
      refresh: true,
      limit: 50
    });
    assert.equal(metadataMembers.type, 'CustomObject');
    assert.deepEqual(
      metadataMembers.members.map((member) => member.name),
      ['Account', 'Opportunity']
    );

    fs.rmSync(path.join(parsePath, 'objects'), { recursive: true, force: true });
    const liveCatalog = await service.metadataCatalog({ refresh: true, limit: 50 });
    assert.equal(liveCatalog.source, 'metadata_api');
    assert.ok(liveCatalog.types.some((item) => item.type === 'Layout'));
    assert.ok(
      liveCatalog.types.some((item) => item.type === 'PermissionSet'),
      'expected live metadata-types discovery to include non-seed families'
    );
    const liveLayout = liveCatalog.types.find((item) => item.type === 'Layout');
    assert.equal(liveLayout?.directoryName, 'layouts');
    assert.equal(liveLayout?.suffix, 'layout');
    assert.ok(
      liveCatalog.types.some((item) => item.type === 'Flow' && item.memberCount === 0),
      'expected zero-member metadata families to remain visible in catalog'
    );

    const liveCatalogCachePath = path.join(path.dirname(parsePath), 'metadata-live-catalog-cache.json');
    fs.writeFileSync(
      liveCatalogCachePath,
      JSON.stringify(
        {
          cacheVersion: 6,
          refreshedAt: new Date().toISOString(),
          types: [
            {
              type: 'AnimationRule',
              directoryName: 'animationRules',
              inFolder: false,
              metaFile: false,
              suffix: 'animationRule',
              childXmlNames: []
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const cacheOnlyCatalog = await service.metadataCatalog({ refresh: false, limit: 50 });
    assert.ok(
      cacheOnlyCatalog.types.some((item) => item.type === 'AnimationRule' && item.memberCount === 0),
      'cache-backed catalog should preserve families even when a cached row has no members array yet'
    );

    const liveSearch = await service.metadataSearch({
      search: 'Opportunity',
      refresh: true,
      limit: 50
    });
    assert.equal(liveSearch.source, 'metadata_api');
    assert.ok(
      liveSearch.results.some((result) => result.type === 'Layout' && result.name === 'Opportunity-Opportunity Layout')
    );

    const liveSearchCachePath = path.join(path.dirname(parsePath), 'metadata-live-search-cache.json');
    fs.writeFileSync(
      liveSearchCachePath,
      JSON.stringify(
        {
          refreshedAt: new Date().toISOString(),
          types: []
        },
        null,
        2
      ),
      'utf8'
    );
    const listMetadataCallsBeforeEmptyCacheRetry = toolAdapter.calls.filter(
      (call) => call.command === 'sf' && call.args[0] === 'org' && call.args[1] === 'list' && call.args[2] === 'metadata'
    ).length;
    const liveSearchAfterEmptyCache = await service.metadataSearch({
      search: 'Opportunity',
      refresh: false,
      limit: 50
    });
    const listMetadataCallsAfterEmptyCacheRetry = toolAdapter.calls.filter(
      (call) => call.command === 'sf' && call.args[0] === 'org' && call.args[1] === 'list' && call.args[2] === 'metadata'
    ).length;
    assert.ok(
      liveSearchAfterEmptyCache.results.some(
        (result) => result.type === 'Layout' && result.name === 'Opportunity-Opportunity Layout'
      ),
      'search should recover from stale empty live cache by re-querying org metadata'
    );
    assert.ok(
      listMetadataCallsAfterEmptyCacheRetry > listMetadataCallsBeforeEmptyCacheRetry,
      'empty live cache should trigger fresh sf metadata listing'
    );
    assert.ok(
      liveSearchAfterEmptyCache.warnings.some(
        (warning) => warning.includes('cache was empty') || warning.includes('cache version mismatch')
      ),
      'response should surface warning when stale live cache is bypassed'
    );

    const flowTypeSearch = await service.metadataSearch({
      search: 'flow',
      refresh: true,
      limit: 50
    });
    assert.ok(
      flowTypeSearch.results.some((result) => result.kind === 'type' && result.type === 'Flow'),
      'expected type-name search to return zero-member families'
    );

    const liveMembers = await service.metadataMembers({
      type: 'Layout',
      refresh: true,
      limit: 50
    });
    assert.equal(liveMembers.source, 'metadata_api');
    assert.deepEqual(
      liveMembers.members.map((member) => member.name),
      ['Opportunity-Opportunity Layout']
    );

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
