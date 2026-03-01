'use client';

import type { AskPayload } from '../workspaces/ask/types';
import type { OrgPreflightPayload, OrgSessionPayload, OrgStatusPayload } from '../workspaces/connect/types';

interface OperatorRailProps {
  copied: boolean;
  responseText: string;
  errorText: string;
  readyDetails: string;
  askSummary: string;
  askTrust: string;
  askResult: AskPayload | null;
  askProofId: string;
  askReplayToken: string;
  sessionStatus: string;
  activeAlias: string;
  orgSession: OrgSessionPayload | null;
  orgStatus: OrgStatusPayload | null;
  orgPreflight: OrgPreflightPayload | null;
  onCopy: () => void;
}

export function OperatorRail(props: OperatorRailProps): JSX.Element {
  return (
    <aside className="right-rail panel">
      <div className="rail-head">
        <h2>Operator Rail</h2>
        <button type="button" onClick={props.onCopy} disabled={!props.responseText}>
          {props.copied ? 'Copied' : 'Copy Response'}
        </button>
      </div>

      {props.errorText ? <p className="error-text">{props.errorText}</p> : null}

      <div className="sub-card">
        <h3>Ask Snapshot</h3>
        <p>{props.askSummary}</p>
      </div>

      <div className="sub-card">
        <h3>Trust Envelope</h3>
        <p><strong>Trust:</strong> {props.askTrust}</p>
        <p><strong>Confidence:</strong> {typeof props.askResult?.confidence === 'number' ? props.askResult.confidence : 'n/a'}</p>
        <p><strong>Policy ID:</strong> {props.askResult?.policy?.policyId || 'n/a'}</p>
        <p><strong>Proof ID:</strong> {props.askProofId || 'n/a'}</p>
        <p><strong>Replay Token:</strong> {props.askReplayToken || 'n/a'}</p>
      </div>

      <div className="sub-card">
        <h3>Connection</h3>
        <p><strong>Session:</strong> {props.sessionStatus}</p>
        <p><strong>Alias:</strong> {props.activeAlias}</p>
        <p><strong>Auth Mode:</strong> {props.orgSession?.authMode || props.orgStatus?.authMode || 'sf_cli_keychain'}</p>
        <p><strong>sf Installed:</strong> {props.orgStatus?.sf?.installed ? 'yes' : 'no'}</p>
        <p><strong>CCI Installed:</strong> {props.orgStatus?.cci?.installed ? 'yes' : 'no'}</p>
      </div>

      {props.orgPreflight?.issues && props.orgPreflight.issues.length > 0 ? (
        <div className="sub-card warn">
          <h3>Preflight Issues</h3>
          <ul>
            {props.orgPreflight.issues.slice(0, 5).map((issue, idx) => (
              <li key={`${issue.code || 'issue'}-${idx}`}>
                <strong>{issue.severity?.toUpperCase() || 'INFO'}:</strong> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <details>
        <summary>Raw JSON Inspector</summary>
        <pre>{props.responseText || '{\n  "hint": "Run an action to view response"\n}'}</pre>
      </details>

      {props.readyDetails ? (
        <details>
          <summary>Ready Details</summary>
          <pre>{props.readyDetails}</pre>
        </details>
      ) : null}
    </aside>
  );
}
