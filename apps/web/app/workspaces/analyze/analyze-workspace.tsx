'use client';

import type {
  AnalyzeMode,
  AutomationResult,
  GraphStep,
  ImpactResult,
  PermissionAnalysisResult,
  PermissionDiagnosisResult,
  SystemPermissionResult
} from './types';

interface AnalyzeWorkspaceProps {
  analyzeMode: AnalyzeMode;
  setAnalyzeMode: (value: AnalyzeMode) => void;
  user: string;
  setUser: (value: string) => void;
  objectName: string;
  setObjectName: (value: string) => void;
  fieldName: string;
  setFieldName: (value: string) => void;
  systemPermission: string;
  setSystemPermission: (value: string) => void;
  limitRaw: string;
  setLimitRaw: (value: string) => void;
  strictMode: boolean;
  setStrictMode: (value: boolean) => void;
  explainMode: boolean;
  setExplainMode: (value: boolean) => void;
  debugMode: boolean;
  setDebugMode: (value: boolean) => void;
  permissionsResult: PermissionAnalysisResult | null;
  permissionDiagnosis: PermissionDiagnosisResult | null;
  automationResult: AutomationResult | null;
  impactResult: ImpactResult | null;
  systemPermissionResult: SystemPermissionResult | null;
  loading: boolean;
  onRunPermissions: () => void;
  onDiagnoseUserMapping: () => void;
  onRunAutomation: () => void;
  onRunImpact: () => void;
  onRunSystemPermission: () => void;
}

function formatPath(path: GraphStep[]): string {
  return path.map((step) => `${step.from} -${step.rel}-> ${step.to}`).join(' | ');
}

