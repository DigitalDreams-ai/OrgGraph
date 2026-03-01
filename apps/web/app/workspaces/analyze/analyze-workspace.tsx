'use client';

export type AnalyzeMode = 'perms' | 'automation' | 'impact' | 'system';

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
  loading: boolean;
  onRunPermissions: () => void;
  onDiagnoseUserMapping: () => void;
  onRunAutomation: () => void;
  onRunImpact: () => void;
  onRunSystemPermission: () => void;
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
    </>
  );
}
