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
  onOpenAsk: (query: string) => void;
  onOpenBrowser: () => void;
  onOpenRefresh: () => void;
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

function renderActionChecklist(title: string, actions: string[]): JSX.Element {
  return (
    <div className="sub-card">
      <p className="panel-caption">Operator actions</p>
      <h3>{title}</h3>
      <ul className="analysis-list">
        {actions.length > 0 ? actions.map((action) => <li key={action}>{action}</li>) : <li>No follow-up actions required.</li>}
      </ul>
    </div>
  );
}

type StructuredAnalyzeActionId =
  | 'run-permissions'
  | 'diagnose-mapping'
  | 'run-automation'
  | 'run-impact'
  | 'run-system'
  | 'open-browser'
  | 'open-refresh'
  | 'open-ask-permissions'
  | 'open-ask-automation'
  | 'open-ask-impact'
  | 'open-ask-system';

type StructuredAnalyzeAction = {
  id: StructuredAnalyzeActionId;
  label: string;
};

function buildPermissionScopeAskQuery(
  permissionResult: PermissionAnalysisResult | null,
  user: string,
  fieldName: string,
  objectName: string
): string {
  const target = permissionResult?.field || permissionResult?.object || fieldName || objectName;
  const actor = permissionResult?.user || user;
  return `Explain whether ${actor} can edit ${target} and what permission path gaps still block approval.`;
}

function buildAutomationScopeAskQuery(automationResult: AutomationResult | null, objectName: string): string {
  const target = automationResult?.object || objectName;
  return `Explain what automations update ${target} and what should be reviewed before approval.`;
}

function buildImpactScopeAskQuery(impactResult: ImpactResult | null, fieldName: string): string {
  const target = impactResult?.field || fieldName;
  return `Should we approve changing ${target}? Explain downstream automations and deterministic impact paths.`;
}

function buildSystemPermissionAskQuery(
  systemPermissionResult: SystemPermissionResult | null,
  user: string,
  systemPermission: string
): string {
  const actor = systemPermissionResult?.user || user;
  const permission = systemPermissionResult?.permission || systemPermission;
  return `Explain whether ${actor} has ${permission} and what deterministic grant paths support or block approval.`;
}

type StructuredAnalyzeSummary = {
  id: string;
  title: string;
  status: 'good' | 'warning' | 'bad';
  detail: string;
  nextAction: string;
  actions: StructuredAnalyzeAction[];
};

function statusBadgeClass(status: StructuredAnalyzeSummary['status']): string {
  if (status === 'good') {
    return 'decision-badge good';
  }
  if (status === 'warning') {
    return 'decision-badge muted';
  }
  return 'decision-badge bad';
}

