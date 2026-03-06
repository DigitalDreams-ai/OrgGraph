import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { RuntimeBootstrapService } from '../src/config/runtime-bootstrap.service';
import { IngestionService } from '../src/modules/ingestion/ingestion.service';

function workspaceRoot(): string {
  return path.resolve(process.cwd(), '../..');
}

function applyBootstrapEnv(root: string, appDataRoot: string): void {
  process.env.ORGUMENTED_APP_DATA_ROOT = appDataRoot;
  process.env.ORGUMENTED_BOOTSTRAP_ON_STARTUP = 'true';
  process.env.DATABASE_URL = `file:${path.join(appDataRoot, 'orgumented.db')}`;
  process.env.GRAPH_BACKEND = 'sqlite';
  delete process.env.USER_PROFILE_MAP_PATH;
  delete process.env.EVIDENCE_INDEX_PATH;
  delete process.env.REFRESH_STATE_PATH;
  delete process.env.REFRESH_AUDIT_PATH;
  delete process.env.ONTOLOGY_REPORT_PATH;
  delete process.env.SEMANTIC_SNAPSHOT_PATH;
  process.env.PERMISSIONS_FIXTURES_PATH = path.join(root, 'fixtures', 'permissions');
  process.env.SF_INTEGRATION_ENABLED = 'false';
  process.env.LLM_ENABLED = 'false';
  process.env.ASK_DEFAULT_MODE = 'deterministic';
}

function seedStaleSemanticSnapshot(appDataRoot: string, sourcePath: string): void {
  const snapshotPath = path.join(appDataRoot, 'refresh', 'semantic-snapshot.json');
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        snapshotId: 'stale_snapshot_bootstrap_test',
        fingerprint: 'stale-bootstrap-fingerprint',
        generatedAt: new Date(0).toISOString(),
        sourcePath,
        nodeCount: 25000,
        edgeCount: 40000,
        nodeDigest: 'stale-node-digest',
        edgeDigest: 'stale-edge-digest',
        nodeTypeCounts: {
          OBJECT: 5000,
          FIELD: 20000,
          FLOW: 8000
        },
        relationCounts: {
          references: 25000,
          updates: 15000
        }
      },
      null,
      2
    ),
    'utf8'
  );
}

async function assertReadyAndAsk(appDataRoot: string): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const runtimeBootstrap = app.get(RuntimeBootstrapService);
  const bootstrapReady = await runtimeBootstrap.ensureRuntimeReady();
  assert.equal(bootstrapReady, true, 'bootstrap should succeed for baseline fixtures');
  await app.listen(0);

  try {
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'string' ? 0 : addr.port;
    const base = `http://127.0.0.1:${port}`;

    const readyRes = await fetch(`${base}/ready`);
    assert.equal(readyRes.status, 200, 'bootstrap runtime should report ready');
    const readyBody = (await readyRes.json()) as {
      checks: {
        db: { nodeCount: number; edgeCount: number };
        evidence: { ok: boolean };
      };
    };
    assert.ok(readyBody.checks.db.nodeCount > 0, 'bootstrap should create graph nodes');
    assert.ok(readyBody.checks.db.edgeCount > 0, 'bootstrap should create graph edges');
    assert.equal(readyBody.checks.evidence.ok, true, 'bootstrap should create evidence index');

    const mapPath = path.join(appDataRoot, 'sf-user-principals.json');
    assert.equal(fs.existsSync(mapPath), true, 'bootstrap should seed user principal map');

    const askRes = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Should we approve changing Opportunity.StageName for jane@example.com?'
      })
    });
    assert.equal(askRes.status, 201);
    const askBody = (await askRes.json()) as {
      trustLevel: string;
      citations: Array<{ id: string }>;
      refusalReasons?: string[];
      decisionPacket?: { kind: string };
    };
    assert.ok(['trusted', 'conditional'].includes(askBody.trustLevel));
    assert.equal(askBody.decisionPacket?.kind, 'high_risk_change_review');
    assert.ok((askBody.citations?.length ?? 0) > 0, 'review query should be grounded by citations');
    assert.equal(
      askBody.refusalReasons?.some((reason) => reason.includes('grounding_score')) ?? false,
      false,
      'review query should not be refused for missing grounding'
    );
  } finally {
    await app.close().catch(() => undefined);
    fs.rmSync(appDataRoot, { recursive: true, force: true });
  }
}

