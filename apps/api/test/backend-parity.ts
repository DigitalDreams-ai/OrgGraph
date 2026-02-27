import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

function workspaceRoot(): string {
  return path.resolve(process.cwd(), '../..');
}

async function runScenario(backend: 'sqlite' | 'postgres'): Promise<{
  backend: string;
  readyBackend: string;
  nodeCount: number;
  edgeCount: number;
  permsGranted: boolean;
  automationCount: number;
  impactCount: number;
  askIntent: string;
  systemPermissionGranted: boolean;
}> {
  const root = workspaceRoot();
  const dbPath = path.join(root, `data/orgumented.parity.${backend}.db`);
  const evidencePath = path.join(root, `data/evidence.parity.${backend}.json`);
  const mapPath = path.join(root, `data/user-profile-map.parity.${backend}.json`);
  const refreshStatePath = path.join(root, `data/refresh/state.parity.${backend}.json`);
  const refreshAuditPath = path.join(root, `data/refresh/audit.parity.${backend}.jsonl`);
  const ontologyReportPath = path.join(root, `data/refresh/ontology.parity.${backend}.json`);
  const semanticSnapshotPath = path.join(root, `data/refresh/semantic-snapshot.parity.${backend}.json`);

  if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { force: true });
  if (fs.existsSync(evidencePath)) fs.rmSync(evidencePath, { force: true });
  if (fs.existsSync(refreshStatePath)) fs.rmSync(refreshStatePath, { force: true });
  if (fs.existsSync(refreshAuditPath)) fs.rmSync(refreshAuditPath, { force: true });
  if (fs.existsSync(ontologyReportPath)) fs.rmSync(ontologyReportPath, { force: true });
  if (fs.existsSync(semanticSnapshotPath)) fs.rmSync(semanticSnapshotPath, { force: true });
  fs.writeFileSync(mapPath, JSON.stringify({ 'jane@example.com': ['Support'] }, null, 2), 'utf8');

  process.env.GRAPH_BACKEND = backend;
  process.env.DATABASE_URL = backend === 'sqlite' ? `file:${dbPath}` : 'pgmem:parity';
  process.env.PERMISSIONS_FIXTURES_PATH = path.join(root, 'fixtures', 'permissions');
  process.env.USER_PROFILE_MAP_PATH = mapPath;
  process.env.EVIDENCE_INDEX_PATH = evidencePath;
  process.env.REFRESH_STATE_PATH = refreshStatePath;
  process.env.REFRESH_AUDIT_PATH = refreshAuditPath;
  process.env.ONTOLOGY_REPORT_PATH = ontologyReportPath;
  process.env.SEMANTIC_SNAPSHOT_PATH = semanticSnapshotPath;
  process.env.SF_INTEGRATION_ENABLED = 'false';

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

    const readyRes = await fetch(`${base}/ready`);
    const readyBody = (await readyRes.json()) as {
      checks: { db: { backend: string; nodeCount: number; edgeCount: number } };
    };

    const permsBody = (await (await fetch(`${base}/perms?user=jane@example.com&object=Case`)).json()) as {
      granted: boolean;
    };
    const automationBody = (await (await fetch(`${base}/automation?object=Opportunity`)).json()) as {
      totalAutomations: number;
    };
    const impactBody = (await (await fetch(`${base}/impact?field=Opportunity.StageName`)).json()) as {
      totalPaths: number;
    };
    const askBody = (await (
      await fetch(`${base}/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'What touches Opportunity.StageName?' })
      })
    ).json()) as { plan: { intent: string } };
    const systemPermBody = (await (
      await fetch(
        `${base}/perms/system?user=jane@example.com&permission=ApproveUninstalledConnectedApps`
      )
    ).json()) as { granted: boolean };

    return {
      backend,
      readyBackend: readyBody.checks.db.backend,
      nodeCount: readyBody.checks.db.nodeCount,
      edgeCount: readyBody.checks.db.edgeCount,
      permsGranted: permsBody.granted,
      automationCount: automationBody.totalAutomations,
      impactCount: impactBody.totalPaths,
      askIntent: askBody.plan.intent,
      systemPermissionGranted: systemPermBody.granted
    };
  } finally {
    await app.close();
    if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { force: true });
    if (fs.existsSync(evidencePath)) fs.rmSync(evidencePath, { force: true });
    if (fs.existsSync(mapPath)) fs.rmSync(mapPath, { force: true });
    if (fs.existsSync(refreshStatePath)) fs.rmSync(refreshStatePath, { force: true });
    if (fs.existsSync(refreshAuditPath)) fs.rmSync(refreshAuditPath, { force: true });
    if (fs.existsSync(ontologyReportPath)) fs.rmSync(ontologyReportPath, { force: true });
    if (fs.existsSync(semanticSnapshotPath)) fs.rmSync(semanticSnapshotPath, { force: true });
  }
}

async function run(): Promise<void> {
  const sqlite = await runScenario('sqlite');
  const postgres = await runScenario('postgres');

  assert.equal(sqlite.readyBackend, 'sqlite');
  assert.equal(postgres.readyBackend, 'postgres');

  assert.equal(sqlite.nodeCount, postgres.nodeCount, 'node counts should match');
  assert.equal(sqlite.edgeCount, postgres.edgeCount, 'edge counts should match');
  assert.equal(sqlite.permsGranted, postgres.permsGranted, 'perms parity should hold');
  assert.equal(sqlite.automationCount, postgres.automationCount, 'automation parity should hold');
  assert.equal(sqlite.impactCount, postgres.impactCount, 'impact parity should hold');
  assert.equal(sqlite.askIntent, postgres.askIntent, 'ask intent parity should hold');
  assert.equal(
    sqlite.systemPermissionGranted,
    postgres.systemPermissionGranted,
    'system permission parity should hold'
  );

  console.log('backend parity test passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
