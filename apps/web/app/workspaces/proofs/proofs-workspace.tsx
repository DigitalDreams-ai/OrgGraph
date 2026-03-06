'use client';

import { useMemo, useState } from 'react';
import type {
  MetricsExportView,
  ProofArtifactView,
  RecentProofItem,
  ReplayResultView
} from './types';

interface ProofsWorkspaceProps {
  proofId: string;
  setProofId: (value: string) => void;
  replayToken: string;
  setReplayToken: (value: string) => void;
  recentProofs: RecentProofItem[];
  selectedRecentProof: RecentProofItem | null;
  selectedProof: ProofArtifactView | null;
  replayResult: ReplayResultView | null;
  metricsExport: MetricsExportView | null;
  loading: boolean;
  onListRecent: () => void;
  onGetProof: () => void;
  onReplay: () => void;
  onExportMetrics: () => void;
  onExportProofArtifact: () => void;
  onExportReplayArtifact: () => void;
  onOpenRecentProof: (proof: RecentProofItem) => void;
  onReplayRecentProof: (proof: RecentProofItem) => void;
}

export function ProofsWorkspace(props: ProofsWorkspaceProps): JSX.Element {
  const [historySearch, setHistorySearch] = useState('');
  const filteredRecentProofs = useMemo(() => {
    const search = historySearch.trim().toLowerCase();
    if (!search) {
      return props.recentProofs;
    }
    return props.recentProofs.filter((proof) => {
      const haystack = `${proof.label} ${proof.subtitle} ${proof.query}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [historySearch, props.recentProofs]);

  return (
    <>
      <h2>Proofs &amp; History</h2>
      <p className="section-lead">
        Inspect deterministic proof artifacts, replay parity, and trust history through labeled decision history instead of leading with opaque tokens.
      </p>

      <div className="action-row">
        <button type="button" onClick={props.onListRecent} disabled={props.loading}>Refresh History</button>
        <button
          type="button"
          onClick={props.onGetProof}
          disabled={props.loading || (!props.selectedRecentProof?.proofId && !props.proofId.trim())}
        >
          Open Selected History
        </button>
        <button
          type="button"
          onClick={props.onReplay}
          disabled={
            props.loading ||
            (!props.selectedRecentProof?.proofId && !props.proofId.trim() && !props.replayToken.trim())
          }
        >
          Replay Selected History
        </button>
        <button
          type="button"
          className="ghost"
          onClick={props.onExportProofArtifact}
          disabled={props.loading || !props.selectedProof}
        >
          Export Selected Proof
        </button>
        <button
          type="button"
          className="ghost"
          onClick={props.onExportReplayArtifact}
          disabled={props.loading || !props.replayResult}
        >
          Export Selected Replay
        </button>
        <button type="button" onClick={props.onExportMetrics} disabled={props.loading}>Export Trust History</button>
      </div>

      <article className="sub-card">
        <p className="panel-caption">Current selection</p>
        <h3>Operator-facing history label</h3>
        {props.selectedRecentProof || props.selectedProof ? (
          <>
            <p>
              <strong>{props.selectedRecentProof?.label || props.selectedProof?.query || `Proof ${props.proofId.slice(0, 12)}`}</strong>
            </p>
            <p className="muted">
              {props.selectedRecentProof?.subtitle || `Trust ${props.selectedProof?.trustLevel || 'unknown'} • ${props.selectedProof?.snapshotId || 'snapshot n/a'}`}
            </p>
            <p className="muted">Tokens stay in the advanced section and are not required for normal history workflows.</p>
          </>
        ) : (
          <p className="muted">Select a recent decision artifact to inspect proof, replay parity, or trust history.</p>
        )}
      </article>

      <div className="proofs-grid">
        <article className="sub-card">
          <p className="panel-caption">History labels</p>
          <h3>Latest decision artifacts</h3>
          <label htmlFor="historySearch">Search History Labels</label>
          <input
            id="historySearch"
            placeholder="Opportunity.StageName, approval, flow name..."
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
          />
          {filteredRecentProofs.length > 0 ? (
            <ul className="proof-list">
              {filteredRecentProofs.slice(0, 20).map((proof) => (
                <li
                  key={proof.proofId}
                  className={`proof-list-item ${props.proofId === proof.proofId ? 'active' : ''}`.trim()}
                >
                  <div>
                    <strong>{proof.label}</strong>
                    <p>{proof.subtitle}</p>
                    <p><strong>Trust:</strong> {proof.trustLevel} <strong>Snapshot:</strong> {proof.snapshotId}</p>
                  </div>
                  <div className="proof-list-actions">
                    <button type="button" className="ghost" onClick={() => props.onOpenRecentProof(proof)}>
                      Open Label
                    </button>
                    <button type="button" className="ghost" onClick={() => props.onReplayRecentProof(proof)}>
                      Replay Label
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : props.recentProofs.length > 0 ? (
            <p className="muted">No history labels matched this search yet.</p>
          ) : (
            <p className="muted">Open this workspace to load recent decision history automatically, or use “Refresh History” if the runtime changed.</p>
          )}
        </article>

        <article className="sub-card">
          <p className="panel-caption">Proof artifact</p>
          <h3>Selected proof</h3>
          {props.selectedProof ? (
            <>
              <p><strong>Query:</strong> {props.selectedProof.query || 'n/a'}</p>
              <div className="decision-meta">
                <span className="decision-badge muted">Trust: {props.selectedProof.trustLevel}</span>
                <span className="decision-badge muted">Policy: {props.selectedProof.policyId}</span>
                <span className="decision-badge muted">Trace: {props.selectedProof.traceLevel}</span>
              </div>
              <p><strong>Snapshot:</strong> {props.selectedProof.snapshotId}</p>
              <p><strong>Generated:</strong> {props.selectedProof.generatedAt || 'n/a'}</p>
              <p><strong>Deterministic answer:</strong> {props.selectedProof.deterministicAnswer || 'n/a'}</p>
              <p><strong>Confidence:</strong> {typeof props.selectedProof.confidence === 'number' ? props.selectedProof.confidence : 'n/a'}</p>
              <p><strong>Operators:</strong> {props.selectedProof.operatorsExecuted.join(', ') || 'n/a'}</p>
              <p><strong>Rejected branches:</strong> {props.selectedProof.rejectedBranches.join(', ') || 'none'}</p>
              <p><strong>Citations:</strong> {props.selectedProof.citationCount}</p>
              <p><strong>Derivation edges:</strong> {props.selectedProof.derivationEdgeCount}</p>
            </>
          ) : (
            <p className="muted">Select a history label, then run “Open Selected History” to load a structured proof view.</p>
          )}
        </article>

        <article className="sub-card">
          <p className="panel-caption">Replay parity</p>
          <h3>Latest replay result</h3>
          {props.replayResult ? (
            <>
              <div className="decision-meta">
                <span className={`decision-badge ${props.replayResult.matched ? 'good' : 'bad'}`}>Matched: {String(props.replayResult.matched)}</span>
                <span className={`decision-badge ${props.replayResult.corePayloadMatched ? 'good' : 'bad'}`}>Core payload: {String(props.replayResult.corePayloadMatched)}</span>
                <span className={`decision-badge ${props.replayResult.metricsMatched ? 'good' : 'bad'}`}>Metrics: {String(props.replayResult.metricsMatched)}</span>
              </div>
              <p><strong>Policy:</strong> {props.replayResult.policyId}</p>
              <p><strong>Snapshot:</strong> {props.replayResult.snapshotId}</p>
              <p><strong>Original trust:</strong> {props.replayResult.original.trustLevel}</p>
              <p><strong>Replayed trust:</strong> {props.replayResult.replayed.trustLevel}</p>
              <p><strong>Original answer:</strong> {props.replayResult.original.deterministicAnswer || 'n/a'}</p>
              <p><strong>Replayed answer:</strong> {props.replayResult.replayed.deterministicAnswer || 'n/a'}</p>
            </>
          ) : (
            <p className="muted">Select a history label, then run “Replay Selected History” to compare deterministic replay parity.</p>
          )}
        </article>

        <article className="sub-card">
          <p className="panel-caption">Metrics export</p>
          <h3>Trust history summary</h3>
          {props.metricsExport ? (
            <>
              <p><strong>Total records:</strong> {props.metricsExport.totalRecords}</p>
              <div className="proof-metric-grid">
                <div>
                  <strong>By snapshot</strong>
                  <ul className="proof-inline-list">
                    {props.metricsExport.bySnapshot.slice(0, 3).map((snapshot) => (
                      <li key={snapshot.snapshotId}>
                        {snapshot.snapshotId}: {snapshot.count} asks, {snapshot.trusted} trusted, {snapshot.refused} refused
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>By provider</strong>
                  <ul className="proof-inline-list">
                    {props.metricsExport.byProvider.slice(0, 3).map((provider) => (
                      <li key={`${provider.provider}-${provider.model || 'default'}`}>
                        {provider.provider}{provider.model ? `/${provider.model}` : ''}: {provider.count} calls, error rate {provider.errorRate}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <p className="muted">Run “Export Trust History” to inspect trust history by snapshot and provider.</p>
          )}
        </article>
      </div>

      <details>
        <summary>Advanced token lookup</summary>
        <p className="muted">Keep raw proof identifiers available for debugging and parity checks, but do not treat them as the primary workflow.</p>
        <p className="muted">
          Selected proof IDs: <span className="path-value">{props.selectedProof?.proofId || props.proofId || 'n/a'}</span> • replay token:{' '}
          <span className="path-value">{props.selectedProof?.replayToken || props.replayToken || 'n/a'}</span>
        </p>
        <div className="field-grid">
          <div>
            <label htmlFor="proofId">Proof ID</label>
            <input id="proofId" value={props.proofId} onChange={(e) => props.setProofId(e.target.value)} />
          </div>
          <div>
            <label htmlFor="replayToken">Replay Token</label>
            <input id="replayToken" value={props.replayToken} onChange={(e) => props.setReplayToken(e.target.value)} />
          </div>
        </div>
      </details>
    </>
  );
}
