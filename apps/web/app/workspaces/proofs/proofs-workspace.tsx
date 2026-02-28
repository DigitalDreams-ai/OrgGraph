'use client';

interface ProofsWorkspaceProps {
  proofId: string;
  setProofId: (value: string) => void;
  replayToken: string;
  setReplayToken: (value: string) => void;
  loading: boolean;
  onListRecent: () => void;
  onGetProof: () => void;
  onReplay: () => void;
  onExportMetrics: () => void;
}

export function ProofsWorkspace(props: ProofsWorkspaceProps): JSX.Element {
  return (
    <>
      <h2>Proofs &amp; History</h2>
      <p className="section-lead">Inspect deterministic proof artifacts, replay tokens, and history exports without managing raw tokens as the primary workflow.</p>

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
    </>
  );
}
