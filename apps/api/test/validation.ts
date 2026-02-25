import assert from 'node:assert/strict';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { ApexClassParserService } from '../src/ingestion/apex-class-parser.service';
import { ApexTriggerParserService } from '../src/ingestion/apex-trigger-parser.service';
import { ConnectedAppParserService } from '../src/ingestion/connected-app-parser.service';
import { CustomObjectParserService } from '../src/ingestion/custom-object-parser.service';
import { CustomPermissionParserService } from '../src/ingestion/custom-permission-parser.service';
import { FlowParserService } from '../src/ingestion/flow-parser.service';
import { PermissionSetGroupParserService } from '../src/ingestion/permission-set-group-parser.service';
import { PermissionsParserService } from '../src/ingestion/permissions-parser.service';
import { StagedUiMetadataParserService } from '../src/ingestion/staged-ui-metadata-parser.service';
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
  const customObjectParser = new CustomObjectParserService();
  const permissionSetGroupParser = new PermissionSetGroupParserService();
  const customPermissionParser = new CustomPermissionParserService();
  const connectedAppParser = new ConnectedAppParserService();
  const uiMetadataParser = new StagedUiMetadataParserService();
  const payload = mergePayloads(
    permissionsParser.parseFromFixtures(fixturesPath),
    triggerParser.parseFromFixtures(fixturesPath),
    classParser.parseFromFixtures(fixturesPath),
    flowParser.parseFromFixtures(fixturesPath),
    customObjectParser.parseFromFixtures(fixturesPath),
    permissionSetGroupParser.parseFromFixtures(fixturesPath),
    customPermissionParser.parseFromFixtures(fixturesPath),
    connectedAppParser.parseFromFixtures(fixturesPath),
    uiMetadataParser.parseFromFixtures(fixturesPath)
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
  const systemPermNode = payload.nodes.find(
    (node) =>
      node.type === NODE_TYPES.SYSTEM_PERMISSION &&
      node.name === 'ApproveUninstalledConnectedApps'
  );
  const customPermNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.CUSTOM_PERMISSION && node.name === 'CanApproveIntake'
  );
  const connectedAppNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.CONNECTED_APP && node.name === 'OrgGraphAPI'
  );
  const permissionSetGroupNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.PERMISSION_SET_GROUP && node.name === 'Support_Users'
  );
  const caseManagerPermissionSetNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.PERMISSION_SET && node.name === 'Case_Manager'
  );
  const opportunityNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.OBJECT && node.name === 'Opportunity'
  );
  const opportunityAmountNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.FIELD && node.name === 'Opportunity.Amount'
  );
  const apexPageNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.APEX_PAGE && node.name === 'OpportunityReview'
  );
  const lwcNode = payload.nodes.find(
    (node) =>
      node.type === NODE_TYPES.LIGHTNING_COMPONENT_BUNDLE && node.name === 'opportunityPulse'
  );
  const auraNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.AURA_DEFINITION_BUNDLE && node.name === 'CaseConsoleWidget'
  );
  const quickActionNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.QUICK_ACTION && node.name === 'Opportunity.MarkWon'
  );
  const layoutNode = payload.nodes.find(
    (node) => node.type === NODE_TYPES.LAYOUT && node.name === 'Opportunity-Opportunity Layout'
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
  assert.ok(systemPermNode, 'ApproveUninstalledConnectedApps system permission node should exist');
  assert.ok(customPermNode, 'CanApproveIntake custom permission node should exist');
  assert.ok(connectedAppNode, 'OrgGraphAPI connected app node should exist');
  assert.ok(permissionSetGroupNode, 'Support_Users permission set group node should exist');
  assert.ok(caseManagerPermissionSetNode, 'Case_Manager permission set node should exist');
  assert.ok(opportunityNode, 'Opportunity object node should exist');
  assert.ok(opportunityAmountNode, 'Opportunity.Amount field node should exist');
  assert.ok(apexPageNode, 'OpportunityReview apex page node should exist');
  assert.ok(lwcNode, 'opportunityPulse lwc node should exist');
  assert.ok(auraNode, 'CaseConsoleWidget aura node should exist');
  assert.ok(quickActionNode, 'Opportunity.MarkWon quick action node should exist');
  assert.ok(layoutNode, 'Opportunity-Opportunity Layout layout node should exist');
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

  const grantsSystemPermEdge = payload.edges.find(
    (edge) =>
      edge.srcId === supportNode.id &&
      edge.dstId === systemPermNode.id &&
      edge.rel === REL_TYPES.GRANTS_SYSTEM_PERMISSION
  );
  assert.ok(grantsSystemPermEdge, 'Support should grant ApproveUninstalledConnectedApps');
  const grantsCustomPermEdge = payload.edges.find(
    (edge) =>
      edge.srcId === supportNode.id &&
      edge.dstId === customPermNode.id &&
      edge.rel === REL_TYPES.GRANTS_CUSTOM_PERMISSION
  );
  assert.ok(grantsCustomPermEdge, 'Support should grant CanApproveIntake');

  const usesConnectedAppEdge = payload.edges.find(
    (edge) =>
      edge.srcId === supportNode.id &&
      edge.dstId === connectedAppNode.id &&
      edge.rel === REL_TYPES.USES_CONNECTED_APP
  );
  assert.ok(usesConnectedAppEdge, 'Support should use OrgGraphAPI connected app');

  const includesPermissionSetEdge = payload.edges.find(
    (edge) =>
      edge.srcId === permissionSetGroupNode.id &&
      edge.dstId === caseManagerPermissionSetNode.id &&
      edge.rel === REL_TYPES.INCLUDES_PERMISSION_SET
  );
  assert.ok(includesPermissionSetEdge, 'Support_Users should include Case_Manager');

  const hasFieldEdge = payload.edges.find(
    (edge) =>
      edge.srcId === opportunityNode.id &&
      edge.dstId === opportunityAmountNode.id &&
      edge.rel === REL_TYPES.HAS_FIELD
  );
  assert.ok(hasFieldEdge, 'Opportunity should have field Opportunity.Amount');

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
