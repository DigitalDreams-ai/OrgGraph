import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NODE_TYPES } from '@orgumented/ontology';
import { CustomPermissionParserService } from '../src/modules/ingestion/custom-permission-parser.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-custom-perm-'));
  const dirPath = path.join(root, 'custom-permissions');
  fs.mkdirSync(dirPath, { recursive: true });

  fs.writeFileSync(
    path.join(dirPath, 'CanApprove.customPermission-meta.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
     <CustomPermission xmlns="http://soap.sforce.com/2006/04/metadata">
       <fullName>CanApprove</fullName>
     </CustomPermission>`,
    'utf8'
  );

  const parser = new CustomPermissionParserService();
  const payload = parser.parseFromFixtures(root);

  const node = payload.nodes.find(
    (candidate) => candidate.type === NODE_TYPES.CUSTOM_PERMISSION && candidate.name === 'CanApprove'
  );

  assert.ok(node, 'CustomPermission node should exist');
  fs.rmSync(root, { recursive: true, force: true });
  console.log('custom permission parser test passed');
}

run();
