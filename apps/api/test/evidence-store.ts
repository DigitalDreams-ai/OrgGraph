import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AppConfigService } from '../src/config/app-config.service';
import { EvidenceStoreService } from '../src/modules/evidence/evidence-store.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-evidence-'));
  const fixtures = path.join(root, 'fixtures', 'permissions');
  const classes = path.join(fixtures, 'apex-classes');
  fs.mkdirSync(classes, { recursive: true });
  fs.writeFileSync(
    path.join(classes, 'Probe.cls'),
    `public class Probe { public static void go(){ List<Opportunity> x = [SELECT Id, StageName FROM Opportunity]; } }`,
    'utf8'
  );

  process.env.EVIDENCE_INDEX_PATH = path.join(root, 'data', 'evidence', 'index.json');
  const config = new AppConfigService();
  const store = new EvidenceStoreService(config);

  const first = store.reindexFromFixtures(fixtures);
  const second = store.reindexFromFixtures(fixtures);

  assert.ok(first.documentCount > 0, 'evidence documents should be created');
  assert.equal(first.documentCount, second.documentCount, 'reindex should be deterministic in count');

  const hits = store.search('Opportunity StageName', 5);
  assert.ok(hits.length > 0, 'search should return matching evidence');
  assert.ok(hits[0].id.startsWith('ev_'), 'evidence id should be stable format');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('evidence store test passed');
}

run();
