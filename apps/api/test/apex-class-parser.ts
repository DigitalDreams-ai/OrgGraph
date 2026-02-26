import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REL_TYPES } from '@orgumented/ontology';
import { ApexClassParseError, ApexClassParserService } from '../src/modules/ingestion/apex-class-parser.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-apex-class-'));
  const classesPath = path.join(root, 'apex-classes');
  fs.mkdirSync(classesPath, { recursive: true });

  fs.writeFileSync(
    path.join(classesPath, 'ParserProbe.cls'),
    `public class ParserProbe {
       public static void run(List<Account> accounts) {
         List<Opportunity> opps = [SELECT Id, StageName FROM Opportunity LIMIT 1];
         update accounts;
       }
     }`,
    'utf8'
  );

  const parser = new ApexClassParserService();
  const payload = parser.parseFromFixtures(root);

  const classNode = payload.nodes.find((n) => n.name === 'ParserProbe');
  const fieldNode = payload.nodes.find((n) => n.name === 'Opportunity.StageName');
  const accountNode = payload.nodes.find((n) => n.name === 'Account');

  assert.ok(classNode, 'ParserProbe node should exist');
  assert.ok(fieldNode, 'Opportunity.StageName field should exist');
  assert.ok(accountNode, 'Account object should exist via DML inference');

  const writesAccount = payload.edges.find(
    (e) => e.rel === REL_TYPES.WRITES && e.srcId === classNode.id && e.dstId === accountNode.id
  );
  assert.ok(writesAccount, 'Parser should produce WRITES edge for inferred Account target');

  fs.writeFileSync(path.join(classesPath, 'Broken.cls'), `public without sharing`, 'utf8');
  let caught: unknown;
  try {
    parser.parseFromFixtures(root);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof ApexClassParseError, 'Broken class should raise ApexClassParseError');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('apex class parser test passed');
}

run();
