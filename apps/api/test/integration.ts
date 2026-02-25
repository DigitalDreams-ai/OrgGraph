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

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { force: true });
  }

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.PERMISSIONS_FIXTURES_PATH = path.join(workspaceRoot, 'fixtures', 'permissions');
  process.env.USER_PROFILE_MAP_PATH = path.join(
    workspaceRoot,
    'fixtures',
    'permissions',
    'user-profile-map.json'
  );
  process.env.EVIDENCE_INDEX_PATH = evidencePath;

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
    };
    assert.equal(refreshBody.mode, 'full', 'default refresh mode should be full');
    assert.equal(refreshBody.skipped, false, 'default refresh should not skip');
    assert.ok(refreshBody.nodeCount > 0, 'refresh should create nodes');
    assert.ok(refreshBody.edgeCount > 0, 'refresh should create edges');

    const readyRes = await fetch(`${base}/ready`);
    assert.equal(readyRes.status, 200, 'ready should return 200');
    const readyBody = (await readyRes.json()) as {
      status: string;
      checks: { db: { ok: boolean }; fixtures: { ok: boolean } };
    };
    assert.equal(readyBody.status, 'ready');
    assert.equal(readyBody.checks.db.ok, true);
    assert.equal(readyBody.checks.fixtures.ok, true);

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
    };
    assert.equal(permsPositive.granted, true, 'jane should have object grant');
    assert.equal(permsPositive.objectGranted, true, 'objectGranted should be true');
    assert.ok(permsPositive.paths.length > 0, 'paths should include a deterministic path');

    const permsUnknownUserRes = await fetch(`${base}/perms?user=missing@example.com&object=Case`);
    assert.equal(permsUnknownUserRes.status, 200, 'unknown user should still return 200');
    const permsUnknownUser = (await permsUnknownUserRes.json()) as { granted: boolean };
    assert.equal(permsUnknownUser.granted, false, 'unknown user should not have grant');

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
      automations: Array<{ type: string; name: string; rel: string }>;
    };
    assert.equal(automationBody.status, 'implemented', 'automation endpoint should be implemented');
    assert.ok(automationBody.automations.length > 0, 'automation should return at least one item');
    assert.equal(automationBody.automations[0].name, 'CaseBeforeUpdate');
    assert.equal(automationBody.automations[0].rel, 'TRIGGERS_ON');

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
      paths: Array<{ from: string; rel: string; to: string }>;
      totalPaths: number;
      truncated: boolean;
    };
    assert.equal(impactPositive.status, 'implemented', 'impact endpoint should be implemented');
    assert.ok(
      impactPositive.paths.some((item) => item.to === 'Opportunity.StageName'),
      'impact should include field-level path'
    );
    assert.equal(impactPositive.totalPaths >= impactPositive.paths.length, true);
    assert.equal(impactPositive.truncated, false);

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
    };
    assert.equal(askPerms.status, 'implemented');
    assert.equal(askPerms.plan.intent, 'perms');
    assert.ok(askPerms.citations.length > 0, 'ask should include citations');

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
    const askImpact = (await askImpactRes.json()) as { plan: { intent: string } };
    assert.equal(askImpact.plan.intent, 'impact');

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
      totalRequests: number;
      byRoute: Array<{ path: string; method: string; requestCount: number }>;
    };
    assert.equal(metricsBody.status, 'ok');
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
    if (fs.existsSync(evidencePath)) {
      fs.rmSync(evidencePath, { force: true });
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