function buildAnalyzeSnapshot(props: AnalyzeWorkspaceProps): StructuredAnalyzeSummary[] {
  if (props.analyzeMode === 'perms') {
    const summaries: StructuredAnalyzeSummary[] = [];
    if (props.permissionsResult) {
      const hasWarnings = props.permissionsResult.warnings.length > 0;
      const mappingResolved = props.permissionsResult.mappingStatus === 'resolved';
      const status: StructuredAnalyzeSummary['status'] =
        !mappingResolved || !props.permissionsResult.granted
          ? 'bad'
          : hasWarnings || props.permissionsResult.truncated
            ? 'warning'
            : 'good';
      summaries.push({
        id: 'permission-verdict',
        title: 'Permission verdict',
        status,
        detail: `${props.permissionsResult.field || props.permissionsResult.object}: ${
          props.permissionsResult.granted ? 'granted' : 'blocked'
        }. ${props.permissionsResult.paths.length}/${props.permissionsResult.totalPaths} visible path(s).`,
        nextAction:
          !mappingResolved
            ? 'Run Diagnose User Mapping before final approval.'
            : !props.permissionsResult.granted
              ? 'Inspect permission paths and remediate profile/permset coverage.'
              : props.permissionsResult.truncated
                ? 'Increase Limit to confirm full path coverage.'
                : hasWarnings
                  ? 'Resolve warning items before relying on this verdict.'
                  : 'Permission coverage is deterministic and ready.',
        actions: [
          { id: 'run-permissions', label: 'Run Permissions Analysis' },
          { id: 'open-ask-permissions', label: 'Open Ask for Permission Scope' },
          ...(!mappingResolved ? [{ id: 'diagnose-mapping', label: 'Diagnose User Mapping' } as StructuredAnalyzeAction] : [])
        ]
      });
    } else {
      summaries.push({
        id: 'permission-verdict',
        title: 'Permission verdict',
        status: 'warning',
        detail: 'No permission analysis result loaded for the current user/object/field context.',
        nextAction: 'Run Permissions Analysis to generate a deterministic verdict.',
        actions: [{ id: 'run-permissions', label: 'Run Permissions Analysis' }]
      });
    }

    if (props.permissionDiagnosis) {
      const status: StructuredAnalyzeSummary['status'] = !props.permissionDiagnosis.mapExists
        ? 'bad'
        : props.permissionDiagnosis.stale || props.permissionDiagnosis.warnings.length > 0
          ? 'warning'
          : 'good';
      summaries.push({
        id: 'mapping-diagnosis',
        title: 'Mapping diagnosis',
        status,
        detail: `Principal map: ${props.permissionDiagnosis.mapExists ? 'present' : 'missing'}; status ${
          props.permissionDiagnosis.mappingStatus
        }; principals ${props.permissionDiagnosis.principals.length}.`,
        nextAction: !props.permissionDiagnosis.mapExists
          ? 'Run retrieve + Refresh Semantic State to generate the principal map.'
          : props.permissionDiagnosis.stale
            ? 'Refresh semantic state to replace stale mapping data.'
            : props.permissionDiagnosis.warnings.length > 0
              ? 'Resolve mapping warnings before permission approval.'
              : 'Mapping context is ready for permission checks.',
        actions: [
          { id: 'diagnose-mapping', label: 'Diagnose User Mapping' },
          { id: 'run-permissions', label: 'Run Permissions Analysis' },
          ...(!props.permissionDiagnosis.mapExists ? [{ id: 'open-browser', label: 'Open Org Browser' } as StructuredAnalyzeAction] : []),
          ...(props.permissionDiagnosis.stale || !props.permissionDiagnosis.mapExists
            ? [{ id: 'open-refresh', label: 'Open Refresh & Build' } as StructuredAnalyzeAction]
            : [])
        ]
      });
    }

    return summaries;
  }

  if (props.analyzeMode === 'automation') {
    if (!props.automationResult) {
      return [
        {
          id: 'automation-summary',
          title: 'Automation summary',
          status: 'warning',
          detail: 'No automation analysis result loaded for this object context.',
          nextAction: 'Run Automation Analysis to generate deterministic automation coverage.',
          actions: [{ id: 'run-automation', label: 'Run Automation Analysis' }]
        }
      ];
    }

    const hasMatches = props.automationResult.automations.length > 0;
    const status: StructuredAnalyzeSummary['status'] = !hasMatches
      ? 'warning'
      : props.automationResult.truncated
        ? 'warning'
        : 'good';
    return [
      {
        id: 'automation-summary',
        title: 'Automation summary',
        status,
        detail: `${props.automationResult.object}: ${props.automationResult.automations.length}/${props.automationResult.totalAutomations} automation(s) visible.`,
        nextAction: !hasMatches
          ? 'Validate object API name or relax confidence settings, then rerun.'
          : props.automationResult.truncated
            ? 'Increase Limit to inspect complete automation coverage.'
            : 'Use Open Ask for Automation Scope to create a trust/proof packet.',
        actions: [
          { id: 'run-automation', label: 'Run Automation Analysis' },
          { id: 'open-ask-automation', label: 'Open Ask for Automation Scope' }
        ]
      }
    ];
  }

  if (props.analyzeMode === 'impact') {
    if (!props.impactResult) {
      return [
        {
          id: 'impact-summary',
          title: 'Impact summary',
          status: 'warning',
          detail: 'No impact analysis result loaded for this field context.',
          nextAction: 'Run Impact Analysis to generate deterministic downstream paths.',
          actions: [{ id: 'run-impact', label: 'Run Impact Analysis' }]
        }
      ];
    }

    const hasPaths = props.impactResult.paths.length > 0;
    const status: StructuredAnalyzeSummary['status'] = !hasPaths
      ? 'warning'
      : props.impactResult.truncated
        ? 'warning'
        : 'good';
    return [
      {
        id: 'impact-summary',
        title: 'Impact summary',
        status,
        detail: `${props.impactResult.field}: ${props.impactResult.paths.length}/${props.impactResult.totalPaths} impact path(s) visible.`,
        nextAction: !hasPaths
          ? 'Confirm field API name and refresh metadata before rerunning.'
          : props.impactResult.truncated
            ? 'Increase Limit to inspect full impact coverage.'
            : 'Use Open Ask for Impact Scope for approval-ready packet output.',
        actions: [
          { id: 'run-impact', label: 'Run Impact Analysis' },
          { id: 'open-ask-impact', label: 'Open Ask for Impact Scope' }
        ]
      }
    ];
  }

  if (!props.systemPermissionResult) {
    return [
      {
        id: 'system-summary',
        title: 'System permission summary',
        status: 'warning',
        detail: 'No system-permission result loaded for this user and permission context.',
        nextAction: 'Run System Permission Check to load deterministic grant paths.',
        actions: [{ id: 'run-system', label: 'Run System Permission Check' }]
      }
    ];
  }

  const status: StructuredAnalyzeSummary['status'] = !props.systemPermissionResult.granted
    ? 'bad'
    : props.systemPermissionResult.warnings.length > 0 || props.systemPermissionResult.truncated
      ? 'warning'
      : 'good';
  return [
    {
      id: 'system-summary',
      title: 'System permission summary',
      status,
      detail: `${props.systemPermissionResult.permission}: ${
        props.systemPermissionResult.granted ? 'granted' : 'not granted'
      }. ${props.systemPermissionResult.paths.length}/${props.systemPermissionResult.totalPaths} visible path(s).`,
      nextAction: !props.systemPermissionResult.granted
        ? 'Inspect grant paths and update assignments before approval.'
        : props.systemPermissionResult.truncated
          ? 'Increase Limit to verify full grant coverage.'
          : props.systemPermissionResult.warnings.length > 0
            ? 'Resolve warning items before relying on this verdict.'
            : 'System permission coverage is deterministic and ready.',
      actions: [
        { id: 'run-system', label: 'Run System Permission Check' },
        { id: 'open-ask-system', label: 'Open Ask for System Permission' }
      ]
    }
  ];
}

