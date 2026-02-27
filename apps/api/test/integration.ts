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

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
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
    delete process.env.DRIFT_BUDGET_AUTOMATION_NODE_DELTA_MAX;

    fs.rmSync(modifiedRoot, { recursive: true, force: true });
    fs.rmSync(strictRoot, { recursive: true, force: true });

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

    const orgStatusRes = await fetch(`${base}/org/status`);
    assert.equal(orgStatusRes.status, 200, 'org status should return 200');
    const orgStatusBody = (await orgStatusRes.json()) as {
      integrationEnabled: boolean;
      authMode: string;
      cci: { requiredVersion: string };
      sf: { installed: boolean };
    };
    assert.equal(orgStatusBody.integrationEnabled, false);
    assert.equal(orgStatusBody.authMode, 'cci');
    assert.equal(orgStatusBody.cci.requiredVersion, '3.78.0');
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
    assert.ok(['local', 'cache'].includes(metadataCatalogBody.source));
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
      plan: { intent: string };
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

    const askAutomationRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'What runs on object Opportunity?' })
    });
    assert.equal(askAutomationRes.status, 201, 'ask automation should return 201');
    const askAutomation = (await askAutomationRes.json()) as { plan: { intent: string } };
    assert.equal(askAutomation.plan.intent, 'automation');

    const askImpactRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'What touches Opportunity.StageName?' })
    });
    assert.equal(askImpactRes.status, 201, 'ask impact should return 201');
    const askImpact = (await askImpactRes.json()) as {
      plan: { intent: string };
      consistency: { checked: boolean; aligned: boolean; reason: string };
    };
    assert.equal(askImpact.plan.intent, 'impact');
    assert.equal(askImpact.consistency.checked, true);
    assert.equal(askImpact.consistency.aligned, true);

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
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
