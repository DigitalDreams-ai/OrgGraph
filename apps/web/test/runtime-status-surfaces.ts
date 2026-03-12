import assert from 'node:assert/strict';
import { describeToolStatusSource } from '../app/shell/org-status-surface';
import { deriveRuntimeGateState } from '../app/shell/runtime-gate';
import { buildStructuredSnapshot } from '../app/workspaces/system/runtime-status';

function run(): void {
  assert.equal(describeToolStatusSource('runtime_unavailable'), 'runtime unavailable');
  assert.equal(describeToolStatusSource('live'), 'live status');
  assert.equal(describeToolStatusSource('unknown'), 'status not loaded');

  assert.equal(
    deriveRuntimeGateState({
      healthStatus: 'ok',
      readyStatus: 'ready',
      orgRuntimeUnavailable: false
    }),
    'ready'
  );
  assert.equal(
    deriveRuntimeGateState({
      healthStatus: 'ok',
      readyStatus: 'http_400',
      orgRuntimeUnavailable: false
    }),
    'blocked'
  );
  assert.equal(
    deriveRuntimeGateState({
      healthStatus: 'ok',
      readyStatus: 'ready',
      orgRuntimeUnavailable: true
    }),
    'unreachable'
  );

  const unreachableSnapshot = buildStructuredSnapshot({
    runtimeGateState: 'unreachable',
    healthStatus: 'unreachable',
    readyStatus: 'unreachable',
    runtimeIssues: [],
    orgStatus: null,
    preflightIssues: [],
    preflightChecks: undefined
  });
  assert.equal(unreachableSnapshot[1]?.title, 'Toolchain status');
  assert.equal(unreachableSnapshot[1]?.status, 'bad');
  assert.match(unreachableSnapshot[1]?.detail ?? '', /runtime is unreachable/i);
  assert.match(unreachableSnapshot[1]?.nextAction ?? '', /restore runtime first/i);

  const blockedSnapshot = buildStructuredSnapshot({
    runtimeGateState: 'blocked',
    healthStatus: 'ok',
    readyStatus: 'http_400',
    runtimeIssues: [],
    orgStatus: {
      integrationEnabled: true,
      sf: { installed: true },
      cci: { installed: true },
      session: { status: 'connected' }
    },
    preflightIssues: [],
    preflightChecks: {
      aliasAuthenticated: true,
      cciAliasAvailable: true,
      sessionConnected: true
    }
  });
  assert.equal(blockedSnapshot[1]?.status, 'warning');
  assert.match(blockedSnapshot[1]?.detail ?? '', /still readable/i);
  assert.match(blockedSnapshot[1]?.nextAction ?? '', /runtime readiness first/i);
  assert.equal(blockedSnapshot[2]?.status, 'warning');
  assert.match(blockedSnapshot[2]?.detail ?? '', /fail-closed/i);
}

run();
