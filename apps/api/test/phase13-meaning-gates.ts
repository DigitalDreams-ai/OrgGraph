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
  const dbPath = path.join(workspaceRoot, 'data', 'orggraph.phase13-meaning.db');
  const evidencePath = path.join(workspaceRoot, 'data', 'evidence.phase13-meaning.json');
  const userMapPath = path.join(workspaceRoot, 'data', 'user-profile-map.phase13-meaning.json');

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { force: true });
  if (fs.existsSync(evidencePath)) fs.rmSync(evidencePath, { force: true });
  fs.writeFileSync(
    userMapPath,
    JSON.stringify({ 'jane@example.com': ['Support'] }, null, 2) + '\n',
    'utf8'
  );

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.GRAPH_BACKEND = 'sqlite';
  process.env.PERMISSIONS_FIXTURES_PATH = path.join(workspaceRoot, 'fixtures', 'permissions');
  process.env.USER_PROFILE_MAP_PATH = userMapPath;
  process.env.EVIDENCE_INDEX_PATH = evidencePath;
  process.env.SF_INTEGRATION_ENABLED = 'false';
  process.env.LLM_ENABLED = 'false';
  process.env.ASK_DEFAULT_MODE = 'deterministic';

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0);

  try {
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'string' ? 0 : addr.port;
    const base = `http://127.0.0.1:${port}`;

    const refreshRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    assert.equal(refreshRes.status, 201);

    const trustedRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'What touches Opportunity.StageName?', mode: 'deterministic' })
    });
    assert.equal(trustedRes.status, 201);
    const trustedBody = (await trustedRes.json()) as {
      trustLevel: string;
      metrics: {
        groundingScore: number;
        constraintSatisfaction: number;
        ambiguityScore: number;
      };
      proof: { replayToken: string };
    };
    assert.ok(['trusted', 'conditional'].includes(trustedBody.trustLevel));

    const replayRes = await fetch(`${base}/ask/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ replayToken: trustedBody.proof.replayToken })
    });
    assert.equal(replayRes.status, 201);
    const replayBody = (await replayRes.json()) as {
      matched: boolean;
      corePayloadMatched: boolean;
      metricsMatched: boolean;
      original: { metrics: { groundingScore: number } };
      replayed: { metrics: { groundingScore: number } };
    };
    assert.equal(replayBody.matched, true);
    assert.equal(replayBody.corePayloadMatched, true);
    assert.equal(replayBody.metricsMatched, true);
    assert.equal(
      replayBody.original.metrics.groundingScore,
      replayBody.replayed.metrics.groundingScore,
      'replay should maintain identical metrics under same inputs'
    );

    const unknownRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello world', mode: 'deterministic', traceLevel: 'full' })
    });
    assert.equal(unknownRes.status, 201);
    const unknownBody = (await unknownRes.json()) as {
      trustLevel: string;
      refusalReasons?: string[];
    };
    assert.equal(unknownBody.trustLevel, 'refused');
    assert.equal(Array.isArray(unknownBody.refusalReasons), true);
    assert.ok((unknownBody.refusalReasons ?? []).length > 0, 'refusal should include actionable reasons');

    const policyBadRes = await fetch(`${base}/ask/policy/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ groundingThreshold: 2, dryRun: true })
    });
    assert.equal(policyBadRes.status, 201);
    const policyBadBody = (await policyBadRes.json()) as {
      valid: boolean;
      errors: string[];
    };
    assert.equal(policyBadBody.valid, false);
    assert.ok(policyBadBody.errors.length > 0);

    const policyWarnRes = await fetch(`${base}/ask/policy/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ groundingThreshold: 0.8, constraintThreshold: 0.7, dryRun: true })
    });
    assert.equal(policyWarnRes.status, 201);
    const policyWarnBody = (await policyWarnRes.json()) as {
      valid: boolean;
      warnings: string[];
    };
    assert.equal(policyWarnBody.valid, true);
    assert.ok(policyWarnBody.warnings.length > 0);

    const exportRes = await fetch(`${base}/ask/metrics/export`);
    assert.equal(exportRes.status, 200);
    const exportBody = (await exportRes.json()) as {
      status: string;
      totalRecords: number;
      bySnapshot: Array<{ count: number; avgGroundingScore: number; avgConstraintSatisfaction: number }>;
    };
    assert.equal(exportBody.status, 'implemented');
    assert.ok(exportBody.totalRecords >= 2);
    assert.ok(exportBody.bySnapshot.length > 0);
    assert.ok(exportBody.bySnapshot[0].avgGroundingScore >= 0 && exportBody.bySnapshot[0].avgGroundingScore <= 1);
    assert.ok(
      exportBody.bySnapshot[0].avgConstraintSatisfaction >= 0 &&
        exportBody.bySnapshot[0].avgConstraintSatisfaction <= 1
    );

    console.log('phase13 meaning gates test passed');
  } finally {
    await app.close();
    if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { force: true });
    if (fs.existsSync(evidencePath)) fs.rmSync(evidencePath, { force: true });
    if (fs.existsSync(userMapPath)) fs.rmSync(userMapPath, { force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
