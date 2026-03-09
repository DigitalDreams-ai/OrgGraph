import assert from 'node:assert/strict';
import { deriveRuntimeGateState, isRuntimeBlocked } from '../../web/app/shell/runtime-gate';
import { buildStructuredSnapshot, deriveRuntimeIssues } from '../../web/app/workspaces/system/runtime-status';

function run(): void {
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
      readyStatus: 'http_503',
      orgRuntimeUnavailable: false
    }),
    'blocked',
    'reachable but fail-closed readiness should be blocked, not unreachable'
  );

  assert.equal(
    deriveRuntimeGateState({
      healthStatus: 'unreachable',
      readyStatus: 'unknown',
      orgRuntimeUnavailable: false
    }),
    'unreachable'
  );

  assert.equal(
    deriveRuntimeGateState({
      healthStatus: 'ok',
      readyStatus: 'ready',
      orgRuntimeUnavailable: true
    }),
    'unreachable'
  );

  assert.equal(isRuntimeBlocked('blocked'), true);
  assert.equal(isRuntimeBlocked('unreachable'), true);
  assert.equal(isRuntimeBlocked('ready'), false);

  const runtimeIssues = deriveRuntimeIssues('ok', 'http_503', {
    status: 'failed',
    message: 'runtime bootstrap failed',
    checks: {
      bootstrap: { ok: false, status: 'failed', message: 'runtime bootstrap failed' },
      db: { ok: true, nodeCount: 10, edgeCount: 10 },
      fixtures: { ok: true, sourcePath: 'fixtures' },
      evidence: { ok: true, indexPath: 'evidence' }
    }
  });

  const snapshot = buildStructuredSnapshot({
    runtimeGateState: 'blocked',
    healthStatus: 'ok',
    readyStatus: 'http_503',
    runtimeIssues,
    orgStatus: {
      integrationEnabled: true,
      authMode: 'sf_cli_keychain',
      alias: 'shulman-uat',
      sf: { installed: true, message: 'sf available' },
      cci: { installed: true, message: 'cci available', versionPinned: true, version: '4.5.0' },
      session: { status: 'connected', activeAlias: 'shulman-uat' }
    },
    preflightIssues: [],
    preflightChecks: {
      sessionConnected: true,
      aliasAuthenticated: true,
      cciAliasAvailable: true,
      sfInstalled: true,
      cciInstalled: true,
      parsePathPresent: true
    }
  });

  assert.equal(snapshot[0]?.title, 'Runtime gate');
  assert.equal(snapshot[0]?.status, 'bad');
  assert.match(snapshot[0]?.detail ?? '', /reachable but fail-closed/i);
  assert.equal(snapshot[1]?.status, 'warning');
  assert.match(snapshot[1]?.detail ?? '', /still readable/i);
  assert.equal(snapshot[2]?.status, 'warning');
  assert.match(snapshot[2]?.detail ?? '', /still fail-closed/i);

  console.log('runtime gate test passed');
}

run();