export function AnalyzeWorkspace(props: AnalyzeWorkspaceProps): JSX.Element {
  const structuredSnapshot = buildAnalyzeSnapshot(props);

  function handleStructuredAction(actionId: StructuredAnalyzeActionId): void {
    if (actionId === 'run-permissions') {
      props.onRunPermissions();
      return;
    }
    if (actionId === 'diagnose-mapping') {
      props.onDiagnoseUserMapping();
      return;
    }
    if (actionId === 'run-automation') {
      props.onRunAutomation();
      return;
    }
    if (actionId === 'run-impact') {
      props.onRunImpact();
      return;
    }
    if (actionId === 'run-system') {
      props.onRunSystemPermission();
      return;
    }
    if (actionId === 'open-browser') {
      props.onOpenBrowser();
      return;
    }
    if (actionId === 'open-refresh') {
      props.onOpenRefresh();
      return;
    }
    if (actionId === 'open-ask-permissions') {
      props.onOpenAsk(buildPermissionScopeAskQuery(props.permissionsResult, props.user, props.fieldName, props.objectName));
      return;
    }
    if (actionId === 'open-ask-automation') {
      props.onOpenAsk(buildAutomationScopeAskQuery(props.automationResult, props.objectName));
      return;
    }
    if (actionId === 'open-ask-impact') {
      props.onOpenAsk(buildImpactScopeAskQuery(props.impactResult, props.fieldName));
      return;
    }
    props.onOpenAsk(buildSystemPermissionAskQuery(props.systemPermissionResult, props.user, props.systemPermission));
  }

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

      <div className="analysis-grid">
        <div className="sub-card analysis-grid-full" role="status" aria-live="polite">
          <p className="panel-caption">Structured triage</p>
          <h3>Operator snapshot</h3>
          <ul className="analysis-list">
            {structuredSnapshot.map((item) => (
              <li key={item.id}>
                <div className="decision-meta">
                  <span className={statusBadgeClass(item.status)}>{item.title}</span>
                </div>
                <p>{item.detail}</p>
                <p>
                  <strong>Next action:</strong> {item.nextAction}
                </p>
                {item.actions.length > 0 ? (
                  <div className="action-row">
                    {item.actions.map((action) => (
                      <button
                        key={`${item.id}-${action.id}`}
                        type="button"
                        className="ghost"
                        onClick={() => handleStructuredAction(action.id)}
                        disabled={props.loading}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
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

          {renderActionChecklist('Permission triage', [
            ...(props.permissionsResult.mappingStatus !== 'resolved'
              ? ['Run `Diagnose User Mapping` to repair or refresh principal mapping before approval.']
              : []),
            ...(!props.permissionsResult.granted
              ? ['Inspect `Permission paths` and confirm object/field coverage before making changes.']
              : ['Permission coverage is already granted for the selected target.']),
            ...(props.permissionsResult.truncated
              ? ['Increase `Limit` and rerun to inspect the complete permission path set.']
              : []),
            ...(props.permissionsResult.warnings.length > 0
              ? ['Resolve warning items listed below before treating this result as final.']
              : [])
          ])}

          <div className="sub-card analysis-grid-full">
            <p className="panel-caption">Deterministic path evidence</p>
            <h3>Permission paths</h3>
            <ul className="analysis-path-list">
              {props.permissionsResult.paths.length > 0 ? (
                props.permissionsResult.paths.map((item, index) => (
                  <li key={`${item.principal}-${index}`}>
                    <strong>{item.principal}</strong>
                    <p>
                      <span className="path-value">{formatPath(item.path)}</span>
                    </p>
                  </li>
                ))
              ) : (
                <li>No deterministic permission path matched the request.</li>
              )}
            </ul>
          </div>

          {renderWarnings(props.permissionsResult.warnings)}

          <div className="sub-card">
            <p className="panel-caption">Ask handoff</p>
            <h3>Open permission decision packet</h3>
            <p className="muted">Carry this deterministic permission context into Ask for trust envelope, proof ID, and replay token output.</p>
            <div className="action-row">
              <button
                type="button"
                className="ghost"
                onClick={() => props.onOpenAsk(buildPermissionScopeAskQuery(props.permissionsResult, props.user, props.fieldName, props.objectName))}
              >
                Open Ask for Permission Scope
              </button>
            </div>
          </div>
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
            <p className="path-value">{props.permissionDiagnosis.mapPath}</p>
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

          {renderActionChecklist('Mapping recovery', [
            ...(!props.permissionDiagnosis.mapExists
              ? ['Run an org retrieve plus Refresh Semantic State to generate a user principal map.']
              : []),
            ...(props.permissionDiagnosis.stale
              ? ['Mapping is stale. Refresh semantic state before permission analysis.']
              : ['Mapping is fresh enough for deterministic permission checks.']),
            ...(props.permissionDiagnosis.warnings.length > 0
              ? ['Address mapping warnings before relying on map-driven permission verdicts.']
              : [])
          ])}

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

          {renderActionChecklist('Automation triage', [
            ...(props.automationResult.automations.length === 0
              ? [
                  'No deterministic automation matched. Check object name, then rerun with lower confidence if needed.',
                  'Use Ask with the same object context if you need broader policy-aware impact explanation.'
                ]
              : ['Inspect returned automations before approving schema or logic changes.']),
            ...(props.automationResult.truncated
              ? ['Increase `Limit` to review full automation coverage.']
              : [])
          ])}

          <div className="sub-card">
            <p className="panel-caption">Ask handoff</p>
            <h3>Open decision packet workflow</h3>
            <p className="muted">Move this deterministic automation context into Ask for policy-aware trust, proof, and replay artifacts.</p>
            <div className="action-row">
              <button
                type="button"
                className="ghost"
                onClick={() => props.onOpenAsk(buildAutomationScopeAskQuery(props.automationResult, props.objectName))}
              >
                Open Ask for Automation Scope
              </button>
            </div>
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
                      <span className="path-value">{item.from}</span> {'->'} <span className="path-value">{item.to}</span>
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

          {renderActionChecklist('Impact triage', [
            ...(props.impactResult.paths.length === 0
              ? ['No deterministic impact path matched. Confirm field API name and retrieve latest metadata before rerun.']
              : ['Inspect each returned impact path and validate downstream automations before change approval.']),
            ...(props.impactResult.truncated
              ? ['Increase `Limit` to inspect full impact coverage.']
              : [])
          ])}

          <div className="sub-card">
            <p className="panel-caption">Ask handoff</p>
            <h3>Open approval packet workflow</h3>
            <p className="muted">Carry this deterministic impact context into Ask to generate an approval-ready packet with trust envelope and next actions.</p>
            <div className="action-row">
              <button
                type="button"
                className="ghost"
                onClick={() => props.onOpenAsk(buildImpactScopeAskQuery(props.impactResult, props.fieldName))}
              >
                Open Ask for Impact Scope
              </button>
            </div>
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
                      <span className="path-value">{item.principal}</span> {'->'} <span className="path-value">{item.permission}</span>
                    </strong>
                    <p>
                      <span className="path-value">{formatPath(item.path)}</span>
                    </p>
                  </li>
                ))
              ) : (
                <li>No deterministic system-permission path matched the request.</li>
              )}
            </ul>
          </div>

          {renderActionChecklist('System permission triage', [
            ...(!props.systemPermissionResult.granted
              ? ['Permission is not granted through deterministic paths. Validate profile/permset assignments before approval.']
              : ['System permission is granted through deterministic evidence paths.']),
            ...(props.systemPermissionResult.truncated
              ? ['Increase `Limit` if you need complete path coverage.']
              : []),
            ...(props.systemPermissionResult.warnings.length > 0
              ? ['Resolve warning items before treating this system-permission check as final.']
              : [])
          ])}

          {renderWarnings(props.systemPermissionResult.warnings)}

          <div className="sub-card">
            <p className="panel-caption">Ask handoff</p>
            <h3>Open system-permission packet</h3>
            <p className="muted">Move this deterministic system-permission context into Ask to produce a trusted approval packet.</p>
            <div className="action-row">
              <button
                type="button"
                className="ghost"
                onClick={() => props.onOpenAsk(buildSystemPermissionAskQuery(props.systemPermissionResult, props.user, props.systemPermission))}
              >
                Open Ask for System Permission
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
