import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REL_TYPES } from '@orgumented/ontology';
import { FlowParseError, FlowParserService } from '../src/modules/ingestion/flow-parser.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-flow-'));
  const flowsPath = path.join(root, 'flows');
  fs.mkdirSync(flowsPath, { recursive: true });

  fs.writeFileSync(
    path.join(flowsPath, 'Probe.flow-meta.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
     <Flow>
       <start><object>Opportunity</object></start>
       <recordUpdates>
         <object>Opportunity</object>
         <inputAssignments><field>StageName</field></inputAssignments>
       </recordUpdates>
       <formulas><expression>Account.Name</expression></formulas>
     </Flow>`,
    'utf8'
  );

  const parser = new FlowParserService();
  const payload = parser.parseFromFixtures(root);

  const flowNode = payload.nodes.find((n) => n.name === 'Probe');
  const oppNode = payload.nodes.find((n) => n.name === 'Opportunity');
  const oppStageField = payload.nodes.find((n) => n.name === 'Opportunity.StageName');

  assert.ok(flowNode, 'Flow node should exist');
  assert.ok(oppNode, 'Opportunity node should exist');
  assert.ok(oppStageField, 'Opportunity.StageName field should exist');

  const triggersOn = payload.edges.find(
    (e) => e.rel === REL_TYPES.TRIGGERS_ON && e.srcId === flowNode.id && e.dstId === oppNode.id
  );
  const writesField = payload.edges.find(
    (e) => e.rel === REL_TYPES.WRITES && e.srcId === flowNode.id && e.dstId === oppStageField.id
  );

  assert.ok(triggersOn, 'Flow should trigger on Opportunity');
  assert.ok(writesField, 'Flow should write Opportunity.StageName');

  fs.writeFileSync(path.join(flowsPath, 'Broken.flow-meta.xml'), `<NotFlow></NotFlow>`, 'utf8');
  let caught: unknown;
  try {
    parser.parseFromFixtures(root);
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof FlowParseError, 'Broken flow should raise FlowParseError');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('flow parser test passed');
}

run();
