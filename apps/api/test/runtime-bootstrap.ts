import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { RuntimeBootstrapService } from '../src/config/runtime-bootstrap.service';

function workspaceRoot(): string {
  return path.resolve(process.cwd(), '../..');
}

async function run(): Promise<void> {
  const root = workspaceRoot();
  const appDataRoot = path.join(root, 'data', 'runtime-bootstrap-test');

  fs.rmSync(appDataRoot, { recursive: true, force: true });

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

  const app = await NestFactory.create(AppModule, { logger: false });
  const runtimeBootstrap = app.get(RuntimeBootstrapService);
  await runtimeBootstrap.ensureRuntimeReady();
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

    console.log('runtime bootstrap test passed');
  } finally {
    await app.close();
    fs.rmSync(appDataRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
