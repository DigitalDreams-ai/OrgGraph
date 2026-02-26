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
  const dbPath = path.join(workspaceRoot, 'data', 'orggraph.phase12-replay.db');
  const evidencePath = path.join(workspaceRoot, 'data', 'evidence.phase12-replay.json');
  const userMapPath = path.join(workspaceRoot, 'data', 'user-profile-map.phase12-replay.json');

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

    const compactAskRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'Can jane@example.com edit object Case?', traceLevel: 'compact' })
    });
    assert.equal(compactAskRes.status, 201);
    const compactAskBody = (await compactAskRes.json()) as {
      proof: { proofId: string; replayToken: string; traceLevel: string };
    };
    assert.equal(compactAskBody.proof.traceLevel, 'compact');

    const compactProofRes = await fetch(`${base}/ask/proof/${compactAskBody.proof.proofId}`);
    assert.equal(compactProofRes.status, 200);
    const compactProofBody = (await compactProofRes.json()) as {
      proof: {
        traceLevel: string;
        derivationEdges: unknown[];
        citationIds: string[];
        executionTrace?: string[];
      };
    };
    assert.equal(compactProofBody.proof.traceLevel, 'compact');
    assert.equal(compactProofBody.proof.derivationEdges.length, 0);
    assert.ok(compactProofBody.proof.citationIds.length <= 3);
    assert.equal(compactProofBody.proof.executionTrace, undefined);

    const fullAskRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello world', traceLevel: 'full', mode: 'deterministic' })
    });
    assert.equal(fullAskRes.status, 201);
    const fullAskBody = (await fullAskRes.json()) as {
      trustLevel: string;
      proof: { proofId: string; replayToken: string; traceLevel: string; rejectedBranches: Array<{ reasonCode: string }> };
    };
    assert.equal(fullAskBody.proof.traceLevel, 'full');
    assert.equal(fullAskBody.trustLevel, 'refused');
    assert.equal(fullAskBody.proof.rejectedBranches.some((branch) => branch.reasonCode === 'NO_DETERMINISTIC_INTENT'), true);

    const fullProofRes = await fetch(`${base}/ask/proof/${fullAskBody.proof.proofId}`);
    assert.equal(fullProofRes.status, 200);
    const fullProofBody = (await fullProofRes.json()) as {
      proof: {
        traceLevel: string;
        executionTrace?: string[];
        rejectedBranches: Array<{ reasonCode: string }>;
      };
    };
    assert.equal(fullProofBody.proof.traceLevel, 'full');
    assert.equal(Array.isArray(fullProofBody.proof.executionTrace), true);
    assert.equal(fullProofBody.proof.executionTrace?.length ? fullProofBody.proof.executionTrace.length > 0 : false, true);
    assert.equal(fullProofBody.proof.rejectedBranches.some((branch) => branch.reasonCode === 'NO_DETERMINISTIC_INTENT'), true);

    const replayRes = await fetch(`${base}/ask/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ replayToken: fullAskBody.proof.replayToken })
    });
    assert.equal(replayRes.status, 201);
    const replayBody = (await replayRes.json()) as { matched: boolean; corePayloadMatched: boolean };
    assert.equal(replayBody.matched, true);
    assert.equal(replayBody.corePayloadMatched, true);

    console.log('phase12 replay runtime test passed');
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