async function assertReadyOnly(appDataRoot: string): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const runtimeBootstrap = app.get(RuntimeBootstrapService);
  const bootstrapReady = await runtimeBootstrap.ensureRuntimeReady();
  assert.equal(bootstrapReady, true, 'bootstrap should succeed when stale snapshot requires rebaseline');
  await app.listen(0);

  try {
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'string' ? 0 : addr.port;
    const base = `http://127.0.0.1:${port}`;

    const readyRes = await fetch(`${base}/ready`);
    assert.equal(readyRes.status, 200, 'bootstrap runtime should report ready');
    const readyBody = (await readyRes.json()) as {
      checks: {
        db: { nodeCount: number; edgeCount: number };
        evidence: { ok: boolean };
      };
    };
    assert.ok(readyBody.checks.db.nodeCount > 0, 'bootstrap should create graph nodes');
    assert.ok(readyBody.checks.db.edgeCount > 0, 'bootstrap should create graph edges');
    assert.equal(readyBody.checks.evidence.ok, true, 'bootstrap should create evidence index');
  } finally {
    await app.close().catch(() => undefined);
    fs.rmSync(appDataRoot, { recursive: true, force: true });
  }
}

async function assertBootstrapRetriesDriftBudgetFailure(appDataRoot: string): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const runtimeBootstrap = app.get(RuntimeBootstrapService);
  const ingestionService = app.get(IngestionService);
  const originalRefresh = ingestionService.refresh.bind(ingestionService);
  const rebaselineFlags: boolean[] = [];
  let attempts = 0;

  (ingestionService as { refresh: typeof ingestionService.refresh }).refresh = async (
    options
  ) => {
    attempts += 1;
    rebaselineFlags.push(options.rebaseline === true);
    if (attempts === 1) {
      throw new Error('Semantic drift budget exceeded: simulated stale bootstrap baseline');
    }
    return originalRefresh(options);
  };

  const bootstrapReady = await runtimeBootstrap.ensureRuntimeReady();
  assert.equal(bootstrapReady, true, 'bootstrap should recover by retrying semantic drift failures once');
  assert.deepEqual(
    rebaselineFlags,
    [true, true],
    'bootstrap retry should keep rebaseline enabled on both attempts'
  );
  assert.equal(attempts, 2, 'bootstrap should retry semantic drift failure exactly once');
  await app.listen(0);

  try {
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'string' ? 0 : addr.port;
    const base = `http://127.0.0.1:${port}`;
    const readyRes = await fetch(`${base}/ready`);
    assert.equal(readyRes.status, 200, 'bootstrap retry should leave runtime ready');
  } finally {
    await app.close().catch(() => undefined);
    fs.rmSync(appDataRoot, { recursive: true, force: true });
  }
}

