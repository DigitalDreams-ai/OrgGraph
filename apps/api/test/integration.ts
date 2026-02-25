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
  const dbPath = path.join(workspaceRoot, 'data', 'orggraph.integration.db');
  const evidencePath = path.join(workspaceRoot, 'data', 'evidence.integration.json');
  const userMapPath = path.join(workspaceRoot, 'data', 'user-profile-map.integration.json');

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { force: true });
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
  process.env.PERMISSIONS_FIXTURES_PATH = path.join(workspaceRoot, 'fixtures', 'permissions');
  process.env.USER_PROFILE_MAP_PATH = userMapPath;
  process.env.EVIDENCE_INDEX_PATH = evidencePath;
  process.env.SF_INTEGRATION_ENABLED = 'false';

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
      mode: string;
      skipped: boolean;
      nodeCount: number;
      edgeCount: number;
      ontology: { violationCount: number; warningCount: number };
    };
    assert.equal(refreshBody.mode, 'full', 'default refresh mode should be full');
    assert.equal(refreshBody.skipped, false, 'default refresh should not skip');
    assert.ok(refreshBody.nodeCount > 0, 'refresh should create nodes');
    assert.ok(refreshBody.edgeCount > 0, 'refresh should create edges');
    assert.equal(refreshBody.ontology.violationCount, 0, 'refresh should not emit ontology violations');

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
      mode: string;
      skipped: boolean;
      skipReason?: string;
      nodeCount: number;
      edgeCount: number;
    };
    assert.equal(refreshIncrementalBody.mode, 'incremental');
    assert.equal(refreshIncrementalBody.skipped, true, 'incremental refresh should skip unchanged fixtures');
    assert.equal(refreshIncrementalBody.skipReason, 'no_changes_detected');
    assert.ok(refreshIncrementalBody.nodeCount > 0);
    assert.ok(refreshIncrementalBody.edgeCount > 0);

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

    const orgRetrieveBadBodyRes = await fetch(`${base}/org/retrieve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ runAuth: 'yes' })
    });
    assert.equal(orgRetrieveBadBodyRes.status, 400, 'org retrieve should validate boolean body flags');

    const brokenRoot = fs.mkdtempSync(path.join(workspaceRoot, 'fixtures', 'tmp-broken-'));
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
    assert.ok(
      automationOppBody.automations.some((item) => item.name === 'OpportunityImpactService'),
      'automation should include apex class for Opportunity'
    );
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
      consistency: { checked: boolean; aligned: boolean };
    };
    assert.equal(askPerms.status, 'implemented');
    assert.equal(askPerms.plan.intent, 'perms');
    assert.ok(askPerms.citations.length > 0, 'ask should include citations');
    assert.equal(askPerms.consistency.checked, false);
    assert.equal(askPerms.consistency.aligned, true);

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

    const askUnknownRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello world' })
    });
    assert.equal(askUnknownRes.status, 201, 'ask unknown should return 201');
    const askUnknown = (await askUnknownRes.json()) as { plan: { intent: string }; answer: string };
    assert.equal(askUnknown.plan.intent, 'unknown');
    assert.match(askUnknown.answer, /No deterministic plan/i);

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
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
