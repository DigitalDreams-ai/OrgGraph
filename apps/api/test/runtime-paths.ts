import assert from 'node:assert/strict';
import { resolveOrgumentedAppDataRoot } from '../src/common/path';
import { RuntimePathsService } from '../src/config/runtime-paths.service';

function run(): void {
  const fakeConfig = {
    orgumentedAppDataRoot: () => 'desktop-data',
    databaseUrl: () => undefined,
    userProfileMapPath: () => undefined,
    evidenceIndexPath: () => undefined,
    refreshStatePath: () => undefined,
    refreshAuditPath: () => undefined,
    ontologyReportPath: () => undefined,
    askProofStorePath: () => undefined,
    askMetricsPath: () => undefined,
    semanticSnapshotPath: () => undefined,
    metaContextPath: () => undefined,
    sfProjectPath: () => undefined,
    sfParsePath: () => undefined
  };

  const service = new RuntimePathsService(fakeConfig as never);
  const appDataRoot = service.appDataRoot();

  assert.ok(appDataRoot.endsWith('/desktop-data'), `unexpected app data root: ${appDataRoot}`);
  assert.equal(service.logsDir(), `${appDataRoot}/logs`);
  assert.equal(service.historyDir(), `${appDataRoot}/history`);
  assert.equal(service.sfProjectPath(), `${appDataRoot}/sf-project`);
  assert.equal(service.sfParsePath(), `${appDataRoot}/sf-project/force-app/main/default`);
  assert.equal(service.orgSessionStatePath(), `${appDataRoot}/org/session-state.json`);
  assert.equal(service.orgRetrieveAuditPath(), `${appDataRoot}/org/sf-retrieve-audit.log`);

  const workspaceRoot = service.workspaceRoot();
  const windowsAppDataRoot = resolveOrgumentedAppDataRoot(undefined, workspaceRoot, {
    platform: 'win32',
    appDataEnv: 'C:\\Users\\Sean\\AppData\\Roaming'
  });
  assert.equal(windowsAppDataRoot, 'C:\\Users\\Sean\\AppData\\Roaming\\Orgumented');

  const windowsHomeFallback = resolveOrgumentedAppDataRoot(undefined, workspaceRoot, {
    platform: 'win32',
    homeDir: 'C:\\Users\\Sean'
  });
  assert.equal(windowsHomeFallback, 'C:\\Users\\Sean\\AppData\\Roaming\\Orgumented');

  console.log('runtime paths test passed');
}

run();
