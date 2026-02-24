import assert from 'node:assert/strict';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { ApexClassParserService } from '../src/ingestion/apex-class-parser.service';
import { ApexTriggerParserService } from '../src/ingestion/apex-trigger-parser.service';
import { FlowParserService } from '../src/ingestion/flow-parser.service';
import { PermissionsParserService } from '../src/ingestion/permissions-parser.service';
import type { GraphPayload } from '../src/graph/graph.types';

function mergePayloads(...payloads: GraphPayload[]): GraphPayload {
  const nodesById = new Map<string, GraphPayload['nodes'][number]>();
  const edgesById = new Map<string, GraphPayload['edges'][number]>();

  for (const payload of payloads) {
    for (const node of payload.nodes) {
      nodesById.set(node.id, node);
    }
    for (const edge of payload.edges) {
      edgesById.set(edge.id, edge);
    }
  }

  return {
    nodes: [...nodesById.values()],
    edges: [...edgesById.values()]
  };
}

function run(): void {
  const fixturesPath = path.resolve(process.cwd(), '../../fixtures/permissions');
  const permissionsParser = new PermissionsParserService();
  const triggerParser = new ApexTriggerParserService();
  const classParser = new ApexClassParserService();
  const flowParser = new FlowParserService();
  const payload = mergePayloads(
    permissionsParser.parseFromFixtures(fixturesPath),
    triggerParser.parseFromFixtures(fixturesPath),
    classParser.parseFromFixtures(fixturesPath),
    flowParser.parseFromFixtures(fixturesPath)
  );

  const supportNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.PROFILE && node.name === 'Support'
  );
  const caseNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.OBJECT && node.name === 'Case'
  );
  const statusFieldNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.FIELD && node.name === 'Case.Status'
  );
  const triggerNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.APEX_TRIGGER && node.name === 'CaseBeforeUpdate'
  );
  const classNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.APEX_CLASS && node.name === 'OpportunityImpactService'
  );
  const flowNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.FLOW && node.name === 'OpportunityStageSync'
  );
  const oppStageFieldNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.FIELD && node.name === 'Opportunity.StageName'
  );

  assert.ok(supportNode, 'Support profile node should exist');
  assert.ok(caseNode, 'Case object node should exist');
  assert.ok(statusFieldNode, 'Case.Status field node should exist');
  assert.ok(triggerNode, 'CaseBeforeUpdate trigger node should exist');
  assert.ok(classNode, 'OpportunityImpactService class node should exist');
  assert.ok(flowNode, 'OpportunityStageSync flow node should exist');
  assert.ok(oppStageFieldNode, 'Opportunity.StageName field node should exist');

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

  const triggerOnCaseEdge = payload.edges.find(
    (edge) =>
      edge.srcId === triggerNode.id && edge.dstId === caseNode.id && edge.rel === REL_TYPES.TRIGGERS_ON
  );
  assert.ok(triggerOnCaseEdge, 'CaseBeforeUpdate should TRIGGERS_ON Case');

  const classQueriesOppStage = payload.edges.find(
    (edge) =>
      edge.srcId === classNode.id &&
      edge.dstId === oppStageFieldNode.id &&
      edge.rel === REL_TYPES.QUERIES
  );
  assert.ok(classQueriesOppStage, 'Apex class should QUERIES Opportunity.StageName');

  const flowWritesOppStage = payload.edges.find(
    (edge) =>
      edge.srcId === flowNode.id &&
      edge.dstId === oppStageFieldNode.id &&
      edge.rel === REL_TYPES.WRITES
  );
  assert.ok(flowWritesOppStage, 'Flow should WRITES Opportunity.StageName');

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
