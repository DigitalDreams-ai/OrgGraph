import type { RuntimeGateState } from '../../shell/runtime-gate';
import type { ReadyPayload } from '../../shell/use-shell-runtime';
import type {
  OrgPreflightIssue,
  OrgPreflightPayload,
  OrgStatusPayload
} from '../connect/types';

export type RuntimeIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  remediation: string;
};

export type StructuredSummary = {
  id: string;
  title: string;
  status: 'good' | 'warning' | 'bad';
  detail: string;
  nextAction: string;
  actions: StructuredRuntimeAction[];
};

export type StructuredRuntimeActionId =
  | 'refresh-status'
  | 'load-org-status'
  | 'run-preflight'
  | 'open-connect'
  | 'open-refresh'
  | 'load-meta-context'
  | 'run-meta-adapt'
  | 'load-ask-trust'
  | 'load-runtime-metrics';

export type StructuredRuntimeAction = {
  id: StructuredRuntimeActionId;
  label: string;
};

export function deriveRuntimeIssues(
  healthStatus: string,
  readyStatus: string,
  readyPayload: ReadyPayload | null
): RuntimeIssue[] {
  const issues: RuntimeIssue[] = [];

  if (healthStatus === 'unreachable') {
    issues.push({
      code: 'HEALTH_UNREACHABLE',
      severity: 'error',
      message: 'Desktop API health endpoint is unreachable.',
      remediation: 'Relaunch Orgumented desktop and run Refresh Status once the API process is back.'
    });
  }

  if (readyStatus === 'unreachable') {
    issues.push({
      code: 'READY_UNREACHABLE',
      severity: 'error',
      message: 'Desktop API readiness endpoint is unreachable.',
      remediation: 'Restart Orgumented desktop to restore packaged API readiness checks.'
    });
  } else if (readyStatus.startsWith('http_')) {
    issues.push({
      code: 'READY_HTTP_FAILURE',
      severity: 'error',
      message: `Readiness returned ${readyStatus}.`,
      remediation: 'Use Refresh & Build to rebuild semantic state, then rerun Refresh Status.'
    });
  }

  const checks = readyPayload?.checks;
  const bootstrap = checks?.bootstrap;
  const db = checks?.db;
  const fixtures = checks?.fixtures;
  const evidence = checks?.evidence;

  if (bootstrap?.ok === false) {
    issues.push({
      code: 'BOOTSTRAP_FAILED',
      severity: 'error',
      message: bootstrap.message || `Runtime bootstrap state is ${bootstrap.status || 'failed'}.`,
      remediation: 'Open Refresh & Build and run Refresh Semantic State to reground runtime bootstrap.'
    });
  }

  if (db?.ok === false) {
    issues.push({
      code: 'GRAPH_NOT_GROUNDED',
      severity: 'error',
      message: `Graph store is not grounded (nodes ${db.nodeCount ?? 0}, edges ${db.edgeCount ?? 0}).`,
      remediation: 'Run Refresh Semantic State after a successful metadata retrieve to repopulate the graph.'
    });
  }

  if (fixtures?.ok === false) {
    issues.push({
      code: 'FIXTURES_MISSING',
      severity: 'warning',
      message: `Fixtures source path is not present (${fixtures.sourcePath || 'n/a'}).`,
      remediation: 'Run Org Browser retrieve, then Refresh Semantic State to regenerate the parse tree.'
    });
  }

  if (evidence?.ok === false) {
    issues.push({
      code: 'EVIDENCE_MISSING',
      severity: 'warning',
      message: `Evidence index path is missing or empty (${evidence.indexPath || 'n/a'}).`,
      remediation: 'Run Refresh Semantic State and Ask once to regenerate deterministic evidence artifacts.'
    });
  }

  if (!checks && readyPayload?.message) {
    issues.push({
      code: 'READY_MESSAGE_ONLY',
      severity: 'warning',
      message: readyPayload.message,
      remediation: 'Rerun Refresh Status and inspect runtime logs if the issue persists.'
    });
  }

  return issues;
}