async function assertBootstrapFailureReadiness(appDataRoot: string): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const runtimeBootstrap = app.get(RuntimeBootstrapService);
  const bootstrapReady = await runtimeBootstrap.ensureRuntimeReady();
  assert.equal(bootstrapReady, false, 'bootstrap should fail when fixtures path is missing');
  await app.listen(0);

  try {
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'string' ? 0 : addr.port;
    const base = `http://127.0.0.1:${port}`;

    const healthRes = await fetch(`${base}/health`);
    assert.equal(healthRes.status, 200, 'health should still report API process availability');

    const readyRes = await fetch(`${base}/ready`);
    assert.equal(readyRes.status, 503, 'ready should fail closed when bootstrap failed');
    const readyBody = (await readyRes.json()) as {
      checks?: { bootstrap?: { status?: string; ok?: boolean } };
      message?: string;
      statusCode?: number;
    };
    assert.match(
      JSON.stringify(readyBody),
      /(runtime bootstrap failed|\"status\":\"failed\")/i,
      'ready payload should identify bootstrap failure'
    );

    const orgStatusRes = await fetch(`${base}/org/status`);
    assert.equal(orgStatusRes.status, 200, 'org status should remain reachable when bootstrap failed');
    const orgStatusBody = (await orgStatusRes.json()) as {
      integrationEnabled?: unknown;
      sf?: { installed?: unknown };
      cci?: { installed?: unknown };
    };
    assert.equal(
      typeof orgStatusBody.integrationEnabled,
      'boolean',
      'org status should expose integration state even when ready is fail-closed'
    );
    assert.equal(
      typeof orgStatusBody.sf?.installed,
      'boolean',
      'org status should continue surfacing sf tool status during bootstrap failure'
    );
    assert.equal(
      typeof orgStatusBody.cci?.installed,
      'boolean',
      'org status should continue surfacing cci tool status during bootstrap failure'
    );
  } finally {
    await app.close().catch(() => undefined);
    fs.rmSync(appDataRoot, { recursive: true, force: true });
  }
}

async function run(): Promise<void> {
  const root = workspaceRoot();

  const baselineAppDataRoot = path.join(root, 'data', 'runtime-bootstrap-test');
  fs.rmSync(baselineAppDataRoot, { recursive: true, force: true });
  applyBootstrapEnv(root, baselineAppDataRoot);
  await assertReadyAndAsk(baselineAppDataRoot);

  const staleSnapshotAppDataRoot = path.join(root, 'data', 'runtime-bootstrap-rebaseline-test');
  fs.rmSync(staleSnapshotAppDataRoot, { recursive: true, force: true });
  applyBootstrapEnv(root, staleSnapshotAppDataRoot);
  seedStaleSemanticSnapshot(
    staleSnapshotAppDataRoot,
    path.join(staleSnapshotAppDataRoot, 'sf-project', 'force-app', 'main', 'default')
  );
  await assertReadyOnly(staleSnapshotAppDataRoot);

  const staleFixtureSnapshotAppDataRoot = path.join(root, 'data', 'runtime-bootstrap-fixture-stale-test');
  fs.rmSync(staleFixtureSnapshotAppDataRoot, { recursive: true, force: true });
  applyBootstrapEnv(root, staleFixtureSnapshotAppDataRoot);
  seedStaleSemanticSnapshot(staleFixtureSnapshotAppDataRoot, path.join(root, 'fixtures', 'permissions'));
  await assertReadyOnly(staleFixtureSnapshotAppDataRoot);

  const retryAfterDriftAppDataRoot = path.join(root, 'data', 'runtime-bootstrap-drift-retry-test');
  fs.rmSync(retryAfterDriftAppDataRoot, { recursive: true, force: true });
  applyBootstrapEnv(root, retryAfterDriftAppDataRoot);
  await assertBootstrapRetriesDriftBudgetFailure(retryAfterDriftAppDataRoot);

  const failedBootstrapAppDataRoot = path.join(root, 'data', 'runtime-bootstrap-failure-test');
  fs.rmSync(failedBootstrapAppDataRoot, { recursive: true, force: true });
  applyBootstrapEnv(root, failedBootstrapAppDataRoot);
  process.env.PERMISSIONS_FIXTURES_PATH = path.join(root, 'fixtures', 'missing-runtime-bootstrap-fixtures');
  await assertBootstrapFailureReadiness(failedBootstrapAppDataRoot);

  console.log('runtime bootstrap test passed');
}

run().catch((error) => {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error('runtime bootstrap test failed with non-error rejection', error);
  }
  process.exit(1);
});
