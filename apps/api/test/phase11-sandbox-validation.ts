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
  const sandboxPath = path.join(workspaceRoot, 'data', 'sf-project', 'force-app', 'main', 'default');
  if (!fs.existsSync(sandboxPath)) {
    console.log('phase11 sandbox validation skipped: sandbox metadata path missing');
    return;
  }
  const sandboxEntries = fs.readdirSync(sandboxPath);
  if (sandboxEntries.length === 0) {
    console.log('phase11 sandbox validation skipped: sandbox metadata path empty');
    return;
  }

  const dbPath = path.join(workspaceRoot, 'data', 'orgumented.phase11-sandbox.db');
  const evidencePath = path.join(workspaceRoot, 'data', 'evidence.phase11-sandbox.json');
  const userMapPath = path.join(workspaceRoot, 'data', 'user-profile-map.phase11-sandbox.json');
  const semanticSnapshotPath = path.join(workspaceRoot, 'data', 'refresh', 'semantic-snapshot.phase11.json');
  const subsetPath = path.join(workspaceRoot, 'data', 'sf-project', 'phase11-sandbox-subset');

  if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { force: true });
  if (fs.existsSync(evidencePath)) fs.rmSync(evidencePath, { force: true });
  if (fs.existsSync(semanticSnapshotPath)) fs.rmSync(semanticSnapshotPath, { force: true });
  if (fs.existsSync(subsetPath)) fs.rmSync(subsetPath, { recursive: true, force: true });
  fs.mkdirSync(subsetPath, { recursive: true });
  fs.writeFileSync(userMapPath, JSON.stringify({ 'jane@example.com': ['Support'] }, null, 2), 'utf8');

  copyFirstNFiles(sandboxPath, subsetPath, 'profiles', 5);
  copyFirstNFiles(sandboxPath, subsetPath, 'permission-sets', 10);
  copyFirstNFiles(sandboxPath, subsetPath, 'permission-set-groups', 5);
  copyFirstNFiles(sandboxPath, subsetPath, 'custom-permissions', 10);
  copyFirstNFiles(sandboxPath, subsetPath, 'connectedApps', 5);
  copyFirstNFiles(sandboxPath, subsetPath, 'objects', 6);
  copyFirstNFiles(sandboxPath, subsetPath, 'apex-triggers', 8);
  copyFirstNFiles(sandboxPath, subsetPath, 'apex-classes', 12);
  copyFirstNFiles(sandboxPath, subsetPath, 'flows', 12);

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.GRAPH_BACKEND = 'sqlite';
  process.env.PERMISSIONS_FIXTURES_PATH = subsetPath;
  process.env.USER_PROFILE_MAP_PATH = userMapPath;
  process.env.EVIDENCE_INDEX_PATH = evidencePath;
  process.env.SEMANTIC_SNAPSHOT_PATH = semanticSnapshotPath;
  process.env.SF_INTEGRATION_ENABLED = 'false';
  process.env.LLM_ENABLED = 'false';

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0);

  try {
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'string' ? 0 : addr.port;
    const base = `http://127.0.0.1:${port}`;

    const refreshRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fixturesPath: subsetPath, mode: 'full' })
    });
    if (refreshRes.status !== 201) {
      const raw = await refreshRes.text();
      throw new Error(`phase11 sandbox refresh failed status=${refreshRes.status} body=${raw}`);
    }
    const refreshBody = (await refreshRes.json()) as {
      nodeCount: number;
      edgeCount: number;
      semanticDiff: { addedNodeCount: number; addedEdgeCount: number };
      meaningChangeSummary: string;
    };
    assert.ok(refreshBody.nodeCount > 20, 'sandbox refresh subset should load graph');
    assert.ok(refreshBody.edgeCount > 20, 'sandbox refresh subset should load graph');
    assert.ok(refreshBody.semanticDiff.addedNodeCount > 0);
    assert.ok(refreshBody.semanticDiff.addedEdgeCount > 0);
    assert.equal(typeof refreshBody.meaningChangeSummary, 'string');

    const askRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'What touches Opportunity.StageName?', mode: 'deterministic' })
    });
    assert.equal(askRes.status, 201);
    const askBody = (await askRes.json()) as {
      proof: { replayToken: string };
      trustLevel: string;
    };
    assert.equal(typeof askBody.proof.replayToken, 'string');
    assert.ok(['trusted', 'conditional', 'refused'].includes(askBody.trustLevel));

    const replayRes = await fetch(`${base}/ask/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ replayToken: askBody.proof.replayToken })
    });
    assert.equal(replayRes.status, 201);
    const replayBody = (await replayRes.json()) as { matched: boolean };
    assert.equal(replayBody.matched, true);

    console.log('phase11 sandbox validation passed');
  } finally {
    await app.close();
    if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { force: true });
    if (fs.existsSync(evidencePath)) fs.rmSync(evidencePath, { force: true });
    if (fs.existsSync(userMapPath)) fs.rmSync(userMapPath, { force: true });
    if (fs.existsSync(semanticSnapshotPath)) fs.rmSync(semanticSnapshotPath, { force: true });
    if (fs.existsSync(subsetPath)) fs.rmSync(subsetPath, { recursive: true, force: true });
  }
}

function copyFirstNFiles(srcRoot: string, dstRoot: string, dirName: string, limit: number): void {
  const srcDir = path.join(srcRoot, dirName);
  if (!fs.existsSync(srcDir)) {
    return;
  }
  const dstDir = path.join(dstRoot, dirName);
  fs.mkdirSync(dstDir, { recursive: true });
  const files = fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort()
    .slice(0, limit);
  for (const file of files) {
    fs.copyFileSync(path.join(srcDir, file), path.join(dstDir, file));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
