import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

function resolveWorkspaceRoot(): string {
  return path.resolve(process.cwd(), '../..');
}

async function run(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const dbPath = path.join(workspaceRoot, 'data', 'orgumented.integration.db');
  const evidencePath = path.join(workspaceRoot, 'data', 'evidence.integration.json');
  const userMapPath = path.join(workspaceRoot, 'data', 'user-profile-map.integration.json');
  const semanticSnapshotPath = path.join(
    workspaceRoot,
    'data',
    'refresh',
    'semantic-snapshot.integration.json'
  );
  const metaContextPath = path.join(workspaceRoot, 'data', 'meta', 'context.integration.json');
  fs.mkdirSync(path.join(workspaceRoot, 'data'), { recursive: true });
  const sfParseFixturePath = fs.mkdtempSync(path.join(workspaceRoot, 'data', 'tmp-sf-parse-'));
  const latestRetrieveEvidenceScope = {
    kind: 'latest_retrieve' as const,
    alias: 'fixture-org',
    parsePath: sfParseFixturePath,
    metadataArgs: [
      'Flow:OpportunityStageSync',
      'Flow:Civil_Rights_Intake_Questionnaire',
      'CustomObject:Opportunity',
      'CustomField:Opportunity.StageName'
    ],
    selections: [
      { type: 'Flow', members: ['OpportunityStageSync', 'Civil_Rights_Intake_Questionnaire'] },
      { type: 'CustomObject', members: ['Opportunity'] },
      { type: 'CustomField', members: ['Opportunity.StageName'] }
    ]
  };

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.cpSync(path.join(workspaceRoot, 'fixtures', 'permissions'), sfParseFixturePath, { recursive: true });
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { force: true });
  }
  if (fs.existsSync(semanticSnapshotPath)) {
    fs.rmSync(semanticSnapshotPath, { force: true });
  }
  fs.writeFileSync(
    userMapPath,
    JSON.stringify(
      {
        'jane@example.com': ['Support', 'Support']
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.GRAPH_BACKEND = 'sqlite';
  process.env.PERMISSIONS_FIXTURES_PATH = path.join(workspaceRoot, 'fixtures', 'permissions');
  process.env.USER_PROFILE_MAP_PATH = userMapPath;
  process.env.EVIDENCE_INDEX_PATH = evidencePath;
  process.env.SEMANTIC_SNAPSHOT_PATH = semanticSnapshotPath;
  process.env.META_CONTEXT_PATH = metaContextPath;
  process.env.SF_PARSE_PATH = sfParseFixturePath;
  process.env.SF_INTEGRATION_ENABLED = 'false';
  process.env.ASK_DEFAULT_MODE = 'deterministic';
  process.env.LLM_ENABLED = 'true';
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.LLM_ALLOW_PROVIDER_OVERRIDE = 'true';
  process.env.ASK_LLM_COST_BUDGET_USD = '0.05';
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  process.env.ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
  const mockAnthropicUrl = 'https://anthropic.mock.local/v1/messages';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.OPENAI_MODEL = 'gpt-4.1-mini';
  const mockOpenAiUrl = 'https://openai.mock.local/v1/chat/completions';
  process.env.OPENAI_BASE_URL = mockOpenAiUrl;
  process.env.ANTHROPIC_BASE_URL = mockAnthropicUrl;

  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url === mockAnthropicUrl) {
      return new Response(
        JSON.stringify({
          usage: {
            input_tokens: 120,
            output_tokens: 55
          },
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                answer: 'Mocked Anthropic answer grounded in citation [1].',
                reasoning_summary: 'Mocked for integration coverage.',
                citations_used: [1]
              })
            }
          ]
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
    if (url === mockOpenAiUrl) {
      return new Response(
        JSON.stringify({
          usage: {
            prompt_tokens: 110,
            completion_tokens: 44,
            total_tokens: 154
          },
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: 'Mocked OpenAI answer grounded in citation [1].',
                  reasoning_summary: 'Mocked for integration coverage.',
                  citations_used: [1]
                })
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
    return originalFetch(input as RequestInfo | URL, init);
  };

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0);

  try {
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'string' ? 0 : addr.port;
    assert.ok(port > 0, 'expected app to listen on an ephemeral port');

    const base = `http://127.0.0.1:${port}`;

    const healthRes = await fetch(`${base}/health`);
    assert.equal(healthRes.status, 200, 'health should return 200');
    const healthBody = (await healthRes.json()) as { status: string; service: string };
    assert.equal(healthBody.status, 'ok');
    assert.equal(healthBody.service, 'api');

    const refreshRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    assert.equal(refreshRes.status, 201, 'refresh should return 201');
    const refreshBody = (await refreshRes.json()) as {
      snapshotId: string;
      mode: string;
      skipped: boolean;
      nodeCount: number;
      edgeCount: number;
      ontology: { violationCount: number; warningCount: number };
      semanticDiff: { addedNodeCount: number; addedEdgeCount: number };
      meaningChangeSummary: string;
      driftPolicy: { policyId: string; enforceOnRefresh: boolean };
      driftEvaluation: { withinBudget: boolean; isBootstrap: boolean };
      driftReportPath: string;
    };
    const baselineSnapshotId = refreshBody.snapshotId;
    assert.equal(typeof baselineSnapshotId, 'string');
    assert.equal(refreshBody.mode, 'full', 'default refresh mode should be full');
    assert.equal(refreshBody.skipped, false, 'default refresh should not skip');
    assert.ok(refreshBody.nodeCount > 0, 'refresh should create nodes');
    assert.ok(refreshBody.edgeCount > 0, 'refresh should create edges');
    assert.equal(refreshBody.ontology.violationCount, 0, 'refresh should not emit ontology violations');
    assert.ok(refreshBody.semanticDiff.addedNodeCount > 0);
    assert.ok(refreshBody.semanticDiff.addedEdgeCount > 0);
    assert.equal(typeof refreshBody.meaningChangeSummary, 'string');
    assert.equal(typeof refreshBody.driftPolicy.policyId, 'string');
    assert.equal(refreshBody.driftEvaluation.isBootstrap, true);
    assert.equal(refreshBody.driftEvaluation.withinBudget, true);
    assert.equal(typeof refreshBody.driftReportPath, 'string');

    const readyRes = await fetch(`${base}/ready`);
    assert.equal(readyRes.status, 200, 'ready should return 200');
    const readyBody = (await readyRes.json()) as {
      status: string;
      checks: { db: { ok: boolean; backend: string }; fixtures: { ok: boolean } };
    };
    assert.equal(readyBody.status, 'ready');
    assert.equal(readyBody.checks.db.ok, true);
    assert.equal(readyBody.checks.db.backend, 'sqlite');
    assert.equal(readyBody.checks.fixtures.ok, true);

    const ingestLatestRes = await fetch(`${base}/ingest/latest`);
    assert.equal(ingestLatestRes.status, 200, 'ingest latest should return 200');
    const ingestLatestBody = (await ingestLatestRes.json()) as {
      latest?: { parserStats?: Array<{ parser: string }> };
      lowConfidenceSources: unknown[];
      auditPath: string;
      ontologyReportPath: string;
      ontology: { violationCount: number };
    };
    assert.ok(Array.isArray(ingestLatestBody.lowConfidenceSources));
    assert.equal(typeof ingestLatestBody.auditPath, 'string');
    assert.equal(typeof ingestLatestBody.ontologyReportPath, 'string');
    assert.ok((ingestLatestBody.latest?.parserStats?.length ?? 0) >= 1);
    assert.equal(ingestLatestBody.ontology.violationCount, 0);

    const refreshIncrementalRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'incremental' })
    });
    assert.equal(refreshIncrementalRes.status, 201, 'incremental refresh should return 201');
    const refreshIncrementalBody = (await refreshIncrementalRes.json()) as {
      snapshotId: string;
      mode: string;
      skipped: boolean;
      skipReason?: string;
      nodeCount: number;
      edgeCount: number;
      semanticDiff: { addedNodeCount: number; removedNodeCount: number };
      meaningChangeSummary: string;
      driftEvaluation: { withinBudget: boolean; isBootstrap: boolean };
    };
    assert.equal(refreshIncrementalBody.snapshotId, baselineSnapshotId);
    assert.equal(refreshIncrementalBody.mode, 'incremental');
    assert.equal(refreshIncrementalBody.skipped, true, 'incremental refresh should skip unchanged fixtures');
    assert.equal(refreshIncrementalBody.skipReason, 'no_changes_detected');
    assert.ok(refreshIncrementalBody.nodeCount > 0);
    assert.ok(refreshIncrementalBody.edgeCount > 0);
    assert.equal(refreshIncrementalBody.semanticDiff.addedNodeCount, 0);
    assert.equal(refreshIncrementalBody.semanticDiff.removedNodeCount, 0);
    assert.match(refreshIncrementalBody.meaningChangeSummary, /no semantic changes/i);
    assert.equal(refreshIncrementalBody.driftEvaluation.withinBudget, true);
    assert.equal(refreshIncrementalBody.driftEvaluation.isBootstrap, false);

    const modifiedRoot = fs.mkdtempSync(path.join(workspaceRoot, 'data', 'tmp-phase14-'));
    fs.cpSync(path.join(workspaceRoot, 'fixtures', 'permissions'), modifiedRoot, { recursive: true });
    fs.rmSync(path.join(modifiedRoot, 'apex-classes', 'OpportunityImpactService.cls'), { force: true });

    const changedRefreshRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fixturesPath: modifiedRoot, mode: 'full' })
    });
    assert.equal(changedRefreshRes.status, 201, 'changed fixtures refresh should return 201');
    const changedRefreshBody = (await changedRefreshRes.json()) as {
      snapshotId: string;
      semanticDiff: { removedNodeCount: number; changedNodeTypeCounts: Record<string, number> };
      driftEvaluation: { withinBudget: boolean };
    };
    assert.notEqual(changedRefreshBody.snapshotId, baselineSnapshotId);
    assert.ok(changedRefreshBody.semanticDiff.removedNodeCount > 0);
    assert.equal(changedRefreshBody.semanticDiff.changedNodeTypeCounts.ApexClass, -1);
    assert.equal(changedRefreshBody.driftEvaluation.withinBudget, true);

    const snapshotDiffRes = await fetch(
      `${base}/refresh/diff/${baselineSnapshotId}/${changedRefreshBody.snapshotId}`
    );
    assert.equal(snapshotDiffRes.status, 200, 'snapshot diff endpoint should return 200');
    const snapshotDiffBody = (await snapshotDiffRes.json()) as {
      snapshots: { from: { snapshotId: string }; to: { snapshotId: string } };
      semanticDiff: { changedNodeTypeCounts: Record<string, number> };
      driftEvaluation: { withinBudget: boolean };
      reportTemplate: { topChangedScus: unknown[]; impactedPaths: unknown[] };
    };
    assert.equal(snapshotDiffBody.snapshots.from.snapshotId, baselineSnapshotId);
    assert.equal(snapshotDiffBody.snapshots.to.snapshotId, changedRefreshBody.snapshotId);
    assert.equal(snapshotDiffBody.semanticDiff.changedNodeTypeCounts.ApexClass, -1);
    assert.equal(snapshotDiffBody.driftEvaluation.withinBudget, true);
    assert.ok(snapshotDiffBody.reportTemplate.topChangedScus.length > 0);
    assert.ok(snapshotDiffBody.reportTemplate.impactedPaths.length > 0);

    const strictRoot = fs.mkdtempSync(path.join(workspaceRoot, 'data', 'tmp-phase14-strict-'));
    fs.cpSync(path.join(workspaceRoot, 'fixtures', 'permissions'), strictRoot, { recursive: true });
    fs.rmSync(path.join(strictRoot, 'flows', 'OpportunityStageSync.flow-meta.xml'), { force: true });

    process.env.DRIFT_BUDGET_ENFORCE_ON_REFRESH = 'true';
    process.env.DRIFT_BUDGET_AUTOMATION_NODE_DELTA_MAX = '0';
    const strictRefreshRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fixturesPath: strictRoot, mode: 'full' })
    });
    assert.equal(strictRefreshRes.status, 400, 'drift budget gate should block unsafe update');
    const strictRefreshBody = (await strictRefreshRes.json()) as { error?: { message?: string } };
    assert.match(String(strictRefreshBody.error?.message ?? ''), /drift budget exceeded/i);

    const rebaselineRoot = path.join(
      fs.mkdtempSync(path.join(workspaceRoot, 'data', 'tmp-phase14-rebaseline-')),
      'force-app',
      'main',
      'default'
    );
    fs.mkdirSync(path.dirname(rebaselineRoot), { recursive: true });
    fs.cpSync(path.join(workspaceRoot, 'fixtures', 'permissions'), rebaselineRoot, { recursive: true });
    fs.rmSync(path.join(rebaselineRoot, 'flows', 'OpportunityStageSync.flow-meta.xml'), { force: true });

    const rebaselineRefreshRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fixturesPath: rebaselineRoot, mode: 'full', rebaseline: true })
    });
    assert.equal(rebaselineRefreshRes.status, 201, 'explicit rebaseline should bypass drift gate');
    const rebaselineRefreshBody = (await rebaselineRefreshRes.json()) as {
      rebaselineApplied: boolean;
      driftEvaluation: { isBootstrap: boolean; withinBudget: boolean };
      sourcePath: string;
    };
    assert.equal(rebaselineRefreshBody.rebaselineApplied, true);
    assert.equal(rebaselineRefreshBody.driftEvaluation.isBootstrap, true);
    assert.equal(rebaselineRefreshBody.sourcePath, rebaselineRoot);

    fs.rmSync(path.dirname(path.dirname(path.dirname(rebaselineRoot))), { recursive: true, force: true });
    delete process.env.DRIFT_BUDGET_AUTOMATION_NODE_DELTA_MAX;

    fs.rmSync(modifiedRoot, { recursive: true, force: true });
    fs.rmSync(strictRoot, { recursive: true, force: true });

    const restoreBaselineRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    assert.equal(restoreBaselineRes.status, 201, 'baseline refresh should restore canonical fixture graph');

    const malformedRefreshRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fixturesPath: 42 })
    });
    assert.equal(malformedRefreshRes.status, 400, 'refresh should reject malformed fixturesPath');
    const malformedRefreshBody = (await malformedRefreshRes.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(malformedRefreshBody.error.code, 'BAD_REQUEST');

    const malformedModeRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'delta' })
    });
    assert.equal(malformedModeRes.status, 400, 'refresh should reject invalid mode');
    const malformedModeBody = (await malformedModeRes.json()) as { error: { code: string } };
    assert.equal(malformedModeBody.error.code, 'BAD_REQUEST');

    const orgRetrieveDisabledRes = await fetch(`${base}/org/retrieve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    assert.equal(
      orgRetrieveDisabledRes.status,
      400,
      'org retrieve should reject when SF integration is disabled'
    );
    const orgRetrieveDisabledBody = (await orgRetrieveDisabledRes.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(orgRetrieveDisabledBody.error.code, 'BAD_REQUEST');

    const orgBridgeDisabledRes = await fetch(`${base}/org/session/bridge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ alias: 'orgumented-sandbox' })
    });
    assert.equal(
      orgBridgeDisabledRes.status,
      400,
      'org session bridge should reject when SF integration is disabled'
    );

    const orgBridgeBadAliasRes = await fetch(`${base}/org/session/bridge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ alias: 7 })
    });
    assert.equal(orgBridgeBadAliasRes.status, 400, 'org session bridge should validate alias payload');

    const orgStatusRes = await fetch(`${base}/org/status`);
    assert.equal(orgStatusRes.status, 200, 'org status should return 200');
    const orgStatusBody = (await orgStatusRes.json()) as {
      integrationEnabled: boolean;
      authMode: string;
      sf: { installed: boolean };
    };
    assert.equal(orgStatusBody.integrationEnabled, false);
    assert.equal(orgStatusBody.authMode, 'sf_cli_keychain');
    assert.equal(typeof orgStatusBody.sf.installed, 'boolean');

    const orgRetrieveBadBodyRes = await fetch(`${base}/org/retrieve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ runAuth: 'yes' })
    });
    assert.equal(orgRetrieveBadBodyRes.status, 400, 'org retrieve should validate boolean body flags');

    const metadataCatalogRes = await fetch(`${base}/org/metadata/catalog?limit=50&refresh=true`);
    assert.equal(metadataCatalogRes.status, 200, 'metadata catalog should return 200');
    const metadataCatalogBody = (await metadataCatalogRes.json()) as {
      source: string;
      totalTypes: number;
      types: Array<{ type: string }>;
      warnings?: string[];
    };
    assert.ok(['local', 'cache', 'metadata_api'].includes(metadataCatalogBody.source));
    if (metadataCatalogBody.totalTypes === 0) {
      assert.ok(
        Array.isArray(metadataCatalogBody.warnings) &&
          metadataCatalogBody.warnings.some((warning) => warning.includes('parse path not found'))
      );
      assert.equal(metadataCatalogBody.types.length, 0);
    } else {
      assert.ok(metadataCatalogBody.totalTypes > 0);
      assert.ok(metadataCatalogBody.types.some((item) => item.type === 'CustomObject'));
    }

    const metadataSearchRes = await fetch(`${base}/org/metadata/catalog?q=case&limit=50`);
    assert.equal(metadataSearchRes.status, 200, 'metadata catalog search should return 200');

    const metadataSearchByNameRes = await fetch(
      `${base}/org/metadata/search?q=opportunity%20stage%20sync&limit=50`
    );
    assert.equal(metadataSearchByNameRes.status, 200, 'metadata name search should return 200');
    const metadataSearchByNameBody = (await metadataSearchByNameRes.json()) as {
      totalResults: number;
      warnings?: string[];
      results: Array<{ kind: string; type: string; name: string }>;
    };
    assert.ok(metadataSearchByNameBody.totalResults > 0, 'metadata name search should return at least one result');
    assert.ok(
      metadataSearchByNameBody.results.some(
        (item) => item.kind === 'member' && item.type === 'Flow' && item.name === 'OpportunityStageSync'
      ),
      'metadata search should match normalized flow name query'
    );

    const metadataMembersRes = await fetch(
      `${base}/org/metadata/members?type=CustomObject&q=Account&limit=50`
    );
    assert.equal(metadataMembersRes.status, 200, 'metadata members should return 200');
    const metadataMembersBody = (await metadataMembersRes.json()) as {
      type: string;
      totalMembers: number;
      members: Array<{ name: string }>;
    };
    assert.equal(metadataMembersBody.type, 'CustomObject');
    assert.ok(Array.isArray(metadataMembersBody.members));

    const metadataRetrieveRes = await fetch(`${base}/org/metadata/retrieve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selections: [{ type: 'CustomObject', members: ['Account'] }]
      })
    });
    assert.equal(
      metadataRetrieveRes.status,
      400,
      'metadata retrieve should reject when SF integration is disabled'
    );

    const brokenTempBase = path.join(workspaceRoot, 'data');
    fs.mkdirSync(brokenTempBase, { recursive: true });
    const brokenRoot = fs.mkdtempSync(path.join(brokenTempBase, 'tmp-broken-'));
    const brokenProfilesPath = path.join(brokenRoot, 'profiles');
    fs.mkdirSync(brokenProfilesPath, { recursive: true });
    fs.writeFileSync(
      path.join(brokenProfilesPath, 'Broken.profile-meta.xml'),
      `<?xml version="1.0" encoding="UTF-8"?><NotPermissionSet><objectPermissions /></NotPermissionSet>`,
      'utf8'
    );

    const malformedXmlRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fixturesPath: brokenRoot })
    });
    assert.equal(malformedXmlRes.status, 400, 'refresh should reject malformed XML with 400');
    const malformedXmlBody = (await malformedXmlRes.json()) as { error?: { message?: string } };
    assert.match(
      String(malformedXmlBody.error?.message ?? ''),
      /Broken\.profile-meta\.xml/,
      'malformed XML error should include failing filename'
    );
    fs.rmSync(brokenRoot, { recursive: true, force: true });

    const permsPositiveRes = await fetch(`${base}/perms?user=jane@example.com&object=Case`);
    assert.equal(permsPositiveRes.status, 200, 'perms positive should return 200');
    const permsPositive = (await permsPositiveRes.json()) as {
      granted: boolean;
      objectGranted: boolean;
      paths: unknown[];
      principalsChecked: string[];
      mappingStatus: string;
      warnings: string[];
    };
    assert.equal(permsPositive.granted, true, 'jane should have object grant');
    assert.equal(permsPositive.objectGranted, true, 'objectGranted should be true');
    assert.ok(permsPositive.paths.length > 0, 'paths should include a deterministic path');
    assert.deepEqual(permsPositive.principalsChecked, ['Support']);
    assert.equal(permsPositive.mappingStatus, 'resolved');
    assert.equal(permsPositive.warnings.length, 0);

    const permsUnknownUserRes = await fetch(`${base}/perms?user=missing@example.com&object=Case`);
    assert.equal(permsUnknownUserRes.status, 200, 'unknown user should still return 200');
    const permsUnknownUser = (await permsUnknownUserRes.json()) as {
      granted: boolean;
      mappingStatus: string;
      warnings: string[];
    };
    assert.equal(permsUnknownUser.granted, false, 'unknown user should not have grant');
    assert.equal(permsUnknownUser.mappingStatus, 'unmapped_user');
    assert.ok(permsUnknownUser.warnings.length > 0);

    const permsDiagnoseRes = await fetch(`${base}/perms/diagnose?user=jane@example.com`);
    assert.equal(permsDiagnoseRes.status, 200, 'perms diagnose should return 200');
    const permsDiagnose = (await permsDiagnoseRes.json()) as {
      user: string;
      mapExists: boolean;
      principals: string[];
      mappingStatus: 'resolved' | 'unmapped_user' | 'map_missing';
    };
    assert.equal(permsDiagnose.user, 'jane@example.com');
    assert.equal(permsDiagnose.mapExists, true);
    assert.equal(permsDiagnose.mappingStatus, 'resolved');
    assert.ok(permsDiagnose.principals.includes('Support'));

    const systemPermPositiveRes = await fetch(
      `${base}/perms/system?user=jane@example.com&permission=ApproveUninstalledConnectedApps`
    );
    assert.equal(systemPermPositiveRes.status, 200, 'system permission positive should return 200');
    const systemPermPositive = (await systemPermPositiveRes.json()) as {
      granted: boolean;
      totalPaths: number;
      paths: Array<{ permission: string }>;
    };
    assert.equal(
      systemPermPositive.granted,
      true,
      'jane should have ApproveUninstalledConnectedApps'
    );
    assert.ok(systemPermPositive.totalPaths > 0, 'system permission should include at least one path');
    assert.equal(systemPermPositive.paths[0]?.permission, 'ApproveUninstalledConnectedApps');

    const systemPermNegativeRes = await fetch(
      `${base}/perms/system?user=jane@example.com&permission=ManageSandboxes`
    );
    assert.equal(systemPermNegativeRes.status, 200, 'system permission negative should return 200');
    const systemPermNegative = (await systemPermNegativeRes.json()) as { granted: boolean };
    assert.equal(
      systemPermNegative.granted,
      false,
      'jane should not have ManageSandboxes in fixtures'
    );

    const fieldPositiveRes = await fetch(
      `${base}/perms?user=jane@example.com&object=Case&field=Case.Status`
    );
    assert.equal(fieldPositiveRes.status, 200, 'field positive should return 200');
    const fieldPositive = (await fieldPositiveRes.json()) as {
      granted: boolean;
      objectGranted: boolean;
      fieldGranted?: boolean;
    };
    assert.equal(fieldPositive.granted, true, 'field grant should be true for Case.Status');
    assert.equal(fieldPositive.objectGranted, true, 'object grant should be true for Case');
    assert.equal(fieldPositive.fieldGranted, true, 'fieldGranted should be true for Case.Status');

    const fieldNegativeRes = await fetch(
      `${base}/perms?user=jane@example.com&object=Case&field=Account.Secret__c`
    );
    assert.equal(fieldNegativeRes.status, 200, 'field negative should return 200');
    const fieldNegative = (await fieldNegativeRes.json()) as {
      granted: boolean;
      objectGranted: boolean;
      fieldGranted?: boolean;
    };
    assert.equal(fieldNegative.granted, false, 'field grant should be false for Account.Secret__c');
    assert.equal(fieldNegative.objectGranted, true, 'object grant should remain true');
    assert.equal(fieldNegative.fieldGranted, false, 'fieldGranted should be false');

    const missingParamsRes = await fetch(`${base}/perms?user=jane@example.com`);
    assert.equal(missingParamsRes.status, 400, 'missing object param should return 400');
    const missingParamsBody = (await missingParamsRes.json()) as { error: { code: string } };
    assert.equal(missingParamsBody.error.code, 'BAD_REQUEST');

    const invalidUserRes = await fetch(`${base}/perms?user=bad-email&object=Case`);
    assert.equal(invalidUserRes.status, 400, 'invalid user email should return 400');

    const invalidFieldRes = await fetch(`${base}/impact?field=not_a_field`);
    assert.equal(invalidFieldRes.status, 400, 'invalid field format should return 400');

    const automationRes = await fetch(`${base}/automation?object=Case`);
    assert.equal(automationRes.status, 200, 'automation endpoint should return 200');
    const automationBody = (await automationRes.json()) as {
      status: string;
      automations: Array<{ type: string; name: string; rel: string; confidence: string; score: number }>;
      strictMode: boolean;
      minConfidenceApplied: string;
      explainMode: boolean;
    };
    assert.equal(automationBody.status, 'implemented', 'automation endpoint should be implemented');
    assert.ok(automationBody.automations.length > 0, 'automation should return at least one item');
    assert.equal(automationBody.automations[0].name, 'CaseBeforeUpdate');
    assert.equal(automationBody.automations[0].rel, 'TRIGGERS_ON');
    assert.equal(typeof automationBody.automations[0].score, 'number');
    assert.equal(automationBody.strictMode, false);
    assert.equal(automationBody.minConfidenceApplied, 'medium');
    assert.equal(automationBody.explainMode, false);

    const automationExplainRes = await fetch(
      `${base}/automation?object=Case&explain=true&includeLowConfidence=true`
    );
    assert.equal(automationExplainRes.status, 200, 'automation explain should return 200');
    const automationExplainBody = (await automationExplainRes.json()) as {
      explainMode: boolean;
      minConfidenceApplied: string;
      explain?: { scoring?: { relBaseScore?: Record<string, number> } };
    };
    assert.equal(automationExplainBody.explainMode, true);
    assert.equal(automationExplainBody.minConfidenceApplied, 'low');
    assert.equal(typeof automationExplainBody.explain?.scoring?.relBaseScore?.QUERIES, 'number');

    const automationOppRes = await fetch(`${base}/automation?object=Opportunity`);
    assert.equal(automationOppRes.status, 200, 'automation opportunity endpoint should return 200');
    const automationOppBody = (await automationOppRes.json()) as {
      status: string;
      automations: Array<{ type: string; name: string; rel: string }>;
      totalAutomations: number;
      truncated: boolean;
    };
    assert.equal(automationOppBody.status, 'implemented');
    assert.ok(
      automationOppBody.automations.some((item) => item.name === 'OpportunityStageSync'),
      'automation should include flow for Opportunity'
    );
    assert.ok(automationOppBody.automations.length > 0, 'automation should return at least one item');
    assert.equal(automationOppBody.totalAutomations >= automationOppBody.automations.length, true);
    assert.equal(automationOppBody.truncated, false);

    const impactPositiveRes = await fetch(`${base}/impact?field=Opportunity.StageName`);
    assert.equal(impactPositiveRes.status, 200, 'impact positive should return 200');
    const impactPositive = (await impactPositiveRes.json()) as {
      status: string;
      paths: Array<{ from: string; rel: string; to: string; confidence: string; score: number }>;
      totalPaths: number;
      truncated: boolean;
      strictMode: boolean;
      minConfidenceApplied: string;
      explainMode: boolean;
    };
    assert.equal(impactPositive.status, 'implemented', 'impact endpoint should be implemented');
    assert.ok(
      impactPositive.paths.some((item) => item.to === 'Opportunity.StageName'),
      'impact should include field-level path'
    );
    assert.equal(impactPositive.totalPaths >= impactPositive.paths.length, true);
    assert.equal(impactPositive.truncated, false);
    assert.equal(impactPositive.strictMode, false);
    assert.equal(impactPositive.minConfidenceApplied, 'medium');
    assert.equal(impactPositive.explainMode, false);
    assert.equal(typeof impactPositive.paths[0].score, 'number');

    const impactStrictRes = await fetch(
      `${base}/impact?field=Opportunity.StageName&strict=true&debug=true&explain=true`
    );
    assert.equal(impactStrictRes.status, 200, 'impact strict/debug should return 200');
    const impactStrict = (await impactStrictRes.json()) as {
      strictMode: boolean;
      minConfidenceApplied: string;
      explainMode: boolean;
      explain?: { scoring?: { confidenceWeights?: Record<string, number> } };
      debug?: { raw: unknown[] };
    };
    assert.equal(impactStrict.strictMode, true);
    assert.equal(impactStrict.minConfidenceApplied, 'medium');
    assert.equal(impactStrict.explainMode, true);
    assert.equal(typeof impactStrict.explain?.scoring?.confidenceWeights?.high, 'number');
    assert.ok(Array.isArray(impactStrict.debug?.raw));

    const impactNegativeRes = await fetch(`${base}/impact?field=Lead.Unused__c`);
    assert.equal(impactNegativeRes.status, 200, 'impact negative should return 200');
    const impactNegative = (await impactNegativeRes.json()) as { paths: unknown[] };
    assert.equal(impactNegative.paths.length, 0, 'impact should return no paths for unknown field');

    const askPermsRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'Can jane@example.com edit object Case?' })
    });
    assert.equal(askPermsRes.status, 201, 'ask perms should return 201');
    const askPerms = (await askPermsRes.json()) as {
      status: string;
      plan: {
        intent: string;
        semanticFrame?: {
          intent: string;
          sourceMode: string;
          target?: { selected?: string; kind?: string };
          admissibility: { status: string; reason: string | null };
        };
      };
      citations: unknown[];
      mode: string;
      trustLevel: string;
      policy: { policyId: string };
      metrics: { groundingScore: number; constraintSatisfaction: number };
      proof: { proofId: string; replayToken: string; snapshotId: string };
      llm: { enabled: boolean; used: boolean; provider: string; fallbackReason?: string };
      deterministicAnswer: string;
      consistency: { checked: boolean; aligned: boolean };
    };
    assert.equal(askPerms.status, 'implemented');
    assert.equal(askPerms.plan.intent, 'perms');
    assert.equal(askPerms.plan.semanticFrame?.intent, 'permission_path_explanation');
    assert.equal(askPerms.plan.semanticFrame?.sourceMode, 'graph_global');
    assert.equal(askPerms.plan.semanticFrame?.target?.kind, 'object');
    assert.equal(askPerms.plan.semanticFrame?.target?.selected, 'Case');
    assert.equal(askPerms.plan.semanticFrame?.admissibility.status, 'accepted');
    assert.ok(askPerms.citations.length > 0, 'ask should include citations');
    assert.equal(askPerms.mode, 'deterministic');
    assert.equal(askPerms.llm.used, false);
    assert.equal(typeof askPerms.deterministicAnswer, 'string');
    assert.equal(askPerms.consistency.checked, false);
    assert.equal(askPerms.consistency.aligned, true);
    assert.equal(askPerms.trustLevel, 'trusted');
    assert.equal(typeof askPerms.policy.policyId, 'string');
    assert.equal(typeof askPerms.metrics.groundingScore, 'number');
    assert.equal(typeof askPerms.metrics.constraintSatisfaction, 'number');
    assert.equal(typeof askPerms.proof.proofId, 'string');
    assert.equal(typeof askPerms.proof.replayToken, 'string');
    assert.equal(typeof askPerms.proof.snapshotId, 'string');

    const askPermsRepeatRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'Can jane@example.com edit object Case?' })
    });
    assert.equal(askPermsRepeatRes.status, 201, 'repeat ask perms should return 201');
    const askPermsRepeat = (await askPermsRepeatRes.json()) as {
      deterministicAnswer: string;
      trustLevel: string;
      policy: { policyId: string };
      proof: { proofId: string; replayToken: string; snapshotId: string };
    };
    assert.equal(
      askPermsRepeat.deterministicAnswer,
      askPerms.deterministicAnswer,
      'repeat ask should preserve deterministic answer'
    );
    assert.equal(askPermsRepeat.trustLevel, askPerms.trustLevel, 'repeat ask should preserve trust level');
    assert.equal(
      askPermsRepeat.policy.policyId,
      askPerms.policy.policyId,
      'repeat ask should preserve policy identity'
    );
    assert.equal(
      askPermsRepeat.proof.snapshotId,
      askPerms.proof.snapshotId,
      'repeat ask should preserve snapshot identity'
    );
    assert.equal(
      askPermsRepeat.proof.proofId,
      askPerms.proof.proofId,
      'repeat ask should preserve proof identity'
    );
    assert.equal(
      askPermsRepeat.proof.replayToken,
      askPerms.proof.replayToken,
      'repeat ask should preserve replay token'
    );

    const askAutomationRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'What runs on object Opportunity?' })
    });
    assert.equal(askAutomationRes.status, 201, 'ask automation should return 201');
    const askAutomation = (await askAutomationRes.json()) as {
      plan: {
        intent: string;
        semanticFrame?: {
          intent: string;
          sourceMode: string;
          target?: { selected?: string; kind?: string };
          admissibility: { status: string; reason: string | null };
        };
      };
    };
    assert.equal(askAutomation.plan.intent, 'automation');
    assert.equal(askAutomation.plan.semanticFrame?.intent, 'automation_path_explanation');
    assert.equal(askAutomation.plan.semanticFrame?.sourceMode, 'graph_global');
    assert.equal(askAutomation.plan.semanticFrame?.target?.kind, 'object');
    assert.equal(askAutomation.plan.semanticFrame?.target?.selected, 'Opportunity');
    assert.equal(askAutomation.plan.semanticFrame?.admissibility.status, 'accepted');

    const askBlockedAutomationRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'What automations update this?' })
    });
    assert.equal(
      askBlockedAutomationRes.status,
      201,
      'blocked automation ask should return 201'
    );
    const askBlockedAutomation = (await askBlockedAutomationRes.json()) as {
      trustLevel: string;
      deterministicAnswer: string;
      plan: {
        intent: string;
        semanticFrame?: {
          admissibility: { status: string; reason: string | null };
        };
      };
      proof: { rejectedBranches: Array<{ reasonCode: string }> };
    };
    assert.equal(askBlockedAutomation.plan.intent, 'automation');
    assert.equal(askBlockedAutomation.plan.semanticFrame?.admissibility.status, 'blocked');
    assert.equal(
      askBlockedAutomation.plan.semanticFrame?.admissibility.reason,
      'no_grounded_target'
    );
    assert.equal(askBlockedAutomation.trustLevel, 'refused');
    assert.match(
      askBlockedAutomation.deterministicAnswer,
      /could not ground a deterministic field or object target from the query/i
    );
    assert.ok(
      askBlockedAutomation.proof.rejectedBranches.some(
        (branch) => branch.reasonCode === 'SEMANTIC_FRAME_BLOCKED'
      )
    );

    const askFlowEvidenceRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'Based only on the latest retrieve, explain what Flow OpportunityStageSync reads and writes.',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(askFlowEvidenceRes.status, 201, 'ask flow evidence should return 201');
    const askFlowEvidence = (await askFlowEvidenceRes.json()) as {
      plan: { intent: string; entities: { object?: string } };
      deterministicAnswer: string;
      citations?: Array<{ sourcePath?: string }>;
      decisionPacket?: {
        kind?: string;
        focus?: string;
        targetLabel?: string;
        targetType?: string;
        topRiskDrivers?: string[];
        changeImpact?: { summary?: string };
        nextActions?: Array<{ label?: string }>;
      };
    };
    assert.equal(askFlowEvidence.plan.intent, 'automation');
    assert.equal(askFlowEvidence.plan.entities.object, undefined);
    assert.match(askFlowEvidence.deterministicAnswer, /reads:/i);
    assert.match(askFlowEvidence.deterministicAnswer, /writes:/i);
    assert.match(askFlowEvidence.deterministicAnswer, /read objects:/i);
    assert.match(askFlowEvidence.deterministicAnswer, /write objects:/i);
    assert.match(askFlowEvidence.deterministicAnswer, /Opportunity\.StageName/i);
    assert.match(askFlowEvidence.deterministicAnswer, /read objects: Account/i);
    assert.match(askFlowEvidence.deterministicAnswer, /write objects: Opportunity/i);
    assert.doesNotMatch(askFlowEvidence.deterministicAnswer, /no automation found for/i);
    assert.ok(
      (askFlowEvidence.citations ?? []).every((citation) =>
        /OpportunityStageSync\.flow-meta\.xml$/i.test(String(citation.sourcePath ?? ''))
      ),
      'retrieve-scoped flow ask should cite only the selected flow source path'
    );
    assert.equal(askFlowEvidence.decisionPacket?.kind, 'high_risk_change_review');
    assert.equal(askFlowEvidence.decisionPacket?.focus, 'breakage');
    assert.equal(askFlowEvidence.decisionPacket?.targetLabel, 'OpportunityStageSync');
    assert.equal(askFlowEvidence.decisionPacket?.targetType, 'flow');
    assert.ok(
      (askFlowEvidence.decisionPacket?.topRiskDrivers ?? []).some((item) =>
        /top citation sources:/i.test(item)
      )
    );
    assert.match(askFlowEvidence.decisionPacket?.changeImpact?.summary ?? '', /reads:/i);
    assert.match(askFlowEvidence.decisionPacket?.changeImpact?.summary ?? '', /writes:/i);
    assert.match(askFlowEvidence.decisionPacket?.changeImpact?.summary ?? '', /read objects:/i);
    assert.match(askFlowEvidence.decisionPacket?.changeImpact?.summary ?? '', /write objects:/i);
    assert.ok(
      (askFlowEvidence.decisionPacket?.nextActions ?? []).some((item) => item.label === 'Run permission check')
    );
    assert.ok(
      (askFlowEvidence.decisionPacket?.nextActions ?? []).some(
        (item) => item.label === 'Inspect citation sources'
      )
    );

    const askFlowEvidenceSpacedRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'Based only on the latest retrieve, explain what Flow Opportunity Stage Sync reads and writes.',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(askFlowEvidenceSpacedRes.status, 201, 'ask flow evidence (spaced name) should return 201');
    const askFlowEvidenceSpaced = (await askFlowEvidenceSpacedRes.json()) as {
      plan: { intent: string; entities: { object?: string } };
      deterministicAnswer: string;
    };
    assert.equal(askFlowEvidenceSpaced.plan.intent, 'automation');
    assert.equal(askFlowEvidenceSpaced.plan.entities.object, undefined);
    assert.match(askFlowEvidenceSpaced.deterministicAnswer, /retrieved flow evidence found/i);
    assert.doesNotMatch(askFlowEvidenceSpaced.deterministicAnswer, /no automation found for/i);

    const askFlowEvidenceTargetedRetryRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'Based only on the latest retrieve, explain what Flow Opportunity Stage Sync reads and writes with deterministic evidence citations.',
        maxCitations: 1,
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askFlowEvidenceTargetedRetryRes.status,
      201,
      'ask flow evidence targeted retry should return 201'
    );
    const askFlowEvidenceTargetedRetry = (await askFlowEvidenceTargetedRetryRes.json()) as {
      plan: { intent: string; entities: { object?: string } };
      deterministicAnswer: string;
      executionTrace?: string[];
    };
    assert.equal(askFlowEvidenceTargetedRetry.plan.intent, 'automation');
    assert.equal(askFlowEvidenceTargetedRetry.plan.entities.object, undefined);
    assert.match(askFlowEvidenceTargetedRetry.deterministicAnswer, /retrieved flow evidence found/i);
    assert.doesNotMatch(
      askFlowEvidenceTargetedRetry.deterministicAnswer,
      /no retrieved flow evidence matched/i
    );

    const askFlowEvidenceCivilRightsRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'Based only on the latest retrieve, explain what Flow Civil_Rights_Intake_Questionnaire reads and writes.',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askFlowEvidenceCivilRightsRes.status,
      201,
      'ask flow evidence (civil rights flow) should return 201'
    );
    const askFlowEvidenceCivilRights = (await askFlowEvidenceCivilRightsRes.json()) as {
      plan: { intent: string; entities: { object?: string } };
      deterministicAnswer: string;
      decisionPacket?: {
        targetType?: string;
        summary?: string;
        nextActions?: Array<{ label?: string }>;
      };
    };
    assert.equal(askFlowEvidenceCivilRights.plan.intent, 'automation');
    assert.equal(askFlowEvidenceCivilRights.plan.entities.object, undefined);
    assert.match(
      askFlowEvidenceCivilRights.deterministicAnswer,
      /no retrieved flow evidence matched Civil_Rights_Intake_Questionnaire/i
    );
    assert.doesNotMatch(askFlowEvidenceCivilRights.deterministicAnswer, /no automation found for the/i);
    assert.equal(askFlowEvidenceCivilRights.decisionPacket?.targetType, 'flow');
    assert.match(
      askFlowEvidenceCivilRights.decisionPacket?.summary ?? '',
      /not grounded by the current retrieve evidence/i
    );
    assert.ok(
      (askFlowEvidenceCivilRights.decisionPacket?.nextActions ?? []).some(
        (item) => item.label === 'Retrieve flow metadata'
      )
    );
    assert.ok(
      (askFlowEvidenceCivilRights.decisionPacket?.nextActions ?? []).some(
        (item) => item.label === 'Inspect citation sources'
      )
    );

    const askFlowEvidenceQuotedRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'Based only on the latest retrieve, explain what Flow "the Civil_Rights_Intake_Questionnaire" reads and writes.',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askFlowEvidenceQuotedRes.status,
      201,
      'ask flow evidence (quoted flow name) should return 201'
    );
    const askFlowEvidenceQuoted = (await askFlowEvidenceQuotedRes.json()) as {
      plan: { intent: string; entities: { object?: string } };
      deterministicAnswer: string;
    };
    assert.equal(askFlowEvidenceQuoted.plan.intent, 'automation');
    assert.equal(askFlowEvidenceQuoted.plan.entities.object, undefined);
    assert.doesNotMatch(askFlowEvidenceQuoted.deterministicAnswer, /no automation found for the/i);

    const askFlowEvidenceCalledRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'Based only on the latest retrieve, explain what Flow called Civil_Rights_Intake_Questionnaire reads and writes.',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askFlowEvidenceCalledRes.status,
      201,
      'ask flow evidence (called flow name) should return 201'
    );
    const askFlowEvidenceCalled = (await askFlowEvidenceCalledRes.json()) as {
      plan: { intent: string; entities: { object?: string } };
      deterministicAnswer: string;
      proof: { proofId: string; replayToken: string };
      decisionPacket?: { summary?: string; targetLabel?: string; targetType?: string };
    };
    assert.equal(askFlowEvidenceCalled.plan.intent, 'automation');
    assert.equal(askFlowEvidenceCalled.plan.entities.object, undefined);
    assert.doesNotMatch(askFlowEvidenceCalled.deterministicAnswer, /no automation found for the/i);
    assert.equal(typeof askFlowEvidenceCalled.proof.proofId, 'string');
    assert.equal(typeof askFlowEvidenceCalled.proof.replayToken, 'string');
    assert.equal(askFlowEvidenceCalled.decisionPacket?.targetLabel, 'Civil_Rights_Intake_Questionnaire');
    assert.equal(askFlowEvidenceCalled.decisionPacket?.targetType, 'flow');

    const askFlowEvidenceCalledRepeatRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'Based only on the latest retrieve, explain what Flow called Civil_Rights_Intake_Questionnaire reads and writes.',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askFlowEvidenceCalledRepeatRes.status,
      201,
      'repeated ask flow evidence (called flow name) should return 201'
    );
    const askFlowEvidenceCalledRepeat = (await askFlowEvidenceCalledRepeatRes.json()) as {
      deterministicAnswer: string;
      proof: { proofId: string; replayToken: string };
      decisionPacket?: { summary?: string; targetLabel?: string; targetType?: string };
    };
    assert.equal(
      askFlowEvidenceCalledRepeat.deterministicAnswer,
      askFlowEvidenceCalled.deterministicAnswer,
      'repeated flow grounding ask should preserve deterministic answer'
    );
    assert.equal(
      askFlowEvidenceCalledRepeat.proof.proofId,
      askFlowEvidenceCalled.proof.proofId,
      'repeated flow grounding ask should preserve proof id'
    );
    assert.equal(
      askFlowEvidenceCalledRepeat.proof.replayToken,
      askFlowEvidenceCalled.proof.replayToken,
      'repeated flow grounding ask should preserve replay token'
    );
    assert.equal(
      askFlowEvidenceCalledRepeat.decisionPacket?.summary,
      askFlowEvidenceCalled.decisionPacket?.summary,
      'repeated flow grounding ask should preserve packet summary'
    );
    assert.equal(
      askFlowEvidenceCalledRepeat.decisionPacket?.targetLabel,
      askFlowEvidenceCalled.decisionPacket?.targetLabel
    );
    assert.equal(
      askFlowEvidenceCalledRepeat.decisionPacket?.targetType,
      askFlowEvidenceCalled.decisionPacket?.targetType
    );

    const askFlowEvidenceCalledReplayRes = await fetch(`${base}/ask/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ replayToken: askFlowEvidenceCalled.proof.replayToken })
    });
    assert.equal(
      askFlowEvidenceCalledReplayRes.status,
      201,
      'flow grounding replay should return 201'
    );
    const askFlowEvidenceCalledReplay = (await askFlowEvidenceCalledReplayRes.json()) as {
      replayToken: string;
      proofId: string;
      matched: boolean;
      corePayloadMatched: boolean;
      replayed: { deterministicAnswer: string };
    };
    assert.equal(askFlowEvidenceCalledReplay.replayToken, askFlowEvidenceCalled.proof.replayToken);
    assert.equal(askFlowEvidenceCalledReplay.proofId, askFlowEvidenceCalled.proof.proofId);
    assert.equal(askFlowEvidenceCalledReplay.matched, true);
    assert.equal(askFlowEvidenceCalledReplay.corePayloadMatched, true);
    assert.equal(
      askFlowEvidenceCalledReplay.replayed.deterministicAnswer,
      askFlowEvidenceCalled.deterministicAnswer
    );

    const askFlowEvidencePathRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'Based only on the latest retrieve, explain what Flow C:/tmp/force-app/main/default/flows/Civil_Rights_Intake_Questionnaire.flow-meta.xml reads and writes.',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askFlowEvidencePathRes.status,
      201,
      'ask flow evidence (flow path with extension) should return 201'
    );
    const askFlowEvidencePath = (await askFlowEvidencePathRes.json()) as {
      plan: { intent: string; entities: { object?: string } };
      deterministicAnswer: string;
      decisionPacket?: { targetLabel?: string; targetType?: string };
    };
    assert.equal(askFlowEvidencePath.plan.intent, 'automation');
    assert.equal(askFlowEvidencePath.plan.entities.object, undefined);
    assert.doesNotMatch(askFlowEvidencePath.deterministicAnswer, /no automation found for the/i);
    assert.equal(askFlowEvidencePath.decisionPacket?.targetLabel, 'Civil_Rights_Intake_Questionnaire');
    assert.equal(askFlowEvidencePath.decisionPacket?.targetType, 'flow');

    const askFlowEvidenceUnresolvedRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Based only on the latest retrieve, explain what Flow reads and writes.',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askFlowEvidenceUnresolvedRes.status,
      201,
      'ask flow evidence (unresolved flow target) should return 201'
    );
    const askFlowEvidenceUnresolved = (await askFlowEvidenceUnresolvedRes.json()) as {
      plan: { intent: string; entities: { object?: string } };
      deterministicAnswer: string;
      decisionPacket?: {
        targetLabel?: string;
        targetType?: string;
        summary?: string;
        nextActions?: Array<{ label?: string }>;
      };
      rejectedBranches?: Array<{ reasonCode?: string }>;
    };
    assert.equal(askFlowEvidenceUnresolved.plan.intent, 'automation');
    assert.equal(askFlowEvidenceUnresolved.plan.entities.object, undefined);
    assert.match(
      askFlowEvidenceUnresolved.deterministicAnswer,
      /exact flow API name could not be resolved/i
    );
    assert.doesNotMatch(askFlowEvidenceUnresolved.deterministicAnswer, /no automation found for/i);
    assert.equal(askFlowEvidenceUnresolved.decisionPacket?.targetType, 'flow');
    assert.equal(askFlowEvidenceUnresolved.decisionPacket?.targetLabel, 'flow-name-unresolved');
    assert.match(
      askFlowEvidenceUnresolved.decisionPacket?.summary ?? '',
      /Flow target could not be resolved from the query/i
    );
    assert.ok(
      (askFlowEvidenceUnresolved.decisionPacket?.nextActions ?? []).some(
        (item) => item.label === 'Specify exact flow API name'
      )
    );

    const askLatestRetrieveMissingScopeRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'Based only on the latest retrieve, explain what Flow OpportunityStageSync reads and writes.'
      })
    });
    assert.equal(
      askLatestRetrieveMissingScopeRes.status,
      201,
      'latest retrieve flow ask without scope should fail closed with 201'
    );
    const askLatestRetrieveMissingScope = (await askLatestRetrieveMissingScopeRes.json()) as {
      trustLevel: string;
      deterministicAnswer: string;
      refusalReasons?: string[];
    };
    assert.equal(askLatestRetrieveMissingScope.trustLevel, 'refused');
    assert.match(
      askLatestRetrieveMissingScope.deterministicAnswer,
      /no retrieve handoff scope was supplied/i
    );
    assert.ok(
      (askLatestRetrieveMissingScope.refusalReasons ?? []).some((reason) =>
        /grounding_score/i.test(reason)
      )
    );

    const askLatestRetrieveUnsupportedRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Based only on the latest retrieve, who can edit Opportunity.StageName?',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askLatestRetrieveUnsupportedRes.status,
      201,
      'latest retrieve unsupported ask should fail closed with 201'
    );
    const askLatestRetrieveUnsupported = (await askLatestRetrieveUnsupportedRes.json()) as {
      trustLevel: string;
      deterministicAnswer: string;
      refusalReasons?: string[];
      proof?: {
        rejectedBranches?: Array<{
          branch: string;
          reasonCode: string;
          reason: string;
        }>;
      };
      plan?: {
        intent?: string;
        semanticFrame?: {
          intent: string;
          sourceMode: string;
          target?: { selected?: string; kind?: string };
          admissibility: { status: string; reason: string | null };
        };
      };
    };
    assert.equal(askLatestRetrieveUnsupported.plan?.intent, 'perms');
    assert.equal(
      askLatestRetrieveUnsupported.plan?.semanticFrame?.intent,
      'permission_path_explanation'
    );
    assert.equal(
      askLatestRetrieveUnsupported.plan?.semanticFrame?.sourceMode,
      'latest_retrieve'
    );
    assert.equal(
      askLatestRetrieveUnsupported.plan?.semanticFrame?.target?.selected,
      'Opportunity.StageName'
    );
    assert.equal(
      askLatestRetrieveUnsupported.plan?.semanticFrame?.admissibility.status,
      'blocked'
    );
    assert.equal(
      askLatestRetrieveUnsupported.plan?.semanticFrame?.admissibility.reason,
      'evidence_scope_unsupported'
    );
    assert.equal(askLatestRetrieveUnsupported.trustLevel, 'refused');
    assert.match(
      askLatestRetrieveUnsupported.deterministicAnswer,
      /latest-retrieve-only permission Ask is not supported/i
    );
    assert.ok(
      (askLatestRetrieveUnsupported.proof?.rejectedBranches ?? []).some(
        (branch) =>
          branch.reasonCode === 'SEMANTIC_FRAME_BLOCKED' &&
          /permission semantic frame blocked execution: evidence_scope_unsupported/i.test(
            branch.reason
          )
      )
    );
    assert.ok(
      (askLatestRetrieveUnsupported.proof?.rejectedBranches ?? []).some(
        (branch) => branch.reasonCode === 'SEMANTIC_FRAME_BLOCKED'
      )
    );

    const askLatestRetrieveImpactRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Based only on the latest retrieve, what touches Opportunity.StageName?',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askLatestRetrieveImpactRes.status,
      201,
      'latest retrieve impact ask should return 201'
    );
    const askLatestRetrieveImpact = (await askLatestRetrieveImpactRes.json()) as {
      trustLevel: string;
      plan: {
        intent: string;
        semanticFrame?: {
          intent: string;
          sourceMode: string;
          target?: { selected?: string; kind?: string };
          admissibility: { status: string; reason: string | null };
        };
      };
      deterministicAnswer: string;
      consistency: { aligned: boolean; reason: string };
    };
    assert.equal(askLatestRetrieveImpact.plan.intent, 'impact');
    assert.equal(askLatestRetrieveImpact.plan.semanticFrame?.intent, 'impact_analysis');
    assert.equal(askLatestRetrieveImpact.plan.semanticFrame?.sourceMode, 'latest_retrieve');
    assert.equal(
      askLatestRetrieveImpact.plan.semanticFrame?.target?.selected,
      'Opportunity.StageName'
    );
    assert.equal(askLatestRetrieveImpact.plan.semanticFrame?.admissibility.status, 'accepted');
    assert.notEqual(askLatestRetrieveImpact.trustLevel, 'refused');
    assert.match(
      askLatestRetrieveImpact.deterministicAnswer,
      /latest-retrieve evidence found for Opportunity\.StageName/i
    );
    assert.match(
      askLatestRetrieveImpact.deterministicAnswer,
      /current retrieve scope, not full graph analysis/i
    );
    assert.equal(askLatestRetrieveImpact.consistency.aligned, true);

    const askLatestRetrieveAutomationRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Based only on the latest retrieve, what automations update Opportunity.StageName?',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askLatestRetrieveAutomationRes.status,
      201,
      'latest retrieve automation ask should return 201'
    );
    const askLatestRetrieveAutomation = (await askLatestRetrieveAutomationRes.json()) as {
      trustLevel: string;
      plan: {
        intent: string;
        semanticFrame?: {
          intent: string;
          sourceMode: string;
          target?: { selected?: string; kind?: string };
          admissibility: { status: string; reason: string | null };
        };
      };
      deterministicAnswer: string;
      consistency: { aligned: boolean; reason: string };
    };
    assert.equal(askLatestRetrieveAutomation.plan.intent, 'automation');
    assert.equal(askLatestRetrieveAutomation.plan.semanticFrame?.intent, 'automation_path_explanation');
    assert.equal(askLatestRetrieveAutomation.plan.semanticFrame?.sourceMode, 'latest_retrieve');
    assert.equal(askLatestRetrieveAutomation.plan.semanticFrame?.target?.kind, 'field');
    assert.equal(
      askLatestRetrieveAutomation.plan.semanticFrame?.target?.selected,
      'Opportunity.StageName'
    );
    assert.equal(askLatestRetrieveAutomation.plan.semanticFrame?.admissibility.status, 'accepted');
    assert.notEqual(askLatestRetrieveAutomation.trustLevel, 'refused');
    assert.match(
      askLatestRetrieveAutomation.deterministicAnswer,
      /latest-retrieve evidence found for Opportunity\.StageName/i
    );
    assert.match(
      askLatestRetrieveAutomation.deterministicAnswer,
      /top automation sources:/i
    );
    assert.equal(askLatestRetrieveAutomation.consistency.aligned, true);

    const askLatestRetrieveObjectAutomationRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Based only on the latest retrieve, what runs on object Opportunity?',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askLatestRetrieveObjectAutomationRes.status,
      201,
      'latest retrieve object automation ask should return 201'
    );
    const askLatestRetrieveObjectAutomation =
      (await askLatestRetrieveObjectAutomationRes.json()) as {
        trustLevel: string;
        plan: {
          intent: string;
          semanticFrame?: {
            intent: string;
            sourceMode: string;
            target?: { selected?: string; kind?: string };
            admissibility: { status: string; reason: string | null };
          };
        };
        deterministicAnswer: string;
      };
    assert.equal(askLatestRetrieveObjectAutomation.plan.intent, 'automation');
    assert.equal(
      askLatestRetrieveObjectAutomation.plan.semanticFrame?.intent,
      'automation_path_explanation'
    );
    assert.equal(askLatestRetrieveObjectAutomation.plan.semanticFrame?.sourceMode, 'latest_retrieve');
    assert.equal(askLatestRetrieveObjectAutomation.plan.semanticFrame?.target?.kind, 'object');
    assert.equal(
      askLatestRetrieveObjectAutomation.plan.semanticFrame?.target?.selected,
      'Opportunity'
    );
    assert.equal(
      askLatestRetrieveObjectAutomation.plan.semanticFrame?.admissibility.status,
      'accepted'
    );
    assert.notEqual(askLatestRetrieveObjectAutomation.trustLevel, 'refused');
    assert.match(
      askLatestRetrieveObjectAutomation.deterministicAnswer,
      /latest-retrieve evidence found for Opportunity/i
    );

    const askImpactRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'What touches Opportunity.StageName?' })
    });
    assert.equal(askImpactRes.status, 201, 'ask impact should return 201');
    const askImpact = (await askImpactRes.json()) as {
      plan: {
        intent: string;
        semanticFrame?: {
          intent: string;
          sourceMode: string;
          target?: { selected?: string; kind?: string };
          admissibility: { status: string; reason: string | null };
        };
      };
      consistency: { checked: boolean; aligned: boolean; reason: string };
    };
    assert.equal(askImpact.plan.intent, 'impact');
    assert.equal(askImpact.plan.semanticFrame?.intent, 'impact_analysis');
    assert.equal(askImpact.plan.semanticFrame?.sourceMode, 'graph_global');
    assert.equal(askImpact.plan.semanticFrame?.target?.kind, 'field');
    assert.equal(askImpact.plan.semanticFrame?.target?.selected, 'Opportunity.StageName');
    assert.equal(askImpact.plan.semanticFrame?.admissibility.status, 'accepted');
    assert.equal(askImpact.consistency.checked, true);
    assert.equal(askImpact.consistency.aligned, true);

    const askBlockedImpactRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'What touches this?' })
    });
    assert.equal(askBlockedImpactRes.status, 201, 'blocked impact ask should return 201');
    const askBlockedImpact = (await askBlockedImpactRes.json()) as {
      trustLevel: string;
      deterministicAnswer: string;
      refusalReasons?: string[];
      plan: {
        intent: string;
        semanticFrame?: {
          admissibility: { status: string; reason: string | null };
        };
      };
      proof: { rejectedBranches: Array<{ reasonCode: string }> };
    };
    assert.equal(askBlockedImpact.plan.intent, 'impact');
    assert.equal(askBlockedImpact.plan.semanticFrame?.admissibility.status, 'blocked');
    assert.equal(askBlockedImpact.plan.semanticFrame?.admissibility.reason, 'no_grounded_target');
    assert.equal(askBlockedImpact.trustLevel, 'refused');
    assert.match(
      askBlockedImpact.deterministicAnswer,
      /could not ground a deterministic target from the query/i
    );
    assert.ok(
      askBlockedImpact.proof.rejectedBranches.some(
        (branch) => branch.reasonCode === 'SEMANTIC_FRAME_BLOCKED'
      )
    );

    const askUnsupportedImpactRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'What changes if object Opportunity is updated?' })
    });
    assert.equal(askUnsupportedImpactRes.status, 201, 'unsupported object impact ask should return 201');
    const askUnsupportedImpact = (await askUnsupportedImpactRes.json()) as {
      trustLevel: string;
      deterministicAnswer: string;
      plan: {
        intent: string;
        semanticFrame?: {
          admissibility: { status: string; reason: string | null };
          target?: { kind?: string; selected?: string };
        };
      };
      proof: { rejectedBranches: Array<{ reasonCode: string }> };
    };
    assert.equal(askUnsupportedImpact.plan.intent, 'impact');
    assert.equal(askUnsupportedImpact.plan.semanticFrame?.target?.kind, 'object');
    assert.equal(
      askUnsupportedImpact.plan.semanticFrame?.admissibility.reason,
      'unsupported_target_kind'
    );
    assert.equal(askUnsupportedImpact.trustLevel, 'refused');
    assert.match(
      askUnsupportedImpact.deterministicAnswer,
      /supports grounded field targets only/i
    );
    assert.ok(
      askUnsupportedImpact.proof.rejectedBranches.some(
        (branch) => branch.reasonCode === 'SEMANTIC_FRAME_BLOCKED'
      )
    );

    const askMixedRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'What is the release risk impact on Opportunity.StageName and can jane@example.com edit object Case?'
      })
    });
    assert.equal(askMixedRes.status, 201, 'ask mixed should return 201');
    const askMixed = (await askMixedRes.json()) as {
      plan: { intent: string };
      answer: string;
      trustLevel: string;
    };
    assert.equal(askMixed.plan.intent, 'mixed');
    assert.match(askMixed.answer, /Release-risk \+ permission-impact:/);
    assert.ok(['trusted', 'conditional'].includes(askMixed.trustLevel));

    const askReviewRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Should we approve changing Opportunity.StageName for jane@example.com?'
      })
    });
    assert.equal(askReviewRes.status, 201, 'ask review should return 201');
    const askReview = (await askReviewRes.json()) as {
      plan: {
        intent: string;
        reviewWorkflow?: {
          kind: string;
          compilerRuleId: string;
          action: string;
          focus: string;
          targetLabel: string;
        };
        semanticFrame?: {
          intent: string;
          sourceMode: string;
          target?: { kind?: string; selected?: string };
          admissibility: { status: string; reason: string | null };
        };
      };
      trustLevel: string;
      proof: { proofId: string; replayToken: string };
      decisionPacket?: {
        kind: string;
        focus: string;
        targetLabel: string;
        riskScore: number;
        riskLevel: string;
        summary: string;
        evidenceCoverage: {
          citationCount: number;
          hasPermissionPaths: boolean;
          hasAutomationCoverage: boolean;
          hasImpactPaths: boolean;
        };
        topRiskDrivers: string[];
        permissionImpact: { user: string; summary: string; pathCount: number };
        automationImpact: { summary: string; automationCount: number; topAutomationNames: string[] };
        changeImpact: { summary: string; impactPathCount: number; topImpactedSources: string[] };
        nextActions: Array<{ label: string; rationale: string }>;
      };
    };
    assert.equal(askReview.plan.intent, 'review');
    assert.equal(askReview.plan.reviewWorkflow?.kind, 'high_risk_change_review');
    assert.equal(askReview.plan.reviewWorkflow?.compilerRuleId, 'review_approval_change');
    assert.equal(askReview.plan.reviewWorkflow?.action, 'change');
    assert.equal(askReview.plan.reviewWorkflow?.focus, 'approval');
    assert.equal(askReview.plan.reviewWorkflow?.targetLabel, 'Opportunity.StageName');
    assert.equal(askReview.plan.semanticFrame?.intent, 'approval_decision');
    assert.equal(askReview.plan.semanticFrame?.sourceMode, 'graph_global');
    assert.equal(askReview.plan.semanticFrame?.target?.kind, 'field');
    assert.equal(askReview.plan.semanticFrame?.target?.selected, 'Opportunity.StageName');
    assert.equal(askReview.plan.semanticFrame?.admissibility.status, 'accepted');
    assert.ok(['trusted', 'conditional'].includes(askReview.trustLevel));
    assert.equal(askReview.decisionPacket?.kind, 'high_risk_change_review');
    assert.equal(askReview.decisionPacket?.focus, 'approval');
    assert.equal(askReview.decisionPacket?.targetLabel, 'Opportunity.StageName');
    assert.equal(typeof askReview.decisionPacket?.riskScore, 'number');
    assert.ok(['low', 'medium', 'high'].includes(String(askReview.decisionPacket?.riskLevel)));
    assert.match(String(askReview.decisionPacket?.summary ?? ''), /High-risk change review/i);
    assert.equal(typeof askReview.decisionPacket?.evidenceCoverage.citationCount, 'number');
    assert.equal(typeof askReview.decisionPacket?.evidenceCoverage.hasPermissionPaths, 'boolean');
    assert.equal(typeof askReview.decisionPacket?.evidenceCoverage.hasAutomationCoverage, 'boolean');
    assert.equal(typeof askReview.decisionPacket?.evidenceCoverage.hasImpactPaths, 'boolean');
    assert.ok((askReview.decisionPacket?.topRiskDrivers.length ?? 0) >= 3);
    assert.equal(askReview.decisionPacket?.permissionImpact.user, 'jane@example.com');
    assert.equal(typeof askReview.decisionPacket?.permissionImpact.pathCount, 'number');
    assert.equal(typeof askReview.decisionPacket?.automationImpact.automationCount, 'number');
    assert.equal(typeof askReview.decisionPacket?.changeImpact.impactPathCount, 'number');
    assert.ok((askReview.decisionPacket?.nextActions.length ?? 0) >= 3);
    assert.ok((askReview.decisionPacket?.automationImpact.topAutomationNames.length ?? 0) >= 1);
    assert.ok((askReview.decisionPacket?.changeImpact.topImpactedSources.length ?? 0) >= 1);
    const topAutomationName = askReview.decisionPacket?.automationImpact.topAutomationNames[0];
    const topImpactSource = askReview.decisionPacket?.changeImpact.topImpactedSources[0];
    assert.ok(
      askReview.decisionPacket?.topRiskDrivers.some((driver) => driver.toLowerCase().includes('top automation')),
      'review packet should include top automation spotlight in risk drivers'
    );
    assert.ok(
      askReview.decisionPacket?.topRiskDrivers.some((driver) => driver.toLowerCase().includes('top impact source')),
      'review packet should include top impact spotlight in risk drivers'
    );
    assert.ok(
      askReview.decisionPacket?.topRiskDrivers.some((driver) => driver.toLowerCase().includes('top citation source')),
      'review packet should include top citation source spotlight in risk drivers'
    );
    if (topAutomationName) {
      assert.ok(
        askReview.decisionPacket?.topRiskDrivers.some((driver) => driver.includes(topAutomationName)),
        'review packet should include specific top automation names'
      );
    }
    if (topImpactSource) {
      assert.ok(
        askReview.decisionPacket?.topRiskDrivers.some((driver) => driver.includes(topImpactSource)),
        'review packet should include specific top impact sources'
      );
    }
    const reviewAutomationAction = askReview.decisionPacket?.nextActions.find(
      (action) => action.label === 'Inspect impacted automation'
    );
    assert.ok(reviewAutomationAction, 'review packet should include automation action');
    if (topAutomationName) {
      assert.ok(
        reviewAutomationAction?.rationale.includes(topAutomationName),
        'automation action rationale should reference top automation names'
      );
    }
    const reviewImpactAction = askReview.decisionPacket?.nextActions.find(
      (action) => action.label === 'Inspect impact paths'
    );
    assert.ok(reviewImpactAction, 'review packet should include impact action');
    if (topImpactSource) {
      assert.ok(
        reviewImpactAction?.rationale.includes(topImpactSource),
        'impact action rationale should reference top impacted sources'
      );
    }
    const reviewCitationAction = askReview.decisionPacket?.nextActions.find(
      (action) => action.label === 'Inspect citation sources'
    );
    assert.ok(reviewCitationAction, 'review packet should include citation-source action');
    assert.match(
      reviewCitationAction?.rationale ?? '',
      /validate decision grounding/i,
      'citation-source action should explain grounding validation intent'
    );

    const askReviewRepeatRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Should we approve changing Opportunity.StageName for jane@example.com?'
      })
    });
    assert.equal(askReviewRepeatRes.status, 201, 'repeated ask review should return 201');
    const askReviewRepeat = (await askReviewRepeatRes.json()) as {
      proof: { proofId: string; replayToken: string };
      decisionPacket?: {
        riskScore: number;
        summary: string;
        riskLevel: string;
        topRiskDrivers: string[];
      };
    };
    assert.equal(askReviewRepeat.proof.proofId, askReview.proof.proofId);
    assert.equal(askReviewRepeat.proof.replayToken, askReview.proof.replayToken);
    assert.equal(askReviewRepeat.decisionPacket?.riskScore, askReview.decisionPacket?.riskScore);
    assert.equal(askReviewRepeat.decisionPacket?.summary, askReview.decisionPacket?.summary);
    assert.equal(askReviewRepeat.decisionPacket?.riskLevel, askReview.decisionPacket?.riskLevel);
    assert.deepEqual(
      askReviewRepeat.decisionPacket?.topRiskDrivers,
      askReview.decisionPacket?.topRiskDrivers
    );

    const askReviewVariantRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Approve the Opportunity.StageName change for jane@example.com.'
      })
    });
    assert.equal(askReviewVariantRes.status, 201, 'ask review variant should return 201');
    const askReviewVariant = (await askReviewVariantRes.json()) as {
      plan: {
        intent: string;
        reviewWorkflow?: { compilerRuleId: string; focus: string; targetLabel: string };
      };
      decisionPacket?: {
        focus: string;
        targetLabel: string;
        riskScore: number;
        summary: string;
        topRiskDrivers: string[];
      };
    };
    assert.equal(askReviewVariant.plan.intent, 'review');
    assert.equal(askReviewVariant.plan.reviewWorkflow?.compilerRuleId, 'review_approval_change');
    assert.equal(askReviewVariant.plan.reviewWorkflow?.focus, 'approval');
    assert.equal(askReviewVariant.plan.reviewWorkflow?.targetLabel, 'Opportunity.StageName');
    assert.equal(askReviewVariant.decisionPacket?.focus, askReview.decisionPacket?.focus);
    assert.equal(askReviewVariant.decisionPacket?.targetLabel, askReview.decisionPacket?.targetLabel);

    const askLatestRetrieveReviewUnsupportedRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'Based only on the latest retrieve, should we approve changing Opportunity.StageName for jane@example.com?',
        evidenceScope: latestRetrieveEvidenceScope
      })
    });
    assert.equal(
      askLatestRetrieveReviewUnsupportedRes.status,
      201,
      'latest retrieve review ask should fail closed with 201'
    );
    const askLatestRetrieveReviewUnsupported = (await askLatestRetrieveReviewUnsupportedRes.json()) as {
      trustLevel: string;
      deterministicAnswer: string;
      plan?: {
        intent?: string;
        semanticFrame?: {
          intent: string;
          sourceMode: string;
          target?: { selected?: string; kind?: string };
          admissibility: { status: string; reason: string | null };
        };
      };
      proof?: {
        rejectedBranches?: Array<{ reasonCode?: string; reason?: string }>;
      };
    };
    assert.equal(askLatestRetrieveReviewUnsupported.plan?.intent, 'review');
    assert.equal(askLatestRetrieveReviewUnsupported.plan?.semanticFrame?.intent, 'approval_decision');
    assert.equal(askLatestRetrieveReviewUnsupported.plan?.semanticFrame?.sourceMode, 'latest_retrieve');
    assert.equal(
      askLatestRetrieveReviewUnsupported.plan?.semanticFrame?.target?.selected,
      'Opportunity.StageName'
    );
    assert.equal(
      askLatestRetrieveReviewUnsupported.plan?.semanticFrame?.admissibility.status,
      'blocked'
    );
    assert.equal(
      askLatestRetrieveReviewUnsupported.plan?.semanticFrame?.admissibility.reason,
      'evidence_scope_unsupported'
    );
    assert.equal(askLatestRetrieveReviewUnsupported.trustLevel, 'refused');
    assert.match(
      askLatestRetrieveReviewUnsupported.deterministicAnswer,
      /latest-retrieve-only approval review ask is not supported/i
    );
    assert.ok(
      askLatestRetrieveReviewUnsupported.proof?.rejectedBranches?.some(
        (branch) =>
          branch.reasonCode === 'SEMANTIC_FRAME_BLOCKED' &&
          /evidence_scope_unsupported/i.test(branch.reason ?? '')
      ),
      'latest-retrieve review approval ask should record a semantic-frame blocked branch'
    );
    assert.equal(askReviewVariant.decisionPacket?.riskScore, askReview.decisionPacket?.riskScore);
    assert.equal(askReviewVariant.decisionPacket?.summary, askReview.decisionPacket?.summary);
    assert.deepEqual(
      askReviewVariant.decisionPacket?.topRiskDrivers,
      askReview.decisionPacket?.topRiskDrivers
    );

    const askReviewReplayRes = await fetch(`${base}/ask/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ replayToken: askReview.proof.replayToken })
    });
    assert.equal(askReviewReplayRes.status, 201, 'ask review replay should return 201');
    const askReviewReplay = (await askReviewReplayRes.json()) as {
      matched: boolean;
      corePayloadMatched: boolean;
      replayToken: string;
      proofId: string;
    };
    assert.equal(askReviewReplay.matched, true);
    assert.equal(askReviewReplay.corePayloadMatched, true);
    assert.equal(askReviewReplay.replayToken, askReview.proof.replayToken);
    assert.equal(askReviewReplay.proofId, askReview.proof.proofId);

    const askComponentUsageRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Where is Layout Opportunity-Opportunity Layout used?'
      })
    });
    assert.equal(askComponentUsageRes.status, 201, 'component usage ask should return 201');
    const askComponentUsage = (await askComponentUsageRes.json()) as {
      plan?: {
        intent?: string;
        semanticFrame?: {
          intent?: string;
          target?: { kind?: string; selected?: string };
          admissibility?: { status?: string; reason?: string | null };
        };
      };
      deterministicAnswer: string;
    };
    assert.equal(askComponentUsage.plan?.intent, 'unknown');
    assert.equal(askComponentUsage.plan?.semanticFrame?.intent, 'evidence_lookup');
    assert.equal(askComponentUsage.plan?.semanticFrame?.target?.kind, 'metadata_component');
    assert.equal(
      askComponentUsage.plan?.semanticFrame?.target?.selected,
      'Layout Opportunity-Opportunity Layout'
    );
    assert.equal(askComponentUsage.plan?.semanticFrame?.admissibility?.status, 'accepted');
    assert.match(
      askComponentUsage.deterministicAnswer,
      /component usage lookup for Layout Opportunity-Opportunity Layout/i
    );

    const askFlowComponentUsageRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Where is Flow Civil_Rights_Intake_Questionnaire used?'
      })
    });
    assert.equal(
      askFlowComponentUsageRes.status,
      201,
      'family-qualified flow usage ask should return 201'
    );
    const askFlowComponentUsage = (await askFlowComponentUsageRes.json()) as {
      plan?: {
        semanticFrame?: {
          intent?: string;
          target?: { kind?: string; selected?: string };
        };
      };
      trustLevel: string;
      deterministicAnswer: string;
    };
    assert.equal(askFlowComponentUsage.plan?.semanticFrame?.intent, 'evidence_lookup');
    assert.equal(askFlowComponentUsage.plan?.semanticFrame?.target?.kind, 'metadata_component');
    assert.equal(
      askFlowComponentUsage.plan?.semanticFrame?.target?.selected,
      'Flow Civil_Rights_Intake_Questionnaire'
    );
    assert.match(
      askFlowComponentUsage.deterministicAnswer,
      /component usage lookup for Flow Civil_Rights_Intake_Questionnaire/i
    );
    assert.notEqual(
      askFlowComponentUsage.trustLevel,
      'refused',
      'family-qualified flow usage ask should route through evidence lookup, not fail closed as another family'
    );

    const askComponentUsageRecordIdRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Where is 00X000000000123AAA used?'
      })
    });
    assert.equal(askComponentUsageRecordIdRes.status, 201, 'record-id usage ask should return 201');
    const askComponentUsageRecordId = (await askComponentUsageRecordIdRes.json()) as {
      trustLevel: string;
      deterministicAnswer: string;
      plan?: {
        semanticFrame?: {
          intent?: string;
          admissibility?: { status?: string; reason?: string | null };
        };
      };
      proof?: {
        rejectedBranches?: Array<{ reasonCode?: string; reason?: string }>;
      };
    };
    assert.equal(askComponentUsageRecordId.plan?.semanticFrame?.intent, 'evidence_lookup');
    assert.equal(
      askComponentUsageRecordId.plan?.semanticFrame?.admissibility?.reason,
      'record_id_unsupported'
    );
    assert.equal(askComponentUsageRecordId.trustLevel, 'refused');
    assert.match(
      askComponentUsageRecordId.deterministicAnswer,
      /supports metadata names and fullNames, not Salesforce record Ids/i
    );
    assert.ok(
      askComponentUsageRecordId.proof?.rejectedBranches?.some(
        (branch) =>
          branch.reasonCode === 'SEMANTIC_FRAME_BLOCKED' &&
          /record_id_unsupported/i.test(branch.reason ?? '')
      ),
      'record-id usage ask should record a semantic-frame blocked branch'
    );

    const architectureDecisionRes = await fetch(`${base}/ask/architecture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user: 'jane@example.com',
        object: 'Opportunity',
        field: 'Opportunity.StageName'
      })
    });
    assert.equal(architectureDecisionRes.status, 201, 'ask architecture decision should return 201');
    const architectureDecision = (await architectureDecisionRes.json()) as {
      status: string;
      engines: {
        permissionBlastRadius: { blastRadiusScore: number; proofPaths: unknown[] };
        automationCollision: { collisionScore: number; topCollisions: unknown[] };
        releaseRisk: { level: string; riskScore: number; semanticDiff: { addedNodeCount: number } };
      };
      composite: { trustLevel: string; replayToken: string; topRiskDrivers: string[]; snapshotId: string };
    };
    assert.equal(architectureDecision.status, 'implemented');
    assert.equal(typeof architectureDecision.engines.permissionBlastRadius.blastRadiusScore, 'number');
    assert.ok(Array.isArray(architectureDecision.engines.permissionBlastRadius.proofPaths));
    assert.equal(typeof architectureDecision.engines.automationCollision.collisionScore, 'number');
    assert.ok(Array.isArray(architectureDecision.engines.automationCollision.topCollisions));
    assert.ok(
      ['low', 'medium', 'high'].includes(architectureDecision.engines.releaseRisk.level),
      'release risk level should be low/medium/high'
    );
    assert.equal(typeof architectureDecision.engines.releaseRisk.riskScore, 'number');
    assert.equal(
      typeof architectureDecision.engines.releaseRisk.semanticDiff.addedNodeCount,
      'number'
    );
    assert.ok(['trusted', 'conditional', 'refused'].includes(architectureDecision.composite.trustLevel));
    assert.equal(typeof architectureDecision.composite.replayToken, 'string');
    assert.ok(architectureDecision.composite.topRiskDrivers.length >= 1);
    assert.equal(typeof architectureDecision.composite.snapshotId, 'string');

    const architectureDecisionBadRes = await fetch(`${base}/ask/architecture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user: 'bad-email', object: 'Opportunity', field: 'Opportunity.StageName' })
    });
    assert.equal(architectureDecisionBadRes.status, 400, 'ask architecture should validate user');

    const askSimulateRes = await fetch(`${base}/ask/simulate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user: 'jane@example.com',
        object: 'Opportunity',
        field: 'Opportunity.StageName',
        profile: 'strict',
        proposedChanges: [
          {
            action: 'modify_field',
            object: 'Opportunity',
            field: 'Opportunity.StageName',
            description: 'tighten stage transition guardrails'
          }
        ]
      })
    });
    assert.equal(askSimulateRes.status, 201, 'ask simulate should return 201');
    const askSimulate = (await askSimulateRes.json()) as {
      status: string;
      profile: string;
      requestedChangeCount: number;
      scores: { permissionImpact: number; releaseRisk: number; compositeRisk: number; rollbackConfidence: number };
      recommendation: { level: string; mitigations: string[] };
    };
    assert.equal(askSimulate.status, 'implemented');
    assert.equal(askSimulate.profile, 'strict');
    assert.equal(askSimulate.requestedChangeCount, 1);
    assert.ok(['proceed', 'review', 'block'].includes(askSimulate.recommendation.level));
    assert.ok(Array.isArray(askSimulate.recommendation.mitigations));
    assert.equal(typeof askSimulate.scores.compositeRisk, 'number');
    assert.equal(typeof askSimulate.scores.rollbackConfidence, 'number');

    const askSimulateCompareRes = await fetch(`${base}/ask/simulate/compare`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scenarioA: {
          user: 'jane@example.com',
          object: 'Opportunity',
          field: 'Opportunity.StageName',
          profile: 'strict',
          proposedChanges: [{ action: 'modify_field', object: 'Opportunity', field: 'Opportunity.StageName' }]
        },
        scenarioB: {
          user: 'jane@example.com',
          object: 'Opportunity',
          field: 'Opportunity.StageName',
          profile: 'exploratory',
          proposedChanges: [
            { action: 'modify_field', object: 'Opportunity', field: 'Opportunity.StageName' },
            { action: 'add_automation', object: 'Opportunity', description: 'new stage enrichment flow' }
          ]
        }
      })
    });
    assert.equal(askSimulateCompareRes.status, 201, 'ask simulation compare should return 201');
    const askSimulateCompare = (await askSimulateCompareRes.json()) as {
      status: string;
      recommendedScenario: string;
      scenarioA: { profile: string };
      scenarioB: { profile: string };
    };
    assert.equal(askSimulateCompare.status, 'implemented');
    assert.ok(['A', 'B', 'tie'].includes(askSimulateCompare.recommendedScenario));
    assert.equal(askSimulateCompare.scenarioA.profile, 'strict');
    assert.equal(askSimulateCompare.scenarioB.profile, 'exploratory');

    const askUnknownRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello world' })
    });
    assert.equal(askUnknownRes.status, 201, 'ask unknown should return 201');
    const askUnknown = (await askUnknownRes.json()) as {
      plan: { intent: string };
      answer: string;
      trustLevel: string;
      proof: { proofId: string; replayToken: string };
    };
    assert.equal(askUnknown.plan.intent, 'unknown');
    assert.equal(askUnknown.trustLevel, 'refused');
    assert.match(askUnknown.answer, /Refused:/i);

    const askLlmAssistRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'What touches Opportunity.StageName?',
        mode: 'llm_assist',
        llm: { provider: 'none' }
      })
    });
    assert.equal(askLlmAssistRes.status, 201, 'ask llm assist should still return deterministic fallback');
    const askLlmAssist = (await askLlmAssistRes.json()) as {
      mode: string;
      llm: { used: boolean; fallbackReason?: string };
    };
    assert.equal(askLlmAssist.mode, 'deterministic');
    assert.equal(askLlmAssist.llm.used, false);
    assert.match(String(askLlmAssist.llm.fallbackReason ?? ''), /provider is none|disabled/i);

    const askLlmLowEvidenceRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'hello world',
        mode: 'llm_assist',
        llm: { provider: 'anthropic' }
      })
    });
    assert.equal(
      askLlmLowEvidenceRes.status,
      201,
      'ask llm low-evidence should return deterministic fallback'
    );
    const askLlmLowEvidence = (await askLlmLowEvidenceRes.json()) as {
      mode: string;
      llm: { used: boolean; fallbackReason?: string };
    };
    assert.equal(askLlmLowEvidence.mode, 'deterministic');
    assert.equal(askLlmLowEvidence.llm.used, false);
    assert.match(String(askLlmLowEvidence.llm.fallbackReason ?? ''), /insufficient evidence/i);

    const askLlmAnthropicRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'What touches Opportunity.StageName?',
        mode: 'llm_assist',
        llm: { provider: 'anthropic' }
      })
    });
    assert.equal(askLlmAnthropicRes.status, 201, 'ask llm anthropic should return 201');
    const askLlmAnthropic = (await askLlmAnthropicRes.json()) as {
      mode: string;
      answer: string;
      deterministicAnswer: string;
      plan: { intent: string };
      llm: {
        used: boolean;
        provider: string;
        model?: string;
        tokenUsage?: { total: number };
        estimatedCostUsd?: number;
      };
    };
    assert.equal(askLlmAnthropic.mode, 'llm_assist');
    assert.equal(askLlmAnthropic.llm.used, true);
    assert.equal(askLlmAnthropic.llm.provider, 'anthropic');
    assert.match(askLlmAnthropic.answer, /Mocked Anthropic answer/);
    assert.ok((askLlmAnthropic.llm.tokenUsage?.total ?? 0) > 0);
    assert.ok((askLlmAnthropic.llm.estimatedCostUsd ?? 0) > 0);

    const askLlmOpenAiRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'What touches Opportunity.StageName?',
        mode: 'llm_assist',
        llm: { provider: 'openai' }
      })
    });
    assert.equal(askLlmOpenAiRes.status, 201, 'ask llm openai should return 201');
    const askLlmOpenAi = (await askLlmOpenAiRes.json()) as {
      mode: string;
      answer: string;
      deterministicAnswer: string;
      plan: { intent: string };
      proof: { proofId: string; replayToken: string };
      llm: {
        used: boolean;
        provider: string;
        model?: string;
        tokenUsage?: { total: number };
        estimatedCostUsd?: number;
      };
    };
    assert.equal(askLlmOpenAi.mode, 'llm_assist');
    assert.equal(askLlmOpenAi.llm.used, true);
    assert.equal(askLlmOpenAi.llm.provider, 'openai');
    assert.match(askLlmOpenAi.answer, /Mocked OpenAI answer/);
    assert.ok((askLlmOpenAi.llm.tokenUsage?.total ?? 0) > 0);
    assert.ok((askLlmOpenAi.llm.estimatedCostUsd ?? 0) > 0);
    assert.equal(askLlmOpenAi.plan.intent, askLlmAnthropic.plan.intent);
    assert.equal(askLlmOpenAi.deterministicAnswer, askLlmAnthropic.deterministicAnswer);

    const askProofRes = await fetch(`${base}/ask/proof/${askPerms.proof.proofId}`);
    assert.equal(askProofRes.status, 200, 'ask proof lookup should return 200');
    const askProofBody = (await askProofRes.json()) as {
      status: string;
      proof: { proofId: string; replayToken: string; policyId: string };
    };
    assert.equal(askProofBody.status, 'implemented');
    assert.equal(askProofBody.proof.proofId, askPerms.proof.proofId);
    assert.equal(askProofBody.proof.replayToken, askPerms.proof.replayToken);
    assert.equal(typeof askProofBody.proof.policyId, 'string');

    const askRecentProofsRes = await fetch(`${base}/ask/proofs/recent?limit=10`);
    assert.equal(askRecentProofsRes.status, 200, 'ask recent proofs should return 200');
    const askRecentProofsBody = (await askRecentProofsRes.json()) as {
      status: string;
      total: number;
      proofs: Array<{ proofId: string; replayToken: string }>;
    };
    assert.equal(askRecentProofsBody.status, 'implemented');
    assert.ok(askRecentProofsBody.total > 0);
    assert.equal(
      askRecentProofsBody.proofs[0]?.proofId,
      askLlmOpenAi.proof.proofId,
      'recent proofs should be newest-first and include the latest ask proof first'
    );

    const askReplayRes = await fetch(`${base}/ask/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ replayToken: askPerms.proof.replayToken })
    });
    assert.equal(askReplayRes.status, 201, 'ask replay should return 201');
    const askReplayBody = (await askReplayRes.json()) as {
      status: string;
      matched: boolean;
      corePayloadMatched: boolean;
      metricsMatched: boolean;
      replayToken: string;
      proofId: string;
      original: { deterministicAnswer: string };
      replayed: { deterministicAnswer: string };
    };
    assert.equal(askReplayBody.status, 'implemented');
    assert.equal(askReplayBody.matched, true);
    assert.equal(askReplayBody.corePayloadMatched, true);
    assert.equal(askReplayBody.metricsMatched, true);
    assert.equal(askReplayBody.replayToken, askPerms.proof.replayToken);
    assert.equal(askReplayBody.proofId, askPerms.proof.proofId);
    assert.equal(
      askReplayBody.original.deterministicAnswer,
      askReplayBody.replayed.deterministicAnswer
    );

    const askBadRequest = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '', maxCitations: 0 })
    });
    assert.equal(askBadRequest.status, 400, 'ask should validate request body');
    const askBadRequestBody = (await askBadRequest.json()) as { error: { code: string } };
    assert.equal(askBadRequestBody.error.code, 'BAD_REQUEST');

    const askTooManyCitations = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello', maxCitations: 50 })
    });
    assert.equal(askTooManyCitations.status, 400, 'ask should reject too many citations');

    const askInvalidMode = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello', mode: 'chatty' })
    });
    assert.equal(askInvalidMode.status, 400, 'ask should reject invalid mode');

    const askPolicyValidateRes = await fetch(`${base}/ask/policy/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        groundingThreshold: 0.7,
        constraintThreshold: 0.9,
        ambiguityMaxThreshold: 0.45,
        dryRun: true
      })
    });
    assert.equal(askPolicyValidateRes.status, 201);
    const askPolicyValidateBody = (await askPolicyValidateRes.json()) as {
      valid: boolean;
      dryRun: boolean;
      policyId: string;
    };
    assert.equal(askPolicyValidateBody.valid, true);
    assert.equal(askPolicyValidateBody.dryRun, true);
    assert.equal(typeof askPolicyValidateBody.policyId, 'string');

    const askMetricsExportRes = await fetch(`${base}/ask/metrics/export`);
    assert.equal(askMetricsExportRes.status, 200);
    const askMetricsExportBody = (await askMetricsExportRes.json()) as {
      status: string;
      totalRecords: number;
      bySnapshot: Array<{ snapshotId: string; count: number }>;
      byProvider: Array<{ provider: string; count: number; successCount: number; errorRate: number }>;
    };
    assert.equal(askMetricsExportBody.status, 'implemented');
    assert.ok(askMetricsExportBody.totalRecords > 0);
    assert.ok(askMetricsExportBody.bySnapshot.length > 0);
    assert.ok(askMetricsExportBody.byProvider.length > 0);
    assert.ok(
      askMetricsExportBody.byProvider.some(
        (provider) => provider.provider === 'anthropic' || provider.provider === 'openai'
      )
    );

    const askTrustDashboardRes = await fetch(`${base}/ask/trust/dashboard`);
    assert.equal(askTrustDashboardRes.status, 200);
    const askTrustDashboardBody = (await askTrustDashboardRes.json()) as {
      status: string;
      replayPassRate: number;
      proofCoverageRate: number;
      totals: { askRecords: number; proofArtifacts: number };
      driftTrend: { snapshotCount: number };
      failureClasses: Array<{ class: string; count: number }>;
    };
    assert.equal(askTrustDashboardBody.status, 'implemented');
    assert.equal(typeof askTrustDashboardBody.replayPassRate, 'number');
    assert.equal(typeof askTrustDashboardBody.proofCoverageRate, 'number');
    assert.ok(askTrustDashboardBody.totals.askRecords > 0);
    assert.ok(askTrustDashboardBody.totals.proofArtifacts > 0);
    assert.ok(askTrustDashboardBody.driftTrend.snapshotCount >= 1);
    assert.ok(askTrustDashboardBody.failureClasses.length >= 1);

    const metaContextRes = await fetch(`${base}/meta/context`);
    assert.equal(metaContextRes.status, 200, 'meta context should return 200');
    const metaContextBody = (await metaContextRes.json()) as {
      status: string;
      context: { relationMultipliers: Record<string, number> };
    };
    assert.equal(metaContextBody.status, 'implemented');
    assert.equal(typeof metaContextBody.context.relationMultipliers.QUERIES, 'number');

    const metaAdaptDryRunRes = await fetch(`${base}/meta/adapt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dryRun: true })
    });
    assert.equal(metaAdaptDryRunRes.status, 201, 'meta adapt dry run should return 201');
    const metaAdaptDryRunBody = (await metaAdaptDryRunRes.json()) as {
      status: string;
      dryRun: boolean;
      contextPath: string;
      auditArtifactPath: string;
      before: { relationMultipliers: Record<string, number> };
      after: { relationMultipliers: Record<string, number> };
    };
    assert.equal(metaAdaptDryRunBody.status, 'implemented');
    assert.equal(metaAdaptDryRunBody.dryRun, true);
    assert.equal(typeof metaAdaptDryRunBody.contextPath, 'string');
    assert.equal(typeof metaAdaptDryRunBody.auditArtifactPath, 'string');
    assert.equal(typeof metaAdaptDryRunBody.after.relationMultipliers.WRITES, 'number');

    const metaAdaptRes = await fetch(`${base}/meta/adapt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dryRun: false })
    });
    assert.equal(metaAdaptRes.status, 201, 'meta adapt should return 201');
    const metaAdaptBody = (await metaAdaptRes.json()) as {
      status: string;
      dryRun: boolean;
      changed: boolean;
      contextPath: string;
      auditArtifactPath: string;
    };
    assert.equal(metaAdaptBody.status, 'implemented');
    assert.equal(metaAdaptBody.dryRun, false);
    assert.equal(typeof metaAdaptBody.changed, 'boolean');
    assert.ok(fs.existsSync(metaAdaptBody.contextPath), 'meta context file should exist after adapt');

    const metricsRes = await fetch(`${base}/metrics`);
    assert.equal(metricsRes.status, 200, 'metrics should return 200');
    const metricsBody = (await metricsRes.json()) as {
      status: string;
      dbBackend: string;
      totalRequests: number;
      byRoute: Array<{ path: string; method: string; requestCount: number }>;
    };
    assert.equal(metricsBody.status, 'ok');
    assert.equal(metricsBody.dbBackend, 'sqlite');
    assert.ok(metricsBody.totalRequests > 0, 'metrics should track requests');
    assert.ok(
      metricsBody.byRoute.some((route) => route.path.includes('/refresh') && route.requestCount > 0),
      'metrics should include refresh route'
    );

    console.log('integration passed');
  } finally {
    globalThis.fetch = originalFetch;
    await app.close();
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
    }
    if (fs.existsSync(userMapPath)) {
      fs.rmSync(userMapPath, { force: true });
    }
    if (fs.existsSync(evidencePath)) {
      fs.rmSync(evidencePath, { force: true });
    }
    if (fs.existsSync(semanticSnapshotPath)) {
      fs.rmSync(semanticSnapshotPath, { force: true });
    }
    if (fs.existsSync(metaContextPath)) {
      fs.rmSync(metaContextPath, { force: true });
    }
    if (fs.existsSync(sfParseFixturePath)) {
      fs.rmSync(sfParseFixturePath, { recursive: true, force: true });
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
