import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REL_TYPES } from '@orgumented/ontology';
import { CustomObjectParserService } from '../src/modules/ingestion/custom-object-parser.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-custom-object-'));
  const objectsPath = path.join(root, 'objects');
  fs.mkdirSync(objectsPath, { recursive: true });

  fs.writeFileSync(
    path.join(objectsPath, 'Opportunity.object-meta.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
     <CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
       <fullName>Opportunity</fullName>
       <fields><fullName>StageName</fullName></fields>
     </CustomObject>`,
    'utf8'
  );

  const parser = new CustomObjectParserService();
  const payload = parser.parseFromFixtures(root);

  const objectNode = payload.nodes.find((node) => node.name === 'Opportunity');
  const fieldNode = payload.nodes.find((node) => node.name === 'Opportunity.StageName');
  const hasField = payload.edges.find(
    (edge) => edge.rel === REL_TYPES.HAS_FIELD && edge.srcId === objectNode?.id && edge.dstId === fieldNode?.id
  );

  assert.ok(objectNode, 'Opportunity object node should exist');
  assert.ok(fieldNode, 'Opportunity.StageName field node should exist');
  assert.ok(hasField, 'HAS_FIELD edge should exist');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('custom object parser test passed');
}

run();
