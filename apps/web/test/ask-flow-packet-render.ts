import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AskWorkspace } from '../app/workspaces/ask/ask-workspace';

function run(): void {
  const flowMarkup = renderToStaticMarkup(
    createElement(AskWorkspace, {
      activeAlias: 'shulman-uat',
      sessionStatus: 'connected',
      buildVersion: 'dev-local',
      latestRetrieve: null,
      latestRetrieveSelections: [],
      askQuery: 'Based only on the latest retrieve, explain what Flow OpportunityStageSync reads and writes.',
      setAskQuery: () => undefined,
      maxCitationsRaw: '10',
      setMaxCitationsRaw: () => undefined,
      consistencyCheck: true,
      setConsistencyCheck: () => undefined,
      includeLowConfidence: false,
      setIncludeLowConfidence: () => undefined,
      askElaboration: '',
      askResult: {
        confidence: 0.83,
        trustLevel: 'trusted',
        decisionPacket: {
          kind: 'high_risk_change_review',
          focus: 'breakage',
          targetLabel: 'OpportunityStageSync',
          targetType: 'flow',
          recommendation: {
            verdict: 'review_before_approval',
            summary: 'Review writes and trigger criteria before approval.'
          },
          riskScore: 0.72,
          riskLevel: 'high',
          evidenceCoverage: {
            citationCount: 3,
            hasPermissionPaths: false,
            hasAutomationCoverage: true,
            hasImpactPaths: true
          },
          topRiskDrivers: ['top citation sources: OpportunityStageSync.flow-meta.xml'],
          permissionImpact: {
            user: 'n/a',
            summary: 'Permission paths are not part of this flow read/write ask.',
            granted: false,
            pathCount: 0,
            principalCount: 0,
            warnings: ['permission coverage not evaluated in flow read/write packet']
          },
          automationImpact: {
            summary: 'Flow grounding summary.',
            automationCount: 1,
            topAutomationNames: ['OpportunityStageSync']
          },
          changeImpact: {
            summary: 'reads: Opportunity.StageName; writes: Opportunity.StageName.',
            impactPathCount: 2,
            topImpactedSources: ['Opportunity.StageName']
          },
          flowImpact: {
            readFieldCount: 1,
            writeFieldCount: 1,
            readObjectCount: 1,
            writeObjectCount: 1,
            referencedObjectCount: 2,
            triggerTypes: ['after_save'],
            topCitationSources: ['OpportunityStageSync.flow-meta.xml'],
            summaries: {
              reads: 'reads: Opportunity.StageName',
              writes: 'writes: Opportunity.StageName',
              readObjects: 'read objects: Account',
              writeObjects: 'write objects: Opportunity',
              referencedObjects: 'objects: Account, Opportunity',
              triggerTypes: 'trigger types: after_save'
            }
          },
          evidenceGaps: ['permission coverage is not evaluated in this flow read/write packet'],
          nextActions: [{ label: 'Run permission check', rationale: 'Confirm actor access separately.' }]
        },
        policy: { policyId: 'policy_fixture' },
        proof: { proofId: 'proof_fixture', replayToken: 'trace_fixture', snapshotId: 'snap_fixture' },
        citations: []
      },
      askSummary: 'Flow OpportunityStageSync read/write summary grounded by 3 citation(s).',
      askTrust: 'trusted',
      askProofId: 'proof_fixture',
      askReplayToken: 'trace_fixture',
      askCitations: [],
      loading: false,
      trustTone: () => 'good',
      onRunAsk: () => undefined,
      onRunAskElaboration: () => undefined,
      onOpenConnect: () => undefined,
      onRefreshAliases: () => undefined,
      onOpenBrowser: () => undefined,
      onOpenRefresh: () => undefined,
      onInspectAutomation: () => undefined,
      onInspectPermissions: () => undefined,
      onOpenProof: () => undefined,
      onSaveToHistory: () => undefined
    })
  );

  assert.match(flowMarkup, /Flow signals/);
  assert.match(flowMarkup, /1 read \/ 1 write/);
  assert.doesNotMatch(flowMarkup, /Permission model/);
  assert.match(flowMarkup, />Reads</);
  assert.match(flowMarkup, />Writes</);
  assert.match(flowMarkup, />Flow scope</);
  assert.match(flowMarkup, /read objects: Account/);
  assert.match(flowMarkup, /trigger types: after_save/);
  assert.match(flowMarkup, />Source spotlight</);
  assert.match(flowMarkup, /OpportunityStageSync\.flow-meta\.xml/);

  const reviewMarkup = renderToStaticMarkup(
    createElement(AskWorkspace, {
      activeAlias: 'shulman-uat',
      sessionStatus: 'connected',
      buildVersion: 'dev-local',
      latestRetrieve: null,
      latestRetrieveSelections: [],
      askQuery: 'Should we approve changing Opportunity.StageName for jane@example.com?',
      setAskQuery: () => undefined,
      maxCitationsRaw: '10',
      setMaxCitationsRaw: () => undefined,
      consistencyCheck: true,
      setConsistencyCheck: () => undefined,
      includeLowConfidence: false,
      setIncludeLowConfidence: () => undefined,
      askElaboration: '',
      askResult: {
        confidence: 0.91,
        trustLevel: 'trusted',
        decisionPacket: {
          kind: 'high_risk_change_review',
          focus: 'approval',
          targetLabel: 'Opportunity.StageName',
          targetType: 'field',
          recommendation: {
            verdict: 'review_before_approval',
            summary: 'Review automation and impact before approval.'
          },
          riskScore: 0.78,
          riskLevel: 'high',
          evidenceCoverage: {
            citationCount: 4,
            hasPermissionPaths: true,
            hasAutomationCoverage: true,
            hasImpactPaths: true
          },
          topRiskDrivers: ['4 automation item(s) touch Opportunity.StageName'],
          permissionImpact: {
            user: 'jane@example.com',
            summary: 'jane@example.com lacks deterministic access coverage.',
            granted: false,
            pathCount: 0,
            principalCount: 0,
            warnings: ['object-level edit path missing']
          },
          automationImpact: {
            summary: '4 automations touch Opportunity.StageName.',
            automationCount: 4,
            topAutomationNames: ['StageSyncFlow', 'StageApprovalFlow']
          },
          changeImpact: {
            summary: '6 impact paths found.',
            impactPathCount: 6,
            topImpactedSources: ['OpportunityStageSync.flow-meta.xml', 'OpportunityImpactService.cls']
          },
          evidenceGaps: ['permission coverage is incomplete'],
          nextActions: [{ label: 'Inspect automation', rationale: 'Review StageSyncFlow first.' }]
        },
        policy: { policyId: 'policy_fixture' },
        proof: { proofId: 'proof_fixture', replayToken: 'trace_fixture', snapshotId: 'snap_fixture' },
        citations: []
      },
      askSummary: 'High-risk change review for Opportunity.StageName.',
      askTrust: 'trusted',
      askProofId: 'proof_fixture',
      askReplayToken: 'trace_fixture',
      askCitations: [],
      loading: false,
      trustTone: () => 'good',
      onRunAsk: () => undefined,
      onRunAskElaboration: () => undefined,
      onOpenConnect: () => undefined,
      onRefreshAliases: () => undefined,
      onOpenBrowser: () => undefined,
      onOpenRefresh: () => undefined,
      onInspectAutomation: () => undefined,
      onInspectPermissions: () => undefined,
      onOpenProof: () => undefined,
      onSaveToHistory: () => undefined
    })
  );

  assert.match(reviewMarkup, />Grounding spotlight</);
  assert.match(reviewMarkup, /Top automation names/);
  assert.match(reviewMarkup, /StageSyncFlow/);
  assert.match(reviewMarkup, /StageApprovalFlow/);
  assert.match(reviewMarkup, /Top impacted sources/);
  assert.match(reviewMarkup, /OpportunityStageSync\.flow-meta\.xml/);
  assert.match(reviewMarkup, /OpportunityImpactService\.cls/);
}

run();
