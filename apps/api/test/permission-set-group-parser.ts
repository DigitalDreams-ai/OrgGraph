import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REL_TYPES } from '@orgumented/ontology';
import { PermissionSetGroupParserService } from '../src/modules/ingestion/permission-set-group-parser.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-permset-group-'));
  const dirPath = path.join(root, 'permission-set-groups');
  fs.mkdirSync(dirPath, { recursive: true });

  fs.writeFileSync(
    path.join(dirPath, 'Support.permissionsetgroup-meta.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
     <PermissionSetGroup xmlns="http://soap.sforce.com/2006/04/metadata">
       <fullName>Support</fullName>
       <permissionSets>Case_Manager</permissionSets>
     </PermissionSetGroup>`,
    'utf8'
  );

  const parser = new PermissionSetGroupParserService();
  const payload = parser.parseFromFixtures(root);

  const groupNode = payload.nodes.find((node) => node.name === 'Support');
  const permSetNode = payload.nodes.find((node) => node.name === 'Case_Manager');
  const includes = payload.edges.find(
    (edge) => edge.rel === REL_TYPES.INCLUDES_PERMISSION_SET && edge.srcId === groupNode?.id && edge.dstId === permSetNode?.id
  );

  assert.ok(groupNode, 'Support permission set group node should exist');
  assert.ok(permSetNode, 'Case_Manager permission set node should exist');
  assert.ok(includes, 'INCLUDES_PERMISSION_SET edge should exist');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('permission set group parser test passed');
}

run();
