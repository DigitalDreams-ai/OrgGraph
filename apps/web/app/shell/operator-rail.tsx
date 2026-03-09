'use client';

import type { ReadyPayload } from './use-shell-runtime';
import type { AskPayload } from '../workspaces/ask/types';
import type { OrgPreflightPayload, OrgSessionPayload, OrgStatusPayload } from '../workspaces/connect/types';

interface OperatorRailProps {
  copied: boolean;
  responseText: string;
  errorText: string;
  readyDetails: string;
  readyPayload: ReadyPayload | null;
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
  runtimeUnavailable: boolean;
  runtimeBlocked: boolean;
  toolStatusSource: 'runtime_unavailable' | 'live' | 'unknown';
  onCopy: () => void;
}

function deriveRuntimeTriage(readyPayload: ReadyPayload | null): string[] {
  const checks = readyPayload?.checks;
  if (!checks) {
    if (readyPayload?.message) {
      return [readyPayload.message];
    }
    return ['Run Refresh Status to load runtime readiness checks.'];
  }

  const notes: string[] = [];
  if (checks.bootstrap?.ok === false) {
    notes.push(`Bootstrap failed: ${checks.bootstrap.message || checks.bootstrap.status || 'unknown status'}`);
  }
  if (checks.db?.ok === false) {
    notes.push(`Graph not grounded: nodes ${checks.db.nodeCount ?? 0}, edges ${checks.db.edgeCount ?? 0}.`);
  }
  if (checks.fixtures?.ok === false) {
    notes.push('Fixtures path missing. Run retrieve + refresh.');
  }
  if (checks.evidence?.ok === false) {
    notes.push('Evidence index missing. Run refresh and Ask once.');
  }
  if (notes.length === 0) {
    notes.push('Runtime checks healthy.');
  }
  return notes;
}

export function OperatorRail(props: OperatorRailProps): JSX.Element {
  const sessionLabel = props.runtimeUnavailable ? 'runtime unavailable' : props.sessionStatus;
  const sfInstalledLabel = props.runtimeUnavailable ? 'unavailable' : props.orgStatus?.sf?.installed ? 'yes' : props.orgStatus ? 'no' : 'unknown';
  const cciInstalledLabel = props.runtimeUnavailable ? 'unavailable' : props.orgStatus?.cci?.installed ? 'yes' : props.orgStatus ? 'no' : 'unknown';
  const toolSourceLabel =
    props.toolStatusSource === 'runtime_unavailable'
      ? 'runtime blocked'
      : props.toolStatusSource === 'live'
        ? 'live status'
        : 'status not loaded';
  const runtimeTriage = deriveRuntimeTriage(props.readyPayload);

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
        <p><strong>Session:</strong> {sessionLabel}</p>
        <p><strong>Alias:</strong> {props.activeAlias}</p>
        <p><strong>Auth Mode:</strong> {props.orgSession?.authMode || props.orgStatus?.authMode || 'sf_cli_keychain'}</p>
        <p><strong>sf Installed:</strong> {sfInstalledLabel}</p>
        <p><strong>CCI Installed:</strong> {cciInstalledLabel}</p>
        <p><strong>Tool Source:</strong> {toolSourceLabel}</p>
        <p><strong>Runtime Gate:</strong> {props.runtimeBlocked ? (props.runtimeUnavailable ? 'unreachable' : 'blocked') : 'ready'}</p>
      </div>

      <div className="sub-card">
        <h3>Runtime Triage</h3>
        <ul className="analysis-list">
          {runtimeTriage.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
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
