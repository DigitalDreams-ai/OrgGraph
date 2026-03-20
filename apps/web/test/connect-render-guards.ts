import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConnectWorkspace } from '../app/workspaces/connect/connect-workspace';

function run(): void {
  const longAlias = 'shulman-uat-with-a-very-long-alias-name-that-must-wrap-cleanly';
  const longUsername = 'sbingham.with.a.very.long.username@shulman-hill-with-a-very-long-domain-name.example';
  const longOrgId = '00Dxx000001kjZRUAY-VERY-LONG-ORG-IDENTIFIER-SEGMENT';
  const longInstanceUrl =
    'https://shulman-hill--uat.sandbox.my.salesforce.com/services/data/v62.0/sobjects/Very_Long_Resource_Name_With_Many_Segments';
  const longGithubRepo = 'sean/Orgumented-runtime-repo-with-a-very-long-selected-binding-name';
  const longGithubUrl =
    'https://github.com/sean/Orgumented-runtime-repo-with-a-very-long-selected-binding-name';
  const connectMarkup = renderToStaticMarkup(
    React.createElement(ConnectWorkspace, {
      orgAlias: longAlias,
      setOrgAlias: () => undefined,
      githubRepoOwner: 'sean',
      setGithubRepoOwner: () => undefined,
      githubRepoName: 'Orgumented-runtime-repo-with-a-very-long-selected-binding-name',
      setGithubRepoName: () => undefined,
      githubRepoDescription: 'Repo used for Orgumented metadata publication.',
      setGithubRepoDescription: () => undefined,
      githubRepoPrivate: true,
      setGithubRepoPrivate: () => undefined,
      githubPullNumber: '42',
      setGithubPullNumber: () => undefined,
      githubWorkflowKey: 'runtime_nightly',
      setGithubWorkflowKey: () => undefined,
      githubWorkflowRef: 'main',
      setGithubWorkflowRef: () => undefined,
      activeAlias: longAlias,
      sessionStatus: 'connected',
      orgStatus: {
        integrationEnabled: true,
        authMode: 'sf_cli_keychain',
        sf: { installed: true },
        cci: { installed: true, version: '4.5.0' },
        session: { status: 'connected', connectedAt: '2026-03-13T01:00:00Z' }
      },
      orgPreflight: {
        alias: longAlias,
        checks: {
          aliasAuthenticated: true,
          cciAliasAvailable: true,
          parsePathPresent: true,
          sessionConnected: true
        },
        issues: []
      },
      orgAliases: { activeAlias: longAlias, aliases: [] },
      orgSessionHistory: { restoreAlias: longAlias, events: [] },
      orgSession: { status: 'connected', alias: longAlias, connectedAt: '2026-03-13T01:00:00Z' },
      githubSession: {
        status: 'authenticated',
        cliInstalled: true,
        authSource: 'gh_cli',
        viewer: {
          login: 'sean',
          name: 'Sean Longname',
          url: 'https://github.com/sean'
        },
        selectedRepo: {
          owner: 'sean',
          name: 'Orgumented-runtime-repo-with-a-very-long-selected-binding-name',
          fullName: longGithubRepo,
          private: true,
          visibility: 'private',
          url: longGithubUrl,
          defaultBranch: 'main',
          selectedAt: '2026-03-17T12:00:00Z'
        }
      },
      githubRepoContext: {
        repo: {
          owner: 'sean',
          name: 'Orgumented-runtime-repo-with-a-very-long-selected-binding-name',
          fullName: longGithubRepo,
          private: true,
          visibility: 'private',
          url: longGithubUrl,
          defaultBranch: 'main'
        },
        branches: [
          {
            name: 'feature/very-long-branch-name-for-orgumented-review-context-rendering',
            protected: true,
            lastCommitSha: 'abcdef1234567890',
            lastCommitUrl: `${longGithubUrl}/commit/abcdef1234567890`
          }
        ],
        pullRequests: [
          {
            number: 42,
            title: 'Improve Orgumented review packet wiring for long selected repository bindings',
            state: 'open',
            author: 'sean',
            draft: false,
            headRef: 'feature/github-context',
            baseRef: 'main',
            updatedAt: '2026-03-18T12:00:00Z'
          }
        ]
      },
      githubPullRequestFiles: {
        repo: {
          owner: 'sean',
          name: 'Orgumented-runtime-repo-with-a-very-long-selected-binding-name',
          fullName: longGithubRepo,
          private: true,
          visibility: 'private',
          url: longGithubUrl,
          defaultBranch: 'main'
        },
        pullRequest: {
          number: 42,
          title: 'Improve Orgumented review packet wiring for long selected repository bindings',
          state: 'open',
          author: 'sean',
          draft: false,
          headRef: 'feature/github-context',
          baseRef: 'main',
          changedFileCount: 3,
          updatedAt: '2026-03-18T12:00:00Z'
        },
        files: [
          {
            filename: 'apps/api/src/modules/github/github.service.ts',
            status: 'modified',
            additions: 12,
            deletions: 3,
            changes: 15,
            blobUrl: `${longGithubUrl}/blob/main/apps/api/src/modules/github/github.service.ts`
          },
          {
            filename: 'apps/web/app/workspaces/connect/connect-workspace.tsx',
            status: 'renamed',
            additions: 8,
            deletions: 2,
            changes: 10,
            previousFilename: 'apps/web/app/workspaces/connect/legacy-connect-workspace.tsx',
            blobUrl: `${longGithubUrl}/blob/main/apps/web/app/workspaces/connect/connect-workspace.tsx`,
            patchTruncated: true
          }
        ],
        totalCount: 3,
        truncated: true
      },
      githubWorkflowCatalog: {
        repo: {
          owner: 'sean',
          name: 'Orgumented-runtime-repo-with-a-very-long-selected-binding-name',
          fullName: longGithubRepo,
          private: true,
          visibility: 'private',
          url: longGithubUrl,
          defaultBranch: 'main'
        },
        workflows: [
          {
            key: 'runtime_nightly',
            workflowFile: 'runtime-nightly.yml',
            name: 'Runtime Nightly',
            description: 'Build and smoke the packaged desktop runtime.',
            dispatchEnabled: true,
            inputs: []
          }
        ]
      },
      githubWorkflowRuns: {
        repo: {
          owner: 'sean',
          name: 'Orgumented-runtime-repo-with-a-very-long-selected-binding-name',
          fullName: longGithubRepo,
          private: true,
          visibility: 'private',
          url: longGithubUrl,
          defaultBranch: 'main'
        },
        workflow: {
          key: 'runtime_nightly',
          workflowFile: 'runtime-nightly.yml',
          name: 'Runtime Nightly',
          description: 'Build and smoke the packaged desktop runtime.',
          dispatchEnabled: true,
          inputs: []
        },
        runs: [
          {
            runId: 4001,
            runNumber: 18,
            status: 'completed',
            conclusion: 'success',
            branch: 'main',
            actor: 'sean',
            url: `${longGithubUrl}/actions/runs/4001`,
            updatedAt: '2026-03-18T12:30:00Z'
          }
        ],
        totalCount: 1,
        truncated: false
      },
      aliasInventory: [
        {
          alias: longAlias,
          username: longUsername,
          orgId: longOrgId,
          instanceUrl: longInstanceUrl,
          isDefault: true
        }
      ],
      githubAccessibleRepos: [
        {
          owner: 'sean',
          name: 'Orgumented-runtime-repo-with-a-very-long-selected-binding-name',
          fullName: longGithubRepo,
          private: true,
          visibility: 'private',
          url: longGithubUrl,
          defaultBranch: 'main',
          selected: true
        }
      ],
      githubSelectedRepo: {
        owner: 'sean',
        name: 'Orgumented-runtime-repo-with-a-very-long-selected-binding-name',
        fullName: longGithubRepo,
        private: true,
        visibility: 'private',
        url: longGithubUrl,
        defaultBranch: 'main',
        selected: true
      },
      recentSessionEvents: [],
      githubIssues: [],
      selectedAlias: {
        alias: longAlias,
        username: longUsername,
        orgId: longOrgId,
        instanceUrl: longInstanceUrl,
        isDefault: true
      },
      preflightIssues: [],
      toolingReady: true,
      toolStatusSource: 'live',
      browserSeeded: true,
      selectedAliasReady: true,
      runtimeUnavailable: false,
      runtimeBlocked: false,
      restoreAlias: longAlias,
      loading: false,
      onRefreshOverview: () => undefined,
      onLoadAliases: () => undefined,
      onCheckSession: () => undefined,
      onLoadSessionHistory: () => undefined,
      onCheckToolStatus: () => undefined,
      onPreflight: () => undefined,
      onBridgeAlias: () => undefined,
      onSwitchAlias: () => undefined,
      onConnectExistingAlias: () => undefined,
      onDisconnect: () => undefined,
      onRestoreLastSession: () => undefined,
      onSelectAlias: () => undefined,
      onInspectAlias: () => undefined,
      onRefreshGithubStatus: () => undefined,
      onAuthorizeGithub: () => undefined,
      onLoadGithubRepos: () => undefined,
      onLoadGithubRepoContext: () => undefined,
      onLoadGithubPullRequestFiles: () => undefined,
      onLoadGithubWorkflowCatalog: () => undefined,
      onLoadGithubWorkflowRuns: () => undefined,
      onDispatchGithubWorkflow: () => undefined,
      onCreateGithubRepo: () => undefined,
      onSelectGithubRepo: () => undefined
    } as any)
  );

  assert.match(connectMarkup, /<strong>Alias:<\/strong> <span class="path-value">shulman-uat-with-a-very-long-alias-name-that-must-wrap-cleanly<\/span>/);
  assert.match(
    connectMarkup,
    /<strong>Username:<\/strong> <span class="path-value">sbingham\.with\.a\.very\.long\.username@shulman-hill-with-a-very-long-domain-name\.example<\/span>/
  );
  assert.match(
    connectMarkup,
    /<strong>Instance URL:<\/strong> <span class="path-value">https:\/\/shulman-hill--uat\.sandbox\.my\.salesforce\.com\/services\/data\/v62\.0\/sobjects\/Very_Long_Resource_Name_With_Many_Segments<\/span>/
  );
  assert.match(connectMarkup, /<strong>Active alias:<\/strong> <span class="path-value">shulman-uat-with-a-very-long-alias-name-that-must-wrap-cleanly<\/span>/);
  assert.match(connectMarkup, /<strong><span class="path-value">shulman-uat-with-a-very-long-alias-name-that-must-wrap-cleanly<\/span><\/strong>/);
  assert.match(connectMarkup, /<strong>Selected repo:<\/strong> <span class="path-value">sean\/Orgumented-runtime-repo-with-a-very-long-selected-binding-name<\/span>/);
  assert.match(connectMarkup, /<strong>URL:<\/strong> <span class="path-value">https:\/\/github\.com\/sean\/Orgumented-runtime-repo-with-a-very-long-selected-binding-name<\/span>/);
  assert.match(connectMarkup, /Load Repo Context<\/button>/);
  assert.match(connectMarkup, /Load PR Files<\/button>/);
  assert.match(connectMarkup, /Load Workflows<\/button>/);
  assert.match(connectMarkup, /Dispatch Workflow<\/button>/);
  assert.match(connectMarkup, /Load Workflow Runs<\/button>/);
  assert.match(connectMarkup, /Selected repo context/);
  assert.match(connectMarkup, /GitHub Actions/);
  assert.match(connectMarkup, /Runtime Nightly/);
  assert.match(connectMarkup, /runtime-nightly\.yml/);
  assert.match(connectMarkup, /Pull request file scope/);
  assert.match(connectMarkup, /apps\/api\/src\/modules\/github\/github\.service\.ts/);
  assert.match(connectMarkup, /Previous path:/);
  assert.match(connectMarkup, /feature\/very-long-branch-name-for-orgumented-review-context-rendering/);
  assert.match(connectMarkup, /Improve Orgumented review packet wiring for long selected repository bindings/);
  assert.match(connectMarkup, /Authorize GitHub<\/button>/);
  assert.match(connectMarkup, /Create Repo<\/button>/);
  assert.match(connectMarkup, /Use Repo<\/button>/);
  assert.match(connectMarkup, /<summary>Advanced session tools<\/summary>/);
  assert.match(connectMarkup, /<summary>GitHub repo tools<\/summary>/);
  assert.match(connectMarkup, /<summary>Accessible repos<\/summary>/);
  assert.match(connectMarkup, /<summary>Repo context<\/summary>/);
  assert.match(connectMarkup, /<summary>GitHub Actions<\/summary>/);
  assert.match(connectMarkup, /<summary>Pull request file scope<\/summary>/);
  assert.match(connectMarkup, /Bridge CCI Alias<\/button>/);
  assert.doesNotMatch(connectMarkup, /<p class="panel-caption">Operator commands<\/p>/);
}

run();
