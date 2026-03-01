'use client';

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
  selectedProof: ProofArtifactView | null;
  replayResult: ReplayResultView | null;
  metricsExport: MetricsExportView | null;
  loading: boolean;
  onListRecent: () => void;
  onGetProof: () => void;
  onReplay: () => void;
  onExportMetrics: () => void;
  onUseRecentProof: (proof: RecentProofItem) => void;
}

export function ProofsWorkspace(props: ProofsWorkspaceProps): JSX.Element {
  return (
    <>
      <h2>Proofs &amp; History</h2>
      <p className="section-lead">
        Inspect deterministic proof artifacts, replay parity, and trust history without treating raw tokens as the primary workflow.
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

      <div className="action-row">
        <button type="button" onClick={props.onListRecent} disabled={props.loading}>List Recent Proofs</button>
        <button type="button" onClick={props.onGetProof} disabled={props.loading || !props.proofId.trim()}>Get Proof</button>
        <button
          type="button"
          onClick={props.onReplay}
          disabled={props.loading || (!props.proofId.trim() && !props.replayToken.trim())}
        >
          Replay Proof
        </button>
        <button type="button" onClick={props.onExportMetrics} disabled={props.loading}>Export Metrics</button>
      </div>

      <div className="proofs-grid">
        <article className="sub-card">
          <p className="panel-caption">Recent proofs</p>
          <h3>Latest decision artifacts</h3>
          {props.recentProofs.length > 0 ? (
            <ul className="proof-list">
              {props.recentProofs.slice(0, 5).map((proof) => (
                <li key={proof.proofId} className="proof-list-item">
                  <div>
                    <strong>{proof.query || proof.proofId}</strong>
                    <p><strong>Trust:</strong> {proof.trustLevel} <strong>Snapshot:</strong> {proof.snapshotId}</p>
                    <p><strong>Generated:</strong> {proof.generatedAt || 'n/a'}</p>
                  </div>
                  <button type="button" className="ghost" onClick={() => props.onUseRecentProof(proof)}>
                    Use
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Run “List Recent Proofs” to inspect recent decision artifacts.</p>
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
              <p><strong>Proof ID:</strong> {props.selectedProof.proofId}</p>
              <p><strong>Replay Token:</strong> {props.selectedProof.replayToken}</p>
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
            <p className="muted">Run “Get Proof” to load the selected proof artifact into a structured view.</p>
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
            <p className="muted">Run “Replay Proof” to compare the stored proof against a fresh deterministic replay.</p>
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
            <p className="muted">Run “Export Metrics” to inspect trust history by snapshot and provider.</p>
          )}
        </article>
      </div>
    </>
  );
}