function renderWarnings(warnings: string[]): JSX.Element | null {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="sub-card warn">
      <h3>Warnings</h3>
      <ul className="analysis-list">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

export function AnalyzeWorkspace(props: AnalyzeWorkspaceProps): JSX.Element {
  return (
    <>
      <h2>Explain &amp; Analyze</h2>
      <p className="section-lead">Deterministic permission, automation, and impact analysis with controlled strictness.</p>

      <div className="sub-tab-row" role="tablist" aria-label="Analyze sub tabs">
        <button
          type="button"
          className={props.analyzeMode === 'perms' ? 'sub-tab active' : 'sub-tab'}
          onClick={() => props.setAnalyzeMode('perms')}
        >
          Permissions
        </button>
        <button
          type="button"
          className={props.analyzeMode === 'automation' ? 'sub-tab active' : 'sub-tab'}
          onClick={() => props.setAnalyzeMode('automation')}
        >
          Automation
        </button>
        <button
          type="button"
          className={props.analyzeMode === 'impact' ? 'sub-tab active' : 'sub-tab'}
          onClick={() => props.setAnalyzeMode('impact')}
        >
          Impact
        </button>
        <button
          type="button"
          className={props.analyzeMode === 'system' ? 'sub-tab active' : 'sub-tab'}
          onClick={() => props.setAnalyzeMode('system')}
        >
          System Permission
        </button>
      </div>

      <div className="field-grid">
        <div>
          <label htmlFor="anUser">User</label>
          <input id="anUser" value={props.user} onChange={(e) => props.setUser(e.target.value)} />
        </div>
        <div>
          <label htmlFor="anObject">Object</label>
          <input id="anObject" value={props.objectName} onChange={(e) => props.setObjectName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="anField">Field</label>
          <input id="anField" value={props.fieldName} onChange={(e) => props.setFieldName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="anSystemPerm">System Permission</label>
          <input id="anSystemPerm" value={props.systemPermission} onChange={(e) => props.setSystemPermission(e.target.value)} />
        </div>
        <div>
          <label htmlFor="anLimit">Limit</label>
          <input id="anLimit" value={props.limitRaw} onChange={(e) => props.setLimitRaw(e.target.value)} />
        </div>
        <label className="check-row" htmlFor="strictMode">
          <input id="strictMode" type="checkbox" checked={props.strictMode} onChange={(e) => props.setStrictMode(e.target.checked)} />
          Strict Mode
        </label>
        <label className="check-row" htmlFor="explainMode">
          <input id="explainMode" type="checkbox" checked={props.explainMode} onChange={(e) => props.setExplainMode(e.target.checked)} />
          Explain Mode
        </label>
        <label className="check-row" htmlFor="debugMode">
          <input id="debugMode" type="checkbox" checked={props.debugMode} onChange={(e) => props.setDebugMode(e.target.checked)} />
          Debug Mode
        </label>
      </div>

      <div className="action-row">
        {props.analyzeMode === 'perms' ? (
          <>
            <button type="button" onClick={props.onRunPermissions} disabled={props.loading}>
              Run Permissions Analysis
            </button>
            <button type="button" className="ghost" onClick={props.onDiagnoseUserMapping} disabled={props.loading}>
              Diagnose User Mapping
            </button>
          </>
        ) : null}

        {props.analyzeMode === 'automation' ? (
          <button type="button" onClick={props.onRunAutomation} disabled={props.loading}>
            Run Automation Analysis
          </button>
        ) : null}

        {props.analyzeMode === 'impact' ? (
          <button type="button" onClick={props.onRunImpact} disabled={props.loading}>
            Run Impact Analysis
          </button>
        ) : null}

        {props.analyzeMode === 'system' ? (
          <button type="button" onClick={props.onRunSystemPermission} disabled={props.loading}>
            Run System Permission Check
          </button>
        ) : null}
      </div>

      {props.analyzeMode === 'perms' && props.permissionsResult ? (
        <div className="analysis-grid">
          <div className="sub-card">
            <p className="panel-caption">Permission verdict</p>
            <h3>{props.permissionsResult.field || props.permissionsResult.object}</h3>
            <div className="decision-meta">
              <span className={props.permissionsResult.granted ? 'decision-badge good' : 'decision-badge bad'}>
                {props.permissionsResult.granted ? 'Granted' : 'Not granted'}
              </span>
              <span className={props.permissionsResult.objectGranted ? 'decision-badge good' : 'decision-badge bad'}>
                Object {props.permissionsResult.objectGranted ? 'ready' : 'blocked'}
              </span>
              {props.permissionsResult.field ? (
                <span className={props.permissionsResult.fieldGranted ? 'decision-badge good' : 'decision-badge bad'}>
                  Field {props.permissionsResult.fieldGranted ? 'ready' : 'blocked'}
                </span>
              ) : null}
              <span className="decision-badge muted">{props.permissionsResult.mappingStatus}</span>
            </div>
            <div className="analysis-stat-grid">
              <div className="packet-stat">
                <span>Principals</span>
                <strong>{props.permissionsResult.principalsChecked.length}</strong>
              </div>
              <div className="packet-stat">
                <span>Visible paths</span>
                <strong>{props.permissionsResult.paths.length}</strong>
              </div>
              <div className="packet-stat">
                <span>Total paths</span>
                <strong>{props.permissionsResult.totalPaths}</strong>
              </div>
            </div>
            <p>{props.permissionsResult.explanation}</p>
          </div>

          <div className="sub-card">
            <p className="panel-caption">Principals checked</p>
            <h3>User mapping context</h3>
            <ul className="analysis-chip-list">
              {props.permissionsResult.principalsChecked.length > 0 ? (
                props.permissionsResult.principalsChecked.map((principal) => <li key={principal}>{principal}</li>)
              ) : (
                <li>No principals resolved for this user.</li>
              )}
            </ul>
          </div>

          <div className="sub-card analysis-grid-full">
            <p className="panel-caption">Deterministic path evidence</p>
            <h3>Permission paths</h3>
            <ul className="analysis-path-list">
              {props.permissionsResult.paths.length > 0 ? (
                props.permissionsResult.paths.map((item, index) => (
                  <li key={`${item.principal}-${index}`}>
                    <strong>{item.principal}</strong>
                    <p>{formatPath(item.path)}</p>
                  </li>
                ))
              ) : (
                <li>No deterministic permission path matched the request.</li>
              )}
            </ul>
          </div>

          {renderWarnings(props.permissionsResult.warnings)}
        </div>
      ) : null}

      {props.analyzeMode === 'perms' && props.permissionDiagnosis ? (
        <div className="analysis-grid">
          <div className="sub-card">
            <p className="panel-caption">Mapping diagnosis</p>
            <h3>{props.permissionDiagnosis.user}</h3>
            <div className="decision-meta">
              <span className={props.permissionDiagnosis.mapExists ? 'decision-badge good' : 'decision-badge bad'}>
                {props.permissionDiagnosis.mapExists ? 'Map present' : 'Map missing'}
              </span>
              <span className={props.permissionDiagnosis.stale ? 'decision-badge bad' : 'decision-badge good'}>
                {props.permissionDiagnosis.stale ? 'Stale map' : 'Fresh map'}
              </span>
              <span className="decision-badge muted">{props.permissionDiagnosis.mappingStatus}</span>
            </div>
            <div className="analysis-stat-grid">
              <div className="packet-stat">
                <span>Principals</span>
                <strong>{props.permissionDiagnosis.principals.length}</strong>
              </div>
              <div className="packet-stat">
                <span>Age hours</span>
                <strong>{props.permissionDiagnosis.mapAgeHours ?? 'n/a'}</strong>
              </div>
              <div className="packet-stat">
                <span>Stale after</span>
                <strong>{props.permissionDiagnosis.staleThresholdHours}</strong>
              </div>
            </div>
            <p>{props.permissionDiagnosis.mapPath}</p>
          </div>

          <div className="sub-card">
            <p className="panel-caption">Resolved principals</p>
            <h3>Mapping output</h3>
            <ul className="analysis-chip-list">
              {props.permissionDiagnosis.principals.length > 0 ? (
                props.permissionDiagnosis.principals.map((principal) => <li key={principal}>{principal}</li>)
              ) : (
                <li>No principals resolved.</li>
              )}
            </ul>
          </div>

          {renderWarnings(props.permissionDiagnosis.warnings)}
        </div>
      ) : null}

      {props.analyzeMode === 'automation' && props.automationResult ? (
        <div className="analysis-grid">
          <div className="sub-card">
            <p className="panel-caption">Automation summary</p>
            <h3>{props.automationResult.object}</h3>
            <div className="decision-meta">
              <span className="decision-badge muted">{props.automationResult.status}</span>
              <span className="decision-badge muted">strict {String(props.automationResult.strictMode)}</span>
              <span className="decision-badge muted">
                min confidence {props.automationResult.minConfidenceApplied}
              </span>
            </div>
            <div className="analysis-stat-grid">
              <div className="packet-stat">
                <span>Automations</span>
                <strong>{props.automationResult.automations.length}</strong>
              </div>
              <div className="packet-stat">
                <span>Total matched</span>
                <strong>{props.automationResult.totalAutomations}</strong>
              </div>
              <div className="packet-stat">
                <span>Relations checked</span>
                <strong>{props.automationResult.relationsChecked.length}</strong>
              </div>
            </div>
            <p>{props.automationResult.explanation}</p>
          </div>

          <div className="sub-card analysis-grid-full">
            <p className="panel-caption">Automation evidence</p>
            <h3>Matching automations</h3>
            <ul className="analysis-path-list">
              {props.automationResult.automations.length > 0 ? (
                props.automationResult.automations.map((item) => (
                  <li key={`${item.type}-${item.name}`}>
                    <strong>
                      {item.type}: {item.name}
                    </strong>
                    <p>
                      {item.rel} | confidence {item.confidence} | score {item.score.toFixed(2)}
                    </p>
                  </li>
                ))
              ) : (
                <li>No deterministic automation match found.</li>
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {props.analyzeMode === 'impact' && props.impactResult ? (
        <div className="analysis-grid">
          <div className="sub-card">
            <p className="panel-caption">Impact summary</p>
            <h3>{props.impactResult.field}</h3>
            <div className="decision-meta">
              <span className="decision-badge muted">strict {String(props.impactResult.strictMode)}</span>
              <span className="decision-badge muted">
                min confidence {props.impactResult.minConfidenceApplied}
              </span>
              <span className="decision-badge muted">explain {String(props.impactResult.explainMode)}</span>
            </div>
            <div className="analysis-stat-grid">
              <div className="packet-stat">
                <span>Visible paths</span>
                <strong>{props.impactResult.paths.length}</strong>
              </div>
              <div className="packet-stat">
                <span>Total matched</span>
                <strong>{props.impactResult.totalPaths}</strong>
              </div>
              <div className="packet-stat">
                <span>Relations checked</span>
                <strong>{props.impactResult.relationsChecked.length}</strong>
              </div>
            </div>
            <p>{props.impactResult.explanation}</p>
          </div>

          <div className="sub-card analysis-grid-full">
            <p className="panel-caption">Impact evidence</p>
            <h3>Deterministic paths</h3>
            <ul className="analysis-path-list">
              {props.impactResult.paths.length > 0 ? (
                props.impactResult.paths.map((item, index) => (
                  <li key={`${item.from}-${item.to}-${index}`}>
                    <strong>
                      {item.from} {'->'} {item.to}
                    </strong>
                    <p>
                      {item.rel} | confidence {item.confidence} | score {item.score.toFixed(2)}
                    </p>
                  </li>
                ))
              ) : (
                <li>No deterministic impact path matched the requested field.</li>
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {props.analyzeMode === 'system' && props.systemPermissionResult ? (
        <div className="analysis-grid">
          <div className="sub-card">
            <p className="panel-caption">System permission verdict</p>
            <h3>{props.systemPermissionResult.permission}</h3>
            <div className="decision-meta">
              <span className={props.systemPermissionResult.granted ? 'decision-badge good' : 'decision-badge bad'}>
                {props.systemPermissionResult.granted ? 'Granted' : 'Not granted'}
              </span>
              <span className="decision-badge muted">{props.systemPermissionResult.mappingStatus}</span>
            </div>
            <div className="analysis-stat-grid">
              <div className="packet-stat">
                <span>Principals</span>
                <strong>{props.systemPermissionResult.principalsChecked.length}</strong>
              </div>
              <div className="packet-stat">
                <span>Visible paths</span>
                <strong>{props.systemPermissionResult.paths.length}</strong>
              </div>
              <div className="packet-stat">
                <span>Total matched</span>
                <strong>{props.systemPermissionResult.totalPaths}</strong>
              </div>
            </div>
            <p>{props.systemPermissionResult.explanation}</p>
          </div>

          <div className="sub-card analysis-grid-full">
            <p className="panel-caption">System permission evidence</p>
            <h3>Grant paths</h3>
            <ul className="analysis-path-list">
              {props.systemPermissionResult.paths.length > 0 ? (
                props.systemPermissionResult.paths.map((item, index) => (
                  <li key={`${item.principal}-${item.permission}-${index}`}>
                    <strong>
                      {item.principal} {'->'} {item.permission}
                    </strong>
                    <p>{formatPath(item.path)}</p>
                  </li>
                ))
              ) : (
                <li>No deterministic system-permission path matched the request.</li>
              )}
            </ul>
          </div>

          {renderWarnings(props.systemPermissionResult.warnings)}
        </div>
      ) : null}
    </>
  );
}
