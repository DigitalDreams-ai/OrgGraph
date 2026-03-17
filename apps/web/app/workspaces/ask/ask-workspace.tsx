'use client';

import type { AskPayload } from './types';
import type { MetadataRetrieveResultView, MetadataSelection } from '../browser/types';
import { buildRetrieveAwarePromptGroups } from './retrieve-aware-prompts';

interface AskWorkspaceProps {
  activeAlias: string;
  sessionStatus: string;
  buildVersion: string;
  latestRetrieve: MetadataRetrieveResultView | null;
  latestRetrieveSelections: MetadataSelection[];
  askQuery: string;
  setAskQuery: (value: string) => void;
  maxCitationsRaw: string;
  setMaxCitationsRaw: (value: string) => void;
  consistencyCheck: boolean;
  setConsistencyCheck: (checked: boolean) => void;
  includeLowConfidence: boolean;
  setIncludeLowConfidence: (checked: boolean) => void;
  askElaboration: string;
  askResult: AskPayload | null;
  askSummary: string;
  askTrust: string;
  askProofId: string;
  askReplayToken: string;
  askCitations: Array<{ sourcePath?: string; score?: number; snippet?: string }>;
  loading: boolean;
  trustTone: (trustLevel: string) => string;
  onRunAsk: () => void;
  onRunAskElaboration: () => void;
  onOpenConnect: () => void;
  onRefreshAliases: () => void;
  onOpenBrowser: () => void;
  onOpenRefresh: () => void;
  onInspectAutomation: () => void;
  onInspectPermissions: () => void;
  onOpenProof: () => void;
  onSaveToHistory: () => void;
}

const ASK_PRESETS = [
  'What touches Opportunity.StageName?',
  'Who can edit Opportunity.StageName?',
  'What automations update Opportunity.StageName?',
  'Should we approve changing Opportunity.StageName for jane@example.com?'
];

