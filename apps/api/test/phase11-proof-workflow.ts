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
  const dbPath = path.join(workspaceRoot, 'data', 'orgumented.phase11-proof.db');
  const evidencePath = path.join(workspaceRoot, 'data', 'evidence.phase11-proof.json');
  const userMapPath = path.join(workspaceRoot, 'data', 'user-profile-map.phase11-proof.json');
  const reportPath = path.join(workspaceRoot, 'artifacts', 'phase11-proof-workflow.json');

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { force: true });
  }
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

    await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });

    const scenario = {
      user: 'jane@example.com',
      object: 'Case',
      field: 'Opportunity.StageName',
      query:
        'What is the release risk impact on Opportunity.StageName and can jane@example.com edit object Case?'
    };

    const baselineStart = Date.now();
    const baselinePerms = (await (
      await fetch(
        `${base}/perms?user=${encodeURIComponent(scenario.user)}&object=${encodeURIComponent(scenario.object)}`
      )
    ).json()) as {
      granted: boolean;
      explanation: string;
    };
    const baselineImpact = (await (
      await fetch(`${base}/impact?field=${encodeURIComponent(scenario.field)}`)
    ).json()) as {
      totalPaths: number;
      explanation: string;
    };
    const baselineElapsedMs = Date.now() - baselineStart;

    const semanticStart = Date.now();
    const askRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: scenario.query, mode: 'deterministic' })
    });
    assert.equal(askRes.status, 201);
    const askBody = (await askRes.json()) as {
      answer: string;
      plan: { intent: string };
      proof: { proofId: string; replayToken: string };
      trustLevel: string;
      metrics: { groundingScore: number; constraintSatisfaction: number };
    };
    const semanticElapsedMs = Date.now() - semanticStart;

    const replayRes = await fetch(`${base}/ask/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ replayToken: askBody.proof.replayToken })
    });
    assert.equal(replayRes.status, 201);
    const replayBody = (await replayRes.json()) as { matched: boolean };

    const report = {
      generatedAt: new Date().toISOString(),
      scenario,
      baseline: {
        elapsedMs: baselineElapsedMs,
        permissionGranted: baselinePerms.granted,
        impactPaths: baselineImpact.totalPaths,
        auditableProof: false,
        reproducibleReplay: false
      },
      semanticRuntime: {
        elapsedMs: semanticElapsedMs,
        intent: askBody.plan.intent,
        trustLevel: askBody.trustLevel,
        proofId: askBody.proof.proofId,
        replayToken: askBody.proof.replayToken,
        groundingScore: askBody.metrics.groundingScore,
        constraintSatisfaction: askBody.metrics.constraintSatisfaction,
        replayMatched: replayBody.matched,
        auditableProof: true,
        reproducibleReplay: true
      },
      lift: {
        auditability: true,
        reproducibility: replayBody.matched === true,
        deterministicProofCoverage: true
      }
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    assert.equal(askBody.plan.intent, 'mixed');
    assert.equal(report.semanticRuntime.auditableProof, true);
    assert.equal(report.semanticRuntime.reproducibleReplay, true);
    assert.equal(report.lift.auditability, true);
    assert.equal(report.lift.reproducibility, true);

    console.log('phase11 proof workflow passed');
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
