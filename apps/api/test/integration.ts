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

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0);

  try {
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'string' ? 0 : addr.port;
    assert.ok(port > 0, 'expected app to listen on an ephemeral port');

    const base = `http://127.0.0.1:${port}`;

    const refreshRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    assert.equal(refreshRes.status, 201, 'refresh should return 201');
    const refreshBody = (await refreshRes.json()) as {
      nodeCount: number;
      edgeCount: number;
    };
    assert.ok(refreshBody.nodeCount > 0, 'refresh should create nodes');
    assert.ok(refreshBody.edgeCount > 0, 'refresh should create edges');

    const malformedRefreshRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fixturesPath: 42 })
    });
    assert.equal(malformedRefreshRes.status, 400, 'refresh should reject malformed fixturesPath');

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

    console.log('integration passed');
  } finally {
    await app.close();
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