export function buildStructuredSnapshot(input: {
  runtimeGateState: RuntimeGateState;
  healthStatus: string;
  readyStatus: string;
  runtimeIssues: RuntimeIssue[];
  orgStatus: OrgStatusPayload | null;
  preflightIssues: OrgPreflightIssue[];
  preflightChecks: OrgPreflightPayload['checks'] | undefined;
}): StructuredSummary[] {
  const runtimeErrors = input.runtimeIssues.filter((issue) => issue.severity === 'error').length;
  const runtimeWarnings = input.runtimeIssues.filter((issue) => issue.severity === 'warning').length;

  const runtimeSummary: StructuredSummary =
    input.runtimeGateState === 'unreachable'
      ? {
          id: 'runtime',
          title: 'Runtime reachability',
          status: 'bad',
          detail: 'Desktop runtime is unavailable, so readiness and tooling probes are blocked.',
          nextAction: 'Use Refresh Status after relaunching Orgumented.',
          actions: [
            { id: 'refresh-status', label: 'Refresh Status' },
            { id: 'open-refresh', label: 'Open Refresh & Build' }
          ]
        }
      : input.runtimeGateState === 'blocked'
        ? {
            id: 'runtime',
            title: 'Runtime gate',
            status: 'bad',
            detail: `Desktop runtime is reachable but fail-closed (health=${input.healthStatus}, ready=${input.readyStatus}).`,
            nextAction: 'Open Refresh & Build and reground runtime readiness before relying on Ask or rebuild workflows.',
            actions: [
              { id: 'refresh-status', label: 'Refresh Status' },
              { id: 'open-refresh', label: 'Open Refresh & Build' }
            ]
          }
        : runtimeErrors > 0
          ? {
              id: 'runtime',
              title: 'Runtime readiness',
              status: 'bad',
              detail: `${runtimeErrors} readiness error(s) detected (health=${input.healthStatus}, ready=${input.readyStatus}).`,
              nextAction: 'Open Refresh & Build and run Refresh Semantic State.',
              actions: [
                { id: 'refresh-status', label: 'Refresh Status' },
                { id: 'open-refresh', label: 'Open Refresh & Build' }
              ]
            }
          : runtimeWarnings > 0
            ? {
                id: 'runtime',
                title: 'Runtime readiness',
                status: 'warning',
                detail: `${runtimeWarnings} readiness warning(s) detected (fixtures/evidence may be incomplete).`,
                nextAction: 'Run retrieve + refresh to repopulate parse/evidence paths.',
                actions: [
                  { id: 'refresh-status', label: 'Refresh Status' },
                  { id: 'open-refresh', label: 'Open Refresh & Build' }
                ]
              }
            : {
                id: 'runtime',
                title: 'Runtime readiness',
                status: 'good',
                detail: `Health and readiness are stable (health=${input.healthStatus}, ready=${input.readyStatus}).`,
                nextAction: 'No runtime recovery action required.',
                actions: [{ id: 'refresh-status', label: 'Refresh Status' }]
              };

  const sfInstalled = input.orgStatus?.sf?.installed === true;
  const cciInstalled = input.orgStatus?.cci?.installed === true;
  const preflightErrors = input.preflightIssues.filter(
    (issue) => (issue.severity || '').toLowerCase() === 'error'
  ).length;
  const preflightWarnings = input.preflightIssues.filter(
    (issue) => (issue.severity || '').toLowerCase() === 'warning'
  ).length;

  const toolingSummary: StructuredSummary =
    input.runtimeGateState === 'unreachable'
      ? {
          id: 'tooling',
          title: 'Toolchain status',
          status: 'bad',
          detail: 'sf/cci checks are unavailable while runtime is unreachable.',
          nextAction: 'Restore runtime first, then rerun Org Status and Preflight.',
          actions: [
            { id: 'refresh-status', label: 'Refresh Status' },
            { id: 'load-org-status', label: 'Load Org Status' }
          ]
        }
      : input.runtimeGateState === 'blocked'
        ? {
            id: 'tooling',
            title: 'Toolchain status',
            status: 'warning',
            detail: 'sf/cci status is still readable, but the runtime gate is fail-closed and operator workflows are blocked.',
            nextAction: 'Fix runtime readiness first, then treat tool/session status as operationally usable.',
            actions: [
              { id: 'refresh-status', label: 'Refresh Status' },
              { id: 'load-org-status', label: 'Load Org Status' },
              { id: 'run-preflight', label: 'Run Preflight' }
            ]
          }
        : !sfInstalled || !cciInstalled
          ? {
              id: 'tooling',
              title: 'Toolchain status',
              status: 'bad',
              detail: `Tooling is degraded (sf=${sfInstalled ? 'installed' : 'missing'}, cci=${cciInstalled ? 'installed' : 'missing'}).`,
              nextAction: 'Install missing tools and rerun Preflight.',
              actions: [
                { id: 'load-org-status', label: 'Load Org Status' },
                { id: 'run-preflight', label: 'Run Preflight' },
                { id: 'open-connect', label: 'Open Org Sessions' }
              ]
            }
          : preflightErrors > 0
            ? {
                id: 'tooling',
                title: 'Toolchain status',
                status: 'bad',
                detail: `${preflightErrors} blocking preflight error(s) detected for the selected alias.`,
                nextAction: 'Follow preflight remediation items before retrieve/ask.',
                actions: [
                  { id: 'run-preflight', label: 'Run Preflight' },
                  { id: 'open-connect', label: 'Open Org Sessions' }
                ]
              }
            : preflightWarnings > 0
              ? {
                  id: 'tooling',
                  title: 'Toolchain status',
                  status: 'warning',
                  detail: `${preflightWarnings} warning(s) remain (non-blocking but should be cleaned up).`,
                  nextAction: 'Run preflight checklist actions to remove warnings.',
                  actions: [
                    { id: 'run-preflight', label: 'Run Preflight' },
                    { id: 'open-connect', label: 'Open Org Sessions' }
                  ]
                }
              : {
                  id: 'tooling',
                  title: 'Toolchain status',
                  status: 'good',
                  detail: 'sf/cci are installed and no preflight issues are currently reported.',
                  nextAction: 'Toolchain is ready for retrieve, refresh, and ask.',
                  actions: [{ id: 'load-org-status', label: 'Load Org Status' }]
                };

  const sessionConnected =
    input.runtimeGateState === 'unreachable'
      ? undefined
      : input.orgStatus?.session?.status === 'connected' ||
        input.preflightChecks?.sessionConnected === true;
  const aliasAuthenticated = input.preflightChecks?.aliasAuthenticated;
  const cciAliasAvailable = input.preflightChecks?.cciAliasAvailable;

  const sessionSummary: StructuredSummary =
    input.runtimeGateState === 'unreachable'
      ? {
          id: 'session',
          title: 'Session state',
          status: 'bad',
          detail: 'Session state cannot be validated while runtime is unavailable.',
          nextAction: 'Relaunch runtime, then run Refresh Overview.',
          actions: [
            { id: 'refresh-status', label: 'Refresh Status' },
            { id: 'open-connect', label: 'Open Org Sessions' }
          ]
        }
      : input.runtimeGateState === 'blocked'
        ? {
            id: 'session',
            title: 'Session state',
            status: 'warning',
            detail: 'Session details are reachable, but runtime readiness is still fail-closed for deterministic workflows.',
            nextAction: 'Restore runtime readiness before treating the current session as fully usable.',
            actions: [
              { id: 'refresh-status', label: 'Refresh Status' },
              { id: 'open-connect', label: 'Open Org Sessions' }
            ]
          }
        : sessionConnected && aliasAuthenticated === true
          ? {
              id: 'session',
              title: 'Session state',
              status: cciAliasAvailable === false ? 'warning' : 'good',
              detail:
                cciAliasAvailable === false
                  ? 'Session is connected, but CCI alias bridging is still pending.'
                  : 'Session is connected and alias authentication is healthy.',
              nextAction:
                cciAliasAvailable === false
                  ? 'Use Bridge CCI Alias, then rerun Preflight.'
                  : 'No session recovery action required.',
              actions:
                cciAliasAvailable === false
                  ? [
                      { id: 'run-preflight', label: 'Run Preflight' },
                      { id: 'open-connect', label: 'Open Org Sessions' }
                    ]
                  : [{ id: 'open-connect', label: 'Open Org Sessions' }]
            }
          : {
              id: 'session',
              title: 'Session state',
              status: 'bad',
              detail: 'Session is not yet ready for deterministic operator workflows.',
              nextAction: 'Run Attach/Switch Active Alias and rerun Preflight.',
              actions: [
                { id: 'open-connect', label: 'Open Org Sessions' },
                { id: 'run-preflight', label: 'Run Preflight' }
              ]
            };

  return [runtimeSummary, toolingSummary, sessionSummary];
}
