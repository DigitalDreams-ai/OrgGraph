import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AskWorkspace } from '../app/workspaces/ask/ask-workspace';

function run(): void {
  const longPath = 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\proofs\\very-long-proof-folder\\with-even-more-segments\\OpportunityImpactService.cls';
  const longSnippet =
    '<FlowDefinition>This is a deliberately long snippet to verify Ask citation rendering keeps long proof text visible without clipping or horizontal spill.</FlowDefinition>';
  const markup = renderToStaticMarkup(
    createElement(AskWorkspace, {
      activeAlias: 'shulman-uat',
      sessionStatus: 'connected',
      buildVersion: 'dev-local',
      latestRetrieve: null,
      latestRetrieveSelections: [],
      askQuery: 'Should we approve changing Opportunity.ReallyLongFieldName__c for very.long.email.address@example.com?',
      setAskQuery: () => undefined,
      maxCitationsRaw: '15',
      setMaxCitationsRaw: () => undefined,
      consistencyCheck: true,
      setConsistencyCheck: () => undefined,
      includeLowConfidence: false,
      setIncludeLowConfidence: () => undefined,
      askElaboration:
        'This elaboration is intentionally verbose so the Ask answer surface must keep wrapping long structured review text inside the decision card.',
      askResult: {
        confidence: 0.94,
        trustLevel: 'trusted',
        decisionPacket: {
          kind: 'high_risk_change_review',
          focus: 'approval',
          targetLabel: 'Opportunity.ReallyLongFieldName__c',
          targetType: 'field',
          recommendation: {
            verdict: 'review_before_approval',
            summary:
              'Review the longest automation, permission, and impact evidence first so the packet remains the primary operator artifact instead of forcing raw JSON inspection.'
          },
          riskScore: 0.82,
          riskLevel: 'high',
          evidenceCoverage: {
            citationCount: 5,
            hasPermissionPaths: true,
            hasAutomationCoverage: true,
            hasImpactPaths: true
          },
          topRiskDrivers: [
            'Long automation and impact source paths must stay readable inside the packet.',
            'Evidence gap summaries should wrap rather than clip.'
          ],
          permissionImpact: {
            user: 'very.long.email.address@example.com',
            summary:
              'The permission summary is long on purpose so packet detail copy remains readable at dense desktop card widths.',
            granted: false,
            pathCount: 2,
            principalCount: 1,
            warnings: []
          },
          automationImpact: {
            summary:
              'A long automation summary should remain visible even when the card is rendered beside proof context and citations.',
            automationCount: 3,
            topAutomationNames: ['Opportunity_Stage_Guard_Flow_With_A_Long_Name']
          },
          changeImpact: {
            summary:
              'Impact summary text is intentionally long to confirm wrapping in the packet statistics grid and grounding spotlight.',
            impactPathCount: 4,
            topImpactedSources: [longPath]
          },
          evidenceGaps: [
            'A long evidence gap should remain readable in the inline list without forcing the operator to horizontally scroll.'
          ],
          nextActions: [
            {
              label:
                'Inspect the longest impacted automation path before approval using the deterministic source trail that includes C:\\very\\long\\workflow\\segments\\Opportunity_Stage_Guard_Flow_With_A_Long_Name',
              rationale:
                'This rationale is long enough to prove the follow-up list stays readable in the constrained Ask card layout while referencing C:\\very\\long\\diagnostic\\paths\\that\\would\\otherwise\\clip\\inside\\the\\action\\card.'
            }
          ]
        },
        policy: {
          policyId: 'policy_c6da7d4b719d26eb91623f40_with_a_very_long_suffix_for_wrapping_checks'
        },
        proof: {
          proofId: 'proof_b997ac5b57552e9da1d26368_with_extra_segments_for_wrapping_checks',
          replayToken: 'trace_742051a94b9345bc13b1f178_with_extra_segments_for_wrapping_checks',
          snapshotId: 'snap_66bbeb2e012a92511256b255_with_extra_segments_for_wrapping_checks'
        },
        citations: [
          {
            sourcePath: longPath,
            score: 9,
            snippet: longSnippet
          }
        ]
      },
      askSummary:
        'This Ask summary is intentionally long to verify the decision answer surface wraps cleanly across dense desktop card widths.',
      askTrust: 'trusted',
      askProofId: 'proof_b997ac5b57552e9da1d26368_with_extra_segments_for_wrapping_checks',
      askReplayToken: 'trace_742051a94b9345bc13b1f178_with_extra_segments_for_wrapping_checks',
      askCitations: [
        {
          sourcePath: longPath,
          score: 9,
          snippet: longSnippet
        }
      ],
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

  assert.match(markup, /class="decision-answer"[^>]*>This Ask summary is intentionally long/);
  assert.match(markup, /<strong class="packet-value">Opportunity\.ReallyLongFieldName__c<\/strong>/);
  assert.match(markup, /<li class="path-value">C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\proofs\\very-long-proof-folder/);
  assert.match(markup, /<span class="path-value">policy_c6da7d4b719d26eb91623f40_with_a_very_long_suffix_for_wrapping_checks<\/span>/);
  assert.match(markup, /<span class="path-value">proof_b997ac5b57552e9da1d26368_with_extra_segments_for_wrapping_checks<\/span>/);
  assert.match(markup, /<strong class="citation-source">C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\proofs\\very-long-proof-folder/);
  assert.match(markup, /<p class="citation-snippet">&lt;FlowDefinition&gt;This is a deliberately long snippet/);
  assert.match(markup, /<strong class="packet-action-label">Inspect the longest impacted automation path before approval using the deterministic source trail/);
  assert.match(markup, /<p class="packet-action-rationale">This rationale is long enough to prove the follow-up list stays readable/);
  assert.match(markup, /<h3>Proof and evidence<\/h3>/);
  assert.match(markup, /<p class="panel-caption">Operator readiness<\/p>/);
  assert.match(markup, /<p class="panel-caption">Next move<\/p>/);
  assert.doesNotMatch(markup, /<p class="panel-caption">Quick actions<\/p>/);
  assert.match(markup, /<summary>Proof context<\/summary>/);
  assert.match(markup, /<summary>Citations \(1\)<\/summary>/);
  assert.doesNotMatch(markup, /<p class="panel-caption">Proof context<\/p>/);
  assert.doesNotMatch(markup, /<p class="panel-caption">Evidence<\/p>/);

  const componentMarkup = renderToStaticMarkup(
    createElement(AskWorkspace, {
      activeAlias: 'shulman-uat',
      sessionStatus: 'connected',
      buildVersion: 'dev-local',
      latestRetrieve: null,
      latestRetrieveSelections: [],
      askQuery: 'Where is Flow Flow_With_A_Very_Long_Component_Name_And_Metadata_Arg_Syntax__mdt used?',
      setAskQuery: () => undefined,
      maxCitationsRaw: '15',
      setMaxCitationsRaw: () => undefined,
      consistencyCheck: true,
      setConsistencyCheck: () => undefined,
      includeLowConfidence: false,
      setIncludeLowConfidence: () => undefined,
      askElaboration: '',
      askResult: {
        confidence: 0.88,
        trustLevel: 'trusted',
        decisionPacket: {
          kind: 'metadata_component_usage',
          focus: 'usage_lookup',
          targetLabel: 'Flow:Flow_With_A_Very_Long_Component_Name_And_Metadata_Arg_Syntax__mdt',
          targetType: 'metadata_component',
          recommendation: {
            verdict: 'review_before_approval',
            summary: 'Inspect the longest deterministic reference sources first.'
          },
          riskScore: 0.42,
          riskLevel: 'medium',
          evidenceCoverage: {
            citationCount: 4,
            hasPermissionPaths: false,
            hasAutomationCoverage: true,
            hasImpactPaths: true
          },
          topRiskDrivers: ['Long metadata component identifiers should remain bounded in packet stats.'],
          permissionImpact: {
            user: 'n/a',
            summary: 'Permission reasoning is not part of metadata component usage lookup.',
            granted: false,
            pathCount: 0,
            principalCount: 0,
            warnings: []
          },
          automationImpact: {
            summary: 'grounded by deterministic evidence lookup',
            automationCount: 2,
            topAutomationNames: []
          },
          changeImpact: {
            summary: '2 referencing evidence hit(s) across 2 source file(s)',
            impactPathCount: 2,
            topImpactedSources: [longPath]
          },
          componentUsage: {
            familyHint: 'flow',
            matchedCount: 4,
            referenceHitCount: 2,
            sourceFileCount: 2,
            definitionOnly: false,
            topReferenceSources: [
              'C:\\Users\\sean\\Projects\\GitHub\\Orgumented\\force-app\\main\\default\\flows\\Flow_With_A_Very_Long_Component_Name_And_Metadata_Arg_Syntax__mdt.flow-meta.xml'
            ],
            summaries: {
              references: '2 referencing evidence hit(s) across 2 source file(s)',
              coverage: '2 total grounded source file(s) in current semantic state',
              family: 'Flow_With_A_Very_Long_Component_Family_Label',
              definition:
                'Definition anchor: C:\\Users\\sean\\Projects\\GitHub\\Orgumented\\force-app\\main\\default\\flows\\Flow_With_A_Very_Long_Component_Name_And_Metadata_Arg_Syntax__mdt.flow-meta.xml'
            }
          },
          evidenceGaps: [],
          nextActions: [{ label: 'Inspect citation sources', rationale: 'Start with the top reference sources.' }]
        },
        policy: {
          policyId: 'policy_component_usage_render_guard'
        },
        proof: {
          proofId: 'proof_component_usage_render_guard',
          replayToken: 'trace_component_usage_render_guard',
          snapshotId: 'snap_component_usage_render_guard'
        },
        citations: []
      },
      askSummary: 'Component usage lookup grounded by 4 citation(s).',
      askTrust: 'trusted',
      askProofId: 'proof_component_usage_render_guard',
      askReplayToken: 'trace_component_usage_render_guard',
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

  assert.match(componentMarkup, /<strong class="packet-value path-value">Flow:Flow_With_A_Very_Long_Component_Name_And_Metadata_Arg_Syntax__mdt<\/strong>/);
  assert.match(componentMarkup, /<strong class="packet-value path-value">Flow_With_A_Very_Long_Component_Family_Label<\/strong>/);
  assert.match(componentMarkup, /<p class="path-value">Definition anchor: C:\\Users\\sean\\Projects\\GitHub\\Orgumented\\force-app\\main\\default\\flows\\Flow_With_A_Very_Long_Component_Name_And_Metadata_Arg_Syntax__mdt\.flow-meta\.xml<\/p>/);
  assert.match(componentMarkup, /<li class="path-value">C:\\Users\\sean\\Projects\\GitHub\\Orgumented\\force-app\\main\\default\\flows\\Flow_With_A_Very_Long_Component_Name_And_Metadata_Arg_Syntax__mdt\.flow-meta\.xml<\/li>/);

  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(css, /\.decision-card\s*\{[\s\S]*min-height:\s*100%;[\s\S]*min-width:\s*0;/);
  assert.match(css, /\.follow-up-grid > \*\s*\{[\s\S]*min-width:\s*0;/);
  assert.match(css, /\.proof-inline-list li\s*\{[\s\S]*overflow-wrap:\s*anywhere;[\s\S]*word-break:\s*break-word;/);
  assert.match(css, /\.packet-action-list li\s*\{[\s\S]*min-width:\s*0;[\s\S]*overflow-wrap:\s*anywhere;[\s\S]*word-break:\s*break-word;/);
  assert.match(css, /\.packet-action-label,[\s\S]*\.packet-action-rationale\s*\{[\s\S]*display:\s*block;[\s\S]*overflow-wrap:\s*anywhere;[\s\S]*word-break:\s*break-word;/);
}

run();

