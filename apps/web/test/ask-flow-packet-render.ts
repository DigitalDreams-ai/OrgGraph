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
          topCitationSources: ['Opportunity.permissionset-meta.xml', 'OpportunityStageSync.flow-meta.xml'],
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
  assert.match(reviewMarkup, /Top citation sources/);
  assert.match(reviewMarkup, /Opportunity\.permissionset-meta\.xml/);
  assert.match(reviewMarkup, /Top automation names/);
  assert.match(reviewMarkup, /StageSyncFlow/);
  assert.match(reviewMarkup, /StageApprovalFlow/);
  assert.match(reviewMarkup, /Top impacted sources/);
  assert.match(reviewMarkup, /OpportunityStageSync\.flow-meta\.xml/);
  assert.match(reviewMarkup, /OpportunityImpactService\.cls/);

  const impactMarkup = renderToStaticMarkup(
    createElement(AskWorkspace, {
      activeAlias: 'shulman-uat',
      sessionStatus: 'connected',
      buildVersion: 'dev-local',
      latestRetrieve: null,
      latestRetrieveSelections: [],
      askQuery: 'What touches Opportunity.StageName?',
      setAskQuery: () => undefined,
      maxCitationsRaw: '10',
      setMaxCitationsRaw: () => undefined,
      consistencyCheck: true,
      setConsistencyCheck: () => undefined,
      includeLowConfidence: false,
      setIncludeLowConfidence: () => undefined,
      askElaboration: '',
      askResult: {
        confidence: 0.8,
        trustLevel: 'trusted',
        decisionPacket: {
          kind: 'impact_assessment',
          focus: 'impact_lookup',
          targetLabel: 'Opportunity.StageName',
          targetType: 'field',
          sourceMode: 'latest_retrieve',
          summary: 'Deterministic impact lookup for Opportunity.StageName found 4 impact path(s). latest-retrieve evidence found for Opportunity.StageName; 4 scoped citation(s); top impact sources: OpportunityStageSync.flow-meta.xml, OpportunityImpactService.cls. This summary is limited to the current retrieve scope, not full graph analysis.',
          recommendation: {
            verdict: 'review_before_approval',
            summary: 'Review the top impacted sources for Opportunity.StageName before approval.'
          },
          riskScore: 0.61,
          riskLevel: 'medium',
          evidenceCoverage: {
            citationCount: 4,
            hasPermissionPaths: false,
            hasAutomationCoverage: false,
            hasImpactPaths: true
          },
          topRiskDrivers: [
            '4 impact path(s) matched Opportunity.StageName',
            'top impacted sources: OpportunityStageSync.flow-meta.xml, OpportunityImpactService.cls',
            'scope is constrained to the current retrieve only'
          ],
          permissionImpact: {
            user: 'n/a',
            summary: 'Permission reasoning is not part of deterministic impact lookup for Opportunity.StageName.',
            granted: false,
            pathCount: 0,
            principalCount: 0,
            warnings: ['permission coverage not evaluated in impact packet']
          },
          automationImpact: {
            summary: 'Automation reasoning is not expanded separately in this impact packet.',
            automationCount: 0,
            topAutomationNames: []
          },
          changeImpact: {
            summary: 'latest-retrieve evidence found for Opportunity.StageName; 4 scoped citation(s); top impact sources: OpportunityStageSync.flow-meta.xml, OpportunityImpactService.cls. This summary is limited to the current retrieve scope, not full graph analysis.',
            impactPathCount: 4,
            topImpactedSources: ['OpportunityStageSync.flow-meta.xml', 'OpportunityImpactService.cls']
          },
          evidenceGaps: [],
          nextActions: [{ label: 'Inspect impact paths', rationale: 'Start with OpportunityStageSync.flow-meta.xml.' }]
        },
        policy: { policyId: 'policy_fixture' },
        proof: { proofId: 'proof_fixture', replayToken: 'trace_fixture', snapshotId: 'snap_fixture' },
        citations: []
      },
      askSummary: 'Impact lookup for Opportunity.StageName grounded by 4 citation(s).',
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

  assert.match(impactMarkup, /Impact signals/);
  assert.match(impactMarkup, /4 paths/);
  assert.match(impactMarkup, />Impact paths</);
  assert.match(impactMarkup, />Scope</);
  assert.match(impactMarkup, /latest retrieve/);
  assert.match(impactMarkup, />Top sources</);
  assert.match(impactMarkup, /OpportunityStageSync\.flow-meta\.xml/);
  assert.doesNotMatch(impactMarkup, /Permission model/);
  assert.doesNotMatch(impactMarkup, />Grounding spotlight</);

  const componentMarkup = renderToStaticMarkup(
    createElement(AskWorkspace, {
      activeAlias: 'shulman-uat',
      sessionStatus: 'connected',
      buildVersion: 'dev-local',
      latestRetrieve: null,
      latestRetrieveSelections: [],
      askQuery: 'Where is Flow Civil_Rights_Intake_Questionnaire used?',
      setAskQuery: () => undefined,
      maxCitationsRaw: '10',
      setMaxCitationsRaw: () => undefined,
      consistencyCheck: true,
      setConsistencyCheck: () => undefined,
      includeLowConfidence: false,
      setIncludeLowConfidence: () => undefined,
      askElaboration: '',
      askResult: {
        confidence: 0.82,
        trustLevel: 'trusted',
        decisionPacket: {
          kind: 'metadata_component_usage',
          focus: 'usage_lookup',
          targetLabel: 'Flow Civil_Rights_Intake_Questionnaire',
          targetType: 'metadata_component',
          summary: 'Deterministic component usage lookup for Flow Civil_Rights_Intake_Questionnaire found 3 referencing evidence hit(s) across 2 source file(s).',
          recommendation: {
            verdict: 'review_before_approval',
            summary: 'Review the referencing metadata sources first.'
          },
          riskScore: 0.36,
          riskLevel: 'medium',
          evidenceCoverage: {
            citationCount: 4,
            hasPermissionPaths: false,
            hasAutomationCoverage: true,
            hasImpactPaths: true
          },
          topRiskDrivers: ['3 referencing evidence hit(s) across 2 source file(s)'],
          permissionImpact: {
            user: 'n/a',
            summary: 'Permission reasoning is not part of metadata component usage lookup.',
            granted: false,
            pathCount: 0,
            principalCount: 0,
            warnings: ['permission coverage not evaluated in component-usage packet']
          },
          automationImpact: {
            summary: 'grounded by deterministic evidence lookup',
            automationCount: 3,
            topAutomationNames: []
          },
          changeImpact: {
            summary: '3 referencing evidence hit(s) across 2 source file(s)',
            impactPathCount: 3,
            topImpactedSources: ['FlowDefinition.flow-meta.xml']
          },
          componentUsage: {
            familyHint: 'flow',
            matchedCount: 4,
            referenceHitCount: 3,
            sourceFileCount: 2,
            definitionOnly: false,
            topReferenceSources: ['FlowDefinition.flow-meta.xml', 'QuickActions.cls'],
            summaries: {
              references: '3 referencing evidence hit(s) across 2 source file(s)',
              coverage: '2 total grounded source file(s) in current semantic state',
              family: 'Flow',
              definition: 'Definition anchor: Civil_Rights_Intake_Questionnaire.flow-meta.xml.'
            }
          },
          evidenceGaps: [],
          nextActions: [{ label: 'Inspect citation sources', rationale: 'Start with the top reference sources.' }]
        },
        policy: { policyId: 'policy_fixture' },
        proof: { proofId: 'proof_fixture', replayToken: 'trace_fixture', snapshotId: 'snap_fixture' },
        citations: []
      },
      askSummary: 'Flow usage lookup grounded by 4 citation(s).',
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

  assert.match(componentMarkup, /Usage signals/);
  assert.doesNotMatch(componentMarkup, /Permission model/);
  assert.match(componentMarkup, /3 refs \/ 2 files/);
  assert.match(componentMarkup, />Lookup status</);
  assert.match(componentMarkup, />References</);
  assert.match(componentMarkup, />Coverage</);
  assert.match(componentMarkup, />Component family</);
  assert.match(componentMarkup, />Source spotlight</);
  assert.match(componentMarkup, /FlowDefinition\.flow-meta\.xml/);
  assert.match(componentMarkup, /Open Org Browser/);
  assert.match(componentMarkup, /Open Refresh &amp; Build/);
}

run();
