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
              label: 'Inspect the longest impacted automation path before approval',
              rationale:
                'This rationale is long enough to prove the follow-up list stays readable in the constrained Ask card layout.'
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

  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(css, /\.decision-card\s*\{[\s\S]*min-height:\s*100%;[\s\S]*min-width:\s*0;/);
  assert.match(css, /\.follow-up-grid > \*\s*\{[\s\S]*min-width:\s*0;/);
  assert.match(css, /\.proof-inline-list li\s*\{[\s\S]*overflow-wrap:\s*anywhere;[\s\S]*word-break:\s*break-word;/);
}

run();
