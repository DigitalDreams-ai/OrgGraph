import assert from 'node:assert/strict';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { PermissionsParserService } from '../src/ingestion/permissions-parser.service';

function run(): void {
  const fixturesPath = path.resolve(process.cwd(), '../../fixtures/permissions');
  const parser = new PermissionsParserService();
  const payload = parser.parseFromFixtures(fixturesPath);

  const supportNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.PROFILE && node.name === 'Support'
  );
  const caseNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.OBJECT && node.name === 'Case'
  );
  const statusFieldNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.FIELD && node.name === 'Case.Status'
  );

  assert.ok(supportNode, 'Support profile node should exist');
  assert.ok(caseNode, 'Case object node should exist');
  assert.ok(statusFieldNode, 'Case.Status field node should exist');

  const grantsObjectEdge = payload.edges.find(
    (edge) =>
      edge.srcId === supportNode.id && edge.dstId === caseNode.id && edge.rel === REL_TYPES.GRANTS_OBJECT
  );

  const grantsFieldEdge = payload.edges.find(
    (edge) =>
      edge.srcId === supportNode.id &&
      edge.dstId === statusFieldNode.id &&
      edge.rel === REL_TYPES.GRANTS_FIELD
  );

  assert.ok(grantsObjectEdge, 'Support should grant Case object');
  assert.ok(grantsFieldEdge, 'Support should grant Case.Status field');

  const forbiddenFieldNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.FIELD && node.name === 'Account.Secret__c'
  );

  if (forbiddenFieldNode) {
    const forbiddenEdge = payload.edges.find(
      (edge) =>
        edge.srcId === supportNode.id &&
        edge.dstId === forbiddenFieldNode.id &&
        edge.rel === REL_TYPES.GRANTS_FIELD
    );
    assert.equal(forbiddenEdge, undefined, 'Support should not grant Account.Secret__c');
  }

  console.log('validation passed');
}

run();
