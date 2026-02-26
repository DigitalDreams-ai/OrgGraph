import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REL_TYPES } from '@orgumented/ontology';
import { ApexClassParserService } from '../src/modules/ingestion/apex-class-parser.service';
import { FlowParserService } from '../src/modules/ingestion/flow-parser.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-parser-regression-'));
  const classesPath = path.join(root, 'apex-classes');
  const flowsPath = path.join(root, 'flows');
  fs.mkdirSync(classesPath, { recursive: true });
  fs.mkdirSync(flowsPath, { recursive: true });

  fs.writeFileSync(
    path.join(classesPath, 'PrecisionProbe.cls'),
    `public class PrecisionProbe {
       public static void run() {
         Opportunity o = new Opportunity();
         Database.update(o);
         List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 10];
         update accounts;
       }
     }`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(flowsPath, 'PrecisionProbe.flow-meta.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
     <Flow>
       <start><object>Opportunity</object></start>
       <formulas>
         <expression>process.builder.runtime</expression>
       </formulas>
       <formulas>
         <expression>Opportunity.StageName</expression>
       </formulas>
       <recordUpdates>
         <object>Opportunity</object>
         <inputAssignments><field>StageName</field></inputAssignments>
       </recordUpdates>
     </Flow>`,
    'utf8'
  );

  const classParser = new ApexClassParserService();
  const classPayload = classParser.parseFromFixtures(root);
  const classNode = classPayload.nodes.find((node) => node.name === 'PrecisionProbe');
  const oppNode = classPayload.nodes.find((node) => node.name === 'Opportunity');
  const accountNode = classPayload.nodes.find((node) => node.name === 'Account');
  assert.ok(classNode, 'class node should exist');
  assert.ok(oppNode, 'Opportunity object should be resolved for Database.update');
  assert.ok(accountNode, 'Account object should be resolved for update accounts');

  const writesOpp = classPayload.edges.find(
    (edge) => edge.rel === REL_TYPES.WRITES && edge.srcId === classNode.id && edge.dstId === oppNode.id
  );
  assert.ok(writesOpp, 'should infer WRITES Opportunity from Database.update(o)');

  const flowParser = new FlowParserService();
  const flowPayload = flowParser.parseFromFixtures(root);
  const flowNode = flowPayload.nodes.find((node) => node.name === 'PrecisionProbe');
  const stageFieldNode = flowPayload.nodes.find((node) => node.name === 'Opportunity.StageName');
  assert.ok(flowNode, 'flow node should exist');
  assert.ok(stageFieldNode, 'Opportunity.StageName should be extracted from flow');
  assert.equal(
    flowPayload.nodes.some((node) => node.name === 'process.builder'),
    false,
    'non-SF dotted process.* token should not be extracted as field'
  );

  const flowStats = flowParser.getLastStats();
  assert.equal(typeof flowStats.warningCounts.noise, 'number');
  assert.equal(typeof flowStats.warningCounts.ambiguous, 'number');
  assert.equal(typeof flowStats.warningCounts.unsupported, 'number');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('parser precision regression test passed');
}

run();
