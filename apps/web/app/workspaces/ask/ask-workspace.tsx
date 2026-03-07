'use client';

import type { AskPayload } from './types';
import type { MetadataRetrieveResultView, MetadataSelection } from '../browser/types';

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

function buildRetrieveAwarePresets(
  latestRetrieveSelections: MetadataSelection[]
): string[] {
  const flowPrompts = latestRetrieveSelections
    .filter((selection) => selection.type === 'Flow' && Array.isArray(selection.members))
    .flatMap((selection) => selection.members ?? [])
    .slice(0, 3)
    .map((flowName) => `Based only on the latest retrieve, explain what Flow ${flowName} reads and writes.`);

  return Array.from(new Set(flowPrompts));
}

export function AskWorkspace(props: AskWorkspaceProps): JSX.Element {
  const retrieveAwarePresets = buildRetrieveAwarePresets(props.latestRetrieveSelections);
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
              {retrieveAwarePresets.length > 0 ? (
                <div className="preset-row">
                  {retrieveAwarePresets.map((preset) => (
                    <button key={preset} type="button" className="ghost chip-btn" onClick={() => props.setAskQuery(preset)}>
                      {preset}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">No retrieved Flow member is staged yet. Use Org Browser to retrieve a specific flow, then Ask from that retrieve.</p>
              )}
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
          <p className="decision-answer">{props.askSummary}</p>
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
          {props.askResult?.decisionPacket ? (
            <div className="packet-section-stack">
              <div className="packet-stat-grid">
                <div className="packet-stat">
                  <span>Workflow</span>
                  <strong className="packet-value">{props.askResult.decisionPacket.focus || 'review'}</strong>
                </div>
                <div className="packet-stat">
                  <span>Target</span>
                  <strong className="packet-value">{props.askResult.decisionPacket.targetLabel || 'n/a'}</strong>
                </div>
                <div className="packet-stat">
                  <span>Permission model</span>
                  <strong className="packet-value path-value">{props.askResult.decisionPacket.permissionImpact?.user || 'n/a'}</strong>
                </div>
              </div>

              <div>
                <h4>Top risk drivers</h4>
                <p className="muted">
                  Evidence coverage: {props.askResult.decisionPacket.evidenceCoverage?.citationCount ?? 0} citations,
                  permissions {props.askResult.decisionPacket.evidenceCoverage?.hasPermissionPaths ? 'yes' : 'no'},
                  automation {props.askResult.decisionPacket.evidenceCoverage?.hasAutomationCoverage ? 'yes' : 'no'},
                  impact {props.askResult.decisionPacket.evidenceCoverage?.hasImpactPaths ? 'yes' : 'no'}.
                </p>
                <ul className="proof-inline-list">
                  {(props.askResult.decisionPacket.topRiskDrivers || []).map((driver) => (
                    <li key={driver}>{driver}</li>
                  ))}
                </ul>
              </div>

              <div className="packet-stat-grid">
                <div className="packet-stat">
                  <span>Permissions</span>
                  <strong className="packet-value">{props.askResult.decisionPacket.permissionImpact?.pathCount ?? 'n/a'} paths</strong>
                  <p>{props.askResult.decisionPacket.permissionImpact?.summary || 'No permission summary returned.'}</p>
                </div>
                <div className="packet-stat">
                  <span>Automation</span>
                  <strong className="packet-value">{props.askResult.decisionPacket.automationImpact?.automationCount ?? 'n/a'} items</strong>
                  <p>{props.askResult.decisionPacket.automationImpact?.summary || 'No automation summary returned.'}</p>
                </div>
                <div className="packet-stat">
                  <span>Change impact</span>
                  <strong className="packet-value">{props.askResult.decisionPacket.changeImpact?.impactPathCount ?? 'n/a'} paths</strong>
                  <p>{props.askResult.decisionPacket.changeImpact?.summary || 'No impact summary returned.'}</p>
                </div>
              </div>
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
          <p className="panel-caption">Proof context</p>
          <h3>Why this answer is trusted</h3>
          <p><strong>Workflow:</strong> {props.askResult?.decisionPacket?.kind || props.askResult?.decisionPacket?.focus || 'standard ask'}</p>
          <p><strong>Policy:</strong> <span className="path-value">{props.askResult?.policy?.policyId || 'n/a'}</span></p>
          <p><strong>Proof ID:</strong> <span className="path-value">{props.askProofId || 'n/a'}</span></p>
          <p><strong>Replay token:</strong> <span className="path-value">{props.askReplayToken || 'n/a'}</span></p>
          <p><strong>Snapshot:</strong> <span className="path-value">{props.askResult?.proof?.snapshotId || 'n/a'}</span></p>
        </article>

        <article className="sub-card decision-card">
          <p className="panel-caption">Evidence</p>
          <h3>Citations</h3>
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
        </article>

        <article className="sub-card decision-card">
          <p className="panel-caption">Follow-up actions</p>
          <h3>Next actions</h3>
          {props.askResult?.decisionPacket?.nextActions?.length ? (
            <ul className="packet-action-list">
              {props.askResult.decisionPacket.nextActions.map((action, index) => (
                <li key={`${action.label || 'action'}-${index}`}>
                  <strong>{action.label || 'Suggested action'}</strong>
                  <p>{action.rationale || 'No rationale returned.'}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="follow-up-grid">
            <button type="button" className="ghost" onClick={props.onInspectAutomation}>
              Inspect impacted automation
            </button>
            <button type="button" className="ghost" onClick={props.onInspectPermissions}>
              Inspect permissions
            </button>
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
