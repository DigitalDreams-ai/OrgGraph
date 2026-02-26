import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NODE_TYPES } from '@orgumented/ontology';
import { ConnectedAppParserService } from '../src/modules/ingestion/connected-app-parser.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-connected-app-'));
  const dirPath = path.join(root, 'connectedApps');
  fs.mkdirSync(dirPath, { recursive: true });

  fs.writeFileSync(
    path.join(dirPath, 'OrgumentedAPI.connectedApp-meta.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
     <ConnectedApp xmlns="http://soap.sforce.com/2006/04/metadata">
       <fullName>OrgumentedAPI</fullName>
     </ConnectedApp>`,
    'utf8'
  );

  const parser = new ConnectedAppParserService();
  const payload = parser.parseFromFixtures(root);

  const node = payload.nodes.find(
    (candidate) => candidate.type === NODE_TYPES.CONNECTED_APP && candidate.name === 'OrgumentedAPI'
  );

  assert.ok(node, 'ConnectedApp node should exist');
  fs.rmSync(root, { recursive: true, force: true });
  console.log('connected app parser test passed');
}

run();