export function AskWorkspace(props: AskWorkspaceProps): JSX.Element {
  const retrieveAwarePrompts = buildRetrieveAwarePromptGroups(props.latestRetrieveSelections);
  const decisionPacket = props.askResult?.decisionPacket;
  const isFlowPacket = decisionPacket?.targetType === 'flow';
  const isComponentPacket = decisionPacket?.targetType === 'metadata_component';
  const isImpactPacket = decisionPacket?.kind === 'impact_assessment';
  const flowImpact = decisionPacket?.flowImpact;
  const componentUsage = decisionPacket?.componentUsage;
  const topAutomationNames = decisionPacket?.automationImpact?.topAutomationNames ?? [];
  const topImpactedSources = decisionPacket?.changeImpact?.topImpactedSources ?? [];
  const topReviewCitationSources = decisionPacket?.topCitationSources ?? [];
  const topCitationSources = flowImpact?.topCitationSources ?? [];
  const topReferenceSources = componentUsage?.topReferenceSources ?? [];
  const flowSignalsLabel =
    typeof flowImpact?.readFieldCount === 'number' && typeof flowImpact?.writeFieldCount === 'number'
      ? `${flowImpact.readFieldCount} read / ${flowImpact.writeFieldCount} write`
      : 'n/a';
  const flowScopeLabel =
    typeof flowImpact?.referencedObjectCount === 'number' ? `${flowImpact.referencedObjectCount} objects` : 'n/a';
  const componentSignalsLabel =
    typeof componentUsage?.referenceHitCount === 'number' && typeof componentUsage?.sourceFileCount === 'number'
      ? `${componentUsage.referenceHitCount} refs / ${componentUsage.sourceFileCount} files`
      : 'n/a';
  const impactSignalsLabel =
    typeof decisionPacket?.changeImpact?.impactPathCount === 'number'
      ? `${decisionPacket.changeImpact.impactPathCount} paths`
      : 'n/a';
  const impactScopeLabel =
    decisionPacket?.sourceMode === 'latest_retrieve'
      ? 'latest retrieve'
      : decisionPacket?.sourceMode === 'graph_global'
        ? 'semantic state'
        : 'n/a';
  return (
    <>
      <h2>Ask</h2>
      <p className="section-lead">Ask architecture questions in natural language, then move through proof, trust, and follow-up actions without leaving the desktop shell.</p>

      <div className="launch-grid">
        <article className="sub-card launch-card launch-card-accent">
          <p className="panel-caption">Current launch state</p>
          <h3>Ask-first desktop runtime</h3>
          <p className="launch-copy">The main window opens on Ask, with session health, trust, and recovery actions visible before any deep operator workflow.</p>
          <div className="launch-stat-grid">
            <div className="hero-metric">
              <span>Active alias</span>
              <strong>{props.activeAlias}</strong>
            </div>
            <div className="hero-metric">
              <span>Session</span>
              <strong>{props.sessionStatus}</strong>
            </div>
            <div className="hero-metric">
              <span>Trust state</span>
              <strong>{props.askTrust}</strong>
            </div>
            <div className="hero-metric">
              <span>Build</span>
              <strong>{props.buildVersion}</strong>
            </div>
          </div>
        </article>

        <article className="sub-card launch-card">
          <p className="panel-caption">Quick actions</p>
          <h3>Next operator move</h3>
          <div className="quick-actions-grid">
            <button type="button" className="ghost" onClick={props.onOpenConnect}>Connect org</button>
            <button type="button" className="ghost" onClick={props.onRefreshAliases} disabled={props.loading}>Refresh aliases</button>
            <button type="button" className="ghost" onClick={props.onOpenBrowser}>Browse metadata</button>
            <button type="button" className="ghost" onClick={props.onOpenRefresh}>Run refresh</button>
          </div>
        </article>

        <article className="sub-card launch-card">
          <p className="panel-caption">Latest retrieve</p>
          <h3>Ask only from current retrieved evidence</h3>
          {props.latestRetrieve ? (
            <>
              <p><strong>Alias:</strong> {props.latestRetrieve.alias || 'n/a'}</p>
              <p><strong>Completed:</strong> {props.latestRetrieve.completedAt || 'n/a'}</p>
              <p><strong>Metadata args:</strong> {props.latestRetrieve.metadataArgs.join(', ') || 'n/a'}</p>
              <p><strong>Parse path:</strong> <span className="path-value">{props.latestRetrieve.parsePath || 'n/a'}</span></p>
              {retrieveAwarePrompts.groundedPrompts.length > 0 ? (
                <>
                  <p className="muted"><strong>Grounded prompts from latest retrieve:</strong> these stay tied to retrieved Flow, Layout, Apex, CustomObject, CustomField, Email Template, and Tab members that Ask can answer from scoped retrieve evidence today.</p>
                  <div className="preset-row">
                    {retrieveAwarePrompts.groundedPrompts.map((preset) => (
                      <button key={preset} type="button" className="ghost chip-btn" onClick={() => props.setAskQuery(preset)}>
                        {preset}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="muted">No retrieve-grounded Ask prompts are staged yet. Use Org Browser to retrieve a specific Flow, Layout, Apex, CustomObject, CustomField, Email Template, or Tab member, then Ask from that grounded retrieve.</p>
              )}
              {retrieveAwarePrompts.followUpPrompts.length > 0 ? (
                <>
                  <p className="muted"><strong>Follow-up prompts from retrieved items:</strong> these are still broader semantic-state prompts and are not restricted to the latest retrieve unless the prompt says so.</p>
                  <div className="preset-row">
                    {retrieveAwarePrompts.followUpPrompts.map((preset) => (
                      <button key={preset} type="button" className="ghost chip-btn" onClick={() => props.setAskQuery(preset)}>
                        {preset}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <p className="muted">
                <strong>Scope rule:</strong> `latest retrieve` is enforced for explicit Flow read/write prompts, explicit retrieved field/object impact or automation prompts, and bounded metadata-component usage lookup prompts. Permission asks still use the current semantic state unless they say otherwise.
              </p>
              {props.latestRetrieveSelections.length > 0 ? (
                <p className="muted">
                  Retrieved selection scope: {props.latestRetrieveSelections.map((selection) => selection.type).join(', ')}.
                </p>
              ) : null}
              {retrieveAwarePrompts.groundedPrompts.length === 0 &&
              retrieveAwarePrompts.followUpPrompts.length === 0 ? (
                <p className="muted">No member-level retrieve prompts are available yet. Retrieve specific Flow, Layout, Apex, CustomObject, CustomField, Email Template, or Tab members from Org Browser first.</p>
              ) : null}
            </>
          ) : (
            <p className="muted">No retrieve handoff found yet. Use Org Browser, check the metadata you want, run Retrieve Cart, then Ask from that grounded retrieve.</p>
          )}
        </article>
      </div>

      <div className="decision-grid">
        <article className="sub-card decision-card decision-card-wide">
          <p className="panel-caption">Question composer</p>
          <label htmlFor="askQuery">Question</label>
          <textarea
            id="askQuery"
            rows={5}
            value={props.askQuery}
            onChange={(e) => props.setAskQuery(e.target.value)}
            placeholder="What touches Opportunity.StageName?"
          />

          <div className="field-grid ask-controls">
            <div>
              <label htmlFor="maxCitations">Max Citations</label>
              <input
                id="maxCitations"
                value={props.maxCitationsRaw}
                onChange={(e) => props.setMaxCitationsRaw(e.target.value)}
              />
            </div>
            <label className="check-row" htmlFor="consistencyCheck">
              <input
                id="consistencyCheck"
                type="checkbox"
                checked={props.consistencyCheck}
                onChange={(e) => props.setConsistencyCheck(e.target.checked)}
              />
              Consistency Check
            </label>
            <label className="check-row" htmlFor="includeLowConfidence">
              <input
                id="includeLowConfidence"
                type="checkbox"
                checked={props.includeLowConfidence}
                onChange={(e) => props.setIncludeLowConfidence(e.target.checked)}
              />
              Include Low Confidence
            </label>
          </div>

          <div className="action-row">
            <button type="button" onClick={props.onRunAsk} disabled={props.loading}>Run Ask</button>
            <button type="button" onClick={props.onRunAskElaboration} disabled={props.loading}>Generate Elaboration</button>
          </div>

          <div className="preset-row">
            {ASK_PRESETS.map((preset) => (
              <button key={preset} type="button" className="ghost chip-btn" onClick={() => props.setAskQuery(preset)}>
                {preset}
              </button>
            ))}
          </div>
        </article>

        <article className="sub-card decision-card decision-card-accent">
          <p className="panel-caption">Decision packet</p>
          <h3>Short answer</h3>
          <p className="decision-answer" role="status" aria-live="polite">
            {props.askSummary}
          </p>
          <div className="decision-meta">
            <span className={`decision-badge ${props.trustTone(props.askTrust)}`}>Trust: {props.askTrust}</span>
            <span className="decision-badge muted">Confidence: {typeof props.askResult?.confidence === 'number' ? props.askResult.confidence : 'n/a'}</span>
            {typeof props.askResult?.decisionPacket?.riskScore === 'number' ? (
              <span className="decision-badge muted">Risk score: {props.askResult.decisionPacket.riskScore}</span>
            ) : null}
            {props.askResult?.decisionPacket?.riskLevel ? (
              <span className="decision-badge muted">Risk: {props.askResult.decisionPacket.riskLevel}</span>
            ) : null}
          </div>
          {decisionPacket ? (
            <div className="packet-section-stack">
              <div className="packet-stat-grid">
                <div className="packet-stat">
                  <span>Workflow</span>
                  <strong className="packet-value">{decisionPacket.focus || 'review'}</strong>
                </div>
                <div className="packet-stat">
                  <span>Target</span>
                  <strong className={`packet-value${isFlowPacket || isComponentPacket ? ' path-value' : ''}`}>
                    {decisionPacket.targetLabel || 'n/a'}
                  </strong>
                </div>
                <div className="packet-stat">
                  <span>
                    {isFlowPacket
                      ? 'Flow signals'
                      : isComponentPacket
                        ? 'Usage signals'
                        : isImpactPacket
                          ? 'Impact signals'
                          : 'Permission model'}
                  </span>
                  <strong className="packet-value path-value">
                    {isFlowPacket
                      ? flowSignalsLabel
                      : isComponentPacket
                        ? componentSignalsLabel
                        : isImpactPacket
                          ? impactSignalsLabel
                          : decisionPacket.permissionImpact?.user || 'n/a'}
                  </strong>
                </div>
              </div>

              <div>
                <h4>Top risk drivers</h4>
                <p className="muted">
                  Evidence coverage: {decisionPacket.evidenceCoverage?.citationCount ?? 0} citations,
                  permissions {decisionPacket.evidenceCoverage?.hasPermissionPaths ? 'yes' : 'no'},
                  automation {decisionPacket.evidenceCoverage?.hasAutomationCoverage ? 'yes' : 'no'},
                  impact {decisionPacket.evidenceCoverage?.hasImpactPaths ? 'yes' : 'no'}.
                </p>
                <ul className="proof-inline-list">
                  {(decisionPacket.topRiskDrivers || []).map((driver) => (
                    <li key={driver}>{driver}</li>
                  ))}
                </ul>
              </div>

              <div className="packet-stat-grid">
                <div className="packet-stat">
                  <span>{isComponentPacket ? 'Lookup status' : 'Recommendation'}</span>
                  <strong className="packet-value">
                    {decisionPacket.recommendation?.verdict || 'n/a'}
                  </strong>
                  <p>{decisionPacket.recommendation?.summary || 'No recommendation returned.'}</p>
                </div>
                {isFlowPacket ? (
                  <>
                    <div className="packet-stat">
                      <span>Reads</span>
                      <strong className="packet-value">{flowImpact?.readFieldCount ?? 'n/a'} fields</strong>
                      <p>{flowImpact?.summaries?.reads || 'No read summary returned.'}</p>
                    </div>
                    <div className="packet-stat">
                      <span>Writes</span>
                      <strong className="packet-value">{flowImpact?.writeFieldCount ?? 'n/a'} fields</strong>
                      <p>{flowImpact?.summaries?.writes || 'No write summary returned.'}</p>
                    </div>
                    <div className="packet-stat">
                      <span>Flow scope</span>
                      <strong className="packet-value">{flowScopeLabel}</strong>
                      <p>
                        {flowImpact?.summaries?.readObjects || 'read objects unavailable'};{' '}
                        {flowImpact?.summaries?.writeObjects || 'write objects unavailable'};{' '}
                        {flowImpact?.summaries?.triggerTypes || 'trigger types unavailable'}
                      </p>
                    </div>
                  </>
                ) : isComponentPacket ? (
                  <>
                    <div className="packet-stat">
                      <span>References</span>
                      <strong className="packet-value">{componentUsage?.referenceHitCount ?? 'n/a'} hits</strong>
                      <p>{componentUsage?.summaries?.references || 'No reference summary returned.'}</p>
                    </div>
                    <div className="packet-stat">
                      <span>Coverage</span>
                      <strong className="packet-value">{componentUsage?.sourceFileCount ?? 'n/a'} files</strong>
                      <p>{componentUsage?.summaries?.coverage || 'No coverage summary returned.'}</p>
                    </div>
                    <div className="packet-stat">
                      <span>Component family</span>
                      <strong className="packet-value path-value">{componentUsage?.summaries?.family || 'n/a'}</strong>
                      <p className="path-value">{componentUsage?.summaries?.definition || 'No definition summary returned.'}</p>
                    </div>
                  </>
                ) : isImpactPacket ? (
                  <>
                    <div className="packet-stat">
                      <span>Impact paths</span>
                      <strong className="packet-value">{decisionPacket.changeImpact?.impactPathCount ?? 'n/a'} paths</strong>
                      <p>{decisionPacket.changeImpact?.summary || 'No impact summary returned.'}</p>
                    </div>
                    <div className="packet-stat">
                      <span>Scope</span>
                      <strong className="packet-value">{impactScopeLabel}</strong>
                      <p>
                        Evidence coverage: {decisionPacket.evidenceCoverage?.citationCount ?? 0} citation(s);
                        impact {decisionPacket.evidenceCoverage?.hasImpactPaths ? 'present' : 'absent'}.
                      </p>
                    </div>
                    <div className="packet-stat">
                      <span>Top sources</span>
                      <strong className="packet-value">{topImpactedSources.length || 'n/a'}</strong>
                      <p>
                        {topImpactedSources.length > 0
                          ? topImpactedSources.join(', ')
                          : 'No impacted source spotlight returned.'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="packet-stat">
                      <span>Permissions</span>
                      <strong className="packet-value">{decisionPacket.permissionImpact?.pathCount ?? 'n/a'} paths</strong>
                      <p>{decisionPacket.permissionImpact?.summary || 'No permission summary returned.'}</p>
                    </div>
                    <div className="packet-stat">
                      <span>Automation</span>
                      <strong className="packet-value">{decisionPacket.automationImpact?.automationCount ?? 'n/a'} items</strong>
                      <p>{decisionPacket.automationImpact?.summary || 'No automation summary returned.'}</p>
                    </div>
                    <div className="packet-stat">
                      <span>Change impact</span>
                      <strong className="packet-value">{decisionPacket.changeImpact?.impactPathCount ?? 'n/a'} paths</strong>
                      <p>{decisionPacket.changeImpact?.summary || 'No impact summary returned.'}</p>
                    </div>
                  </>
                )}
              </div>

              {decisionPacket.evidenceGaps?.length ? (
                <div>
                  <h4>Evidence gaps</h4>
                  <ul className="proof-inline-list">
                    {decisionPacket.evidenceGaps.map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {decisionPacket.nextActions?.length ? (
                <div>
                  <h4>Operator next actions</h4>
                  <ul className="packet-action-list">
                    {decisionPacket.nextActions.map((action, index) => (
                      <li key={`${action.label || 'action'}-${index}`}>
                        <strong className="packet-action-label">{action.label || 'Suggested action'}</strong>
                        <p className="packet-action-rationale">{action.rationale || 'No rationale returned.'}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {isFlowPacket && topCitationSources.length > 0 ? (
                <div>
                  <h4>Source spotlight</h4>
                  <ul className="proof-inline-list">
                    {topCitationSources.map((source) => (
                      <li key={source} className="path-value">{source}</li>
                    ))}
                  </ul>
                </div>
              ) : isComponentPacket && topReferenceSources.length > 0 ? (
                <div>
                  <h4>Source spotlight</h4>
                  <ul className="proof-inline-list">
                    {topReferenceSources.map((source) => (
                      <li key={source} className="path-value">{source}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!isFlowPacket && !isImpactPacket && (topAutomationNames.length > 0 || topImpactedSources.length > 0 || topReviewCitationSources.length > 0) ? (
                <div>
                  <h4>Grounding spotlight</h4>
                  {topReviewCitationSources.length > 0 ? (
                    <>
                      <p className="muted">Top citation sources</p>
                      <ul className="proof-inline-list">
                        {topReviewCitationSources.map((source) => (
                          <li key={source} className="path-value">{source}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {topAutomationNames.length > 0 ? (
                    <>
                      <p className="muted">Top automation names</p>
                      <ul className="proof-inline-list">
                        {topAutomationNames.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {topImpactedSources.length > 0 ? (
                    <>
                      <p className="muted">Top impacted sources</p>
                      <ul className="proof-inline-list">
                        {topImpactedSources.map((source) => (
                          <li key={source} className="path-value">{source}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {props.askElaboration ? (
            <>
              <h4>Deterministic explanation</h4>
              <p>{props.askElaboration}</p>
            </>
          ) : (
            <p className="muted">Run elaboration when you want a longer explanation built from the same grounded answer.</p>
          )}
        </article>

        <article className="sub-card decision-card">
          <p className="panel-caption">Supporting detail</p>
          <h3>Proof and evidence</h3>
          <p className="muted">
            The packet above is the primary artifact. Expand these sections only when you need proof identifiers or raw citation detail.
          </p>
          <details className="debug-details">
            <summary>Proof context</summary>
            <p><strong>Workflow:</strong> {props.askResult?.decisionPacket?.kind || props.askResult?.decisionPacket?.focus || 'standard ask'}</p>
            <p><strong>Policy:</strong> <span className="path-value">{props.askResult?.policy?.policyId || 'n/a'}</span></p>
            <p><strong>Proof ID:</strong> <span className="path-value">{props.askProofId || 'n/a'}</span></p>
            <p><strong>Replay token:</strong> <span className="path-value">{props.askReplayToken || 'n/a'}</span></p>
            <p><strong>Snapshot:</strong> <span className="path-value">{props.askResult?.proof?.snapshotId || 'n/a'}</span></p>
          </details>
          <details className="debug-details">
            <summary>Citations ({props.askCitations.length})</summary>
            {props.askCitations.length > 0 ? (
              <ul className="citation-list">
                {props.askCitations.map((citation, index) => (
                  <li key={`${citation.sourcePath || 'citation'}-${index}`} className="citation-item">
                    <strong className="citation-source">{citation.sourcePath || `citation-${index + 1}`}</strong>
                    <span>score {typeof citation.score === 'number' ? citation.score : 'n/a'}</span>
                    <p className="citation-snippet">{citation.snippet || 'No snippet returned.'}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Run Ask to populate grounded evidence.</p>
            )}
          </details>
        </article>

        <article className="sub-card decision-card">
          <p className="panel-caption">Workflow controls</p>
          <h3>Open related workflows</h3>
          <p className="muted">
            Use these controls to inspect the grounded evidence, jump to the relevant workspace, or persist the current packet.
          </p>
          <div className="follow-up-grid">
            {isComponentPacket ? (
              <>
                <button type="button" className="ghost" onClick={props.onOpenBrowser}>
                  Open Org Browser
                </button>
                <button type="button" className="ghost" onClick={props.onOpenRefresh}>
                  Open Refresh &amp; Build
                </button>
              </>
            ) : isImpactPacket ? (
              <>
                <button type="button" className="ghost" onClick={props.onInspectAutomation}>
                  Inspect impact paths
                </button>
                <button type="button" className="ghost" onClick={props.onOpenRefresh}>
                  Open Refresh &amp; Build
                </button>
              </>
            ) : (
              <>
                <button type="button" className="ghost" onClick={props.onInspectAutomation}>
                  Inspect impacted automation
                </button>
                <button type="button" className="ghost" onClick={props.onInspectPermissions}>
                  Inspect permissions
                </button>
              </>
            )}
            <button type="button" className="ghost" onClick={props.onOpenProof}>
              Open proof
            </button>
            <button type="button" className="ghost" onClick={props.onSaveToHistory}>
              Save to history
            </button>
          </div>
        </article>
      </div>
    </>
  );
}
