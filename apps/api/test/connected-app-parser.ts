import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NODE_TYPES } from '@orggraph/ontology';
import { ConnectedAppParserService } from '../src/ingestion/connected-app-parser.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orggraph-connected-app-'));
  const dirPath = path.join(root, 'connectedApps');
  fs.mkdirSync(dirPath, { recursive: true });

  fs.writeFileSync(
    path.join(dirPath, 'OrgGraphAPI.connectedApp-meta.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
     <ConnectedApp xmlns="http://soap.sforce.com/2006/04/metadata">
       <fullName>OrgGraphAPI</fullName>
     </ConnectedApp>`,
    'utf8'
  );

  const parser = new ConnectedAppParserService();
  const payload = parser.parseFromFixtures(root);

  const node = payload.nodes.find(
    (candidate) => candidate.type === NODE_TYPES.CONNECTED_APP && candidate.name === 'OrgGraphAPI'
  );

  assert.ok(node, 'ConnectedApp node should exist');
  fs.rmSync(root, { recursive: true, force: true });
  console.log('connected app parser test passed');
}

run();
