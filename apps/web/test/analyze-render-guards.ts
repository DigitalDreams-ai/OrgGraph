import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalyzeWorkspace } from '../app/workspaces/analyze/analyze-workspace';

function run(): void {
  const permissionMarkup = renderToStaticMarkup(
    React.createElement(AnalyzeWorkspace, {
      analyzeMode: 'perms',
      setAnalyzeMode: () => undefined,
      user: 'sbingham@example.com',
      setUser: () => undefined,
      objectName: 'Opportunity',
      setObjectName: () => undefined,
      fieldName: 'Opportunity.StageName',
      setFieldName: () => undefined,
      systemPermission: 'ManageUsers',
      setSystemPermission: () => undefined,
      limitRaw: '25',
      setLimitRaw: () => undefined,
      strictMode: true,
      setStrictMode: () => undefined,
      explainMode: false,
      setExplainMode: () => undefined,
      debugMode: false,
      setDebugMode: () => undefined,
      permissionsResult: {
        user: 'sbingham@example.com',
        object: 'Opportunity',
        field: 'Opportunity.StageName',
        granted: false,
        objectGranted: true,
        fieldGranted: false,
        mappingStatus: 'resolved',
        principalsChecked: ['Profile:Sales_User'],
        paths: [
          {
            principal: 'Profile:Sales_User',
            path: [
              { from: 'Profile:Sales_User', rel: 'grants', to: 'Object:Opportunity' },
              { from: 'Object:Opportunity', rel: 'blocks', to: 'Field:Opportunity.StageName' }
            ]
          }
        ],
        totalPaths: 1,
        truncated: false,
        explanation: 'Field access is blocked.',
        warnings: []
      },
      permissionDiagnosis: {
        user: 'sbingham@example.com',
        mapExists: true,
        mappingStatus: 'resolved',
        principals: ['Profile:Sales_User'],
        warnings: [],
        stale: false,
        staleThresholdHours: 24,
        mapAgeHours: 2,
        mapPath: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\maps\\principal-map.json'
      },
      automationResult: null,
      impactResult: null,
      systemPermissionResult: null,
      loading: false,
      onRunPermissions: () => undefined,
      onDiagnoseUserMapping: () => undefined,
      onRunAutomation: () => undefined,
      onRunImpact: () => undefined,
      onRunSystemPermission: () => undefined,
      onOpenAsk: () => undefined,
      onOpenBrowser: () => undefined,
      onOpenRefresh: () => undefined
    } as any)
  );
  assert.match(permissionMarkup, /<span class="path-value">Profile:Sales_User -grants-&gt; Object:Opportunity \| Object:Opportunity -blocks-&gt; Field:Opportunity.StageName<\/span>/);
  assert.match(permissionMarkup, /<p class="path-value">C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\maps\\principal-map\.json<\/p>/);

  const mappingRecoveryMarkup = renderToStaticMarkup(
    React.createElement(AnalyzeWorkspace, {
      analyzeMode: 'perms',
      setAnalyzeMode: () => undefined,
      user: 'sbingham@example.com',
      setUser: () => undefined,
      objectName: 'Opportunity',
      setObjectName: () => undefined,
      fieldName: 'Opportunity.StageName',
      setFieldName: () => undefined,
      systemPermission: 'ManageUsers',
      setSystemPermission: () => undefined,
      limitRaw: '25',
      setLimitRaw: () => undefined,
      strictMode: true,
      setStrictMode: () => undefined,
      explainMode: false,
      setExplainMode: () => undefined,
      debugMode: false,
      setDebugMode: () => undefined,
      permissionsResult: null,
      permissionDiagnosis: {
        user: 'sbingham@example.com',
        mapExists: false,
        mappingStatus: 'unmapped_user',
        principals: [],
        warnings: ['Principal map missing.'],
        stale: false,
        staleThresholdHours: 24,
        mapAgeHours: undefined,
        mapPath: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\maps\\principal-map.json'
      },
      automationResult: null,
      impactResult: null,
      systemPermissionResult: null,
      loading: false,
      onRunPermissions: () => undefined,
      onDiagnoseUserMapping: () => undefined,
      onRunAutomation: () => undefined,
      onRunImpact: () => undefined,
      onRunSystemPermission: () => undefined,
      onOpenAsk: () => undefined,
      onOpenBrowser: () => undefined,
      onOpenRefresh: () => undefined
    } as any)
  );
  assert.match(mappingRecoveryMarkup, />Open Org Browser</);
  assert.match(mappingRecoveryMarkup, />Open Refresh &amp; Build</);

  const automationRecoveryMarkup = renderToStaticMarkup(
    React.createElement(AnalyzeWorkspace, {
      analyzeMode: 'automation',
      setAnalyzeMode: () => undefined,
      user: 'sbingham@example.com',
      setUser: () => undefined,
      objectName: 'Opportunity',
      setObjectName: () => undefined,
      fieldName: 'Opportunity.StageName',
      setFieldName: () => undefined,
      systemPermission: 'ManageUsers',
      setSystemPermission: () => undefined,
      limitRaw: '25',
      setLimitRaw: () => undefined,
      strictMode: true,
      setStrictMode: () => undefined,
      explainMode: false,
      setExplainMode: () => undefined,
      debugMode: false,
      setDebugMode: () => undefined,
      permissionsResult: null,
      permissionDiagnosis: null,
      automationResult: {
        object: 'Opportunity',
        strictMode: true,
        minConfidenceApplied: 0.7,
        automations: [],
        totalAutomations: 0,
        truncated: false,
        relationsChecked: ['updates'],
        explanation: 'No deterministic automation match found.'
      },
      impactResult: null,
      systemPermissionResult: null,
      loading: false,
      onRunPermissions: () => undefined,
      onDiagnoseUserMapping: () => undefined,
      onRunAutomation: () => undefined,
      onRunImpact: () => undefined,
      onRunSystemPermission: () => undefined,
      onOpenAsk: () => undefined,
      onOpenBrowser: () => undefined,
      onOpenRefresh: () => undefined
    } as any)
  );
  assert.match(automationRecoveryMarkup, />Open Org Browser</);
  assert.match(automationRecoveryMarkup, />Open Refresh &amp; Build</);
  assert.doesNotMatch(automationRecoveryMarkup, />Open Ask for Automation Scope</);

  const impactMarkup = renderToStaticMarkup(
    React.createElement(AnalyzeWorkspace, {
      analyzeMode: 'impact',
      setAnalyzeMode: () => undefined,
      user: 'sbingham@example.com',
      setUser: () => undefined,
      objectName: 'Opportunity',
      setObjectName: () => undefined,
      fieldName: 'Opportunity.StageName',
      setFieldName: () => undefined,
      systemPermission: 'ManageUsers',
      setSystemPermission: () => undefined,
      limitRaw: '25',
      setLimitRaw: () => undefined,
      strictMode: true,
      setStrictMode: () => undefined,
      explainMode: false,
      setExplainMode: () => undefined,
      debugMode: false,
      setDebugMode: () => undefined,
      permissionsResult: null,
      permissionDiagnosis: null,
      automationResult: null,
      impactResult: {
        field: 'Opportunity.StageName',
        strictMode: true,
        explainMode: false,
        minConfidenceApplied: 0.7,
        paths: [
          {
            from: 'Field:Opportunity.StageName',
            to: 'Flow:Civil_Rights_Intake_Questionnaire',
            rel: 'reads',
            confidence: 0.91,
            score: 0.91
          }
        ],
        totalPaths: 1,
        truncated: false,
        relationsChecked: ['reads'],
        explanation: 'Impact found.'
      },
      systemPermissionResult: null,
      loading: false,
      onRunPermissions: () => undefined,
      onDiagnoseUserMapping: () => undefined,
      onRunAutomation: () => undefined,
      onRunImpact: () => undefined,
      onRunSystemPermission: () => undefined,
      onOpenAsk: () => undefined,
      onOpenBrowser: () => undefined,
      onOpenRefresh: () => undefined
    } as any)
  );
  assert.match(impactMarkup, /<span class="path-value">Field:Opportunity\.StageName<\/span> -&gt; <span class="path-value">Flow:Civil_Rights_Intake_Questionnaire<\/span>/);

  const impactRecoveryMarkup = renderToStaticMarkup(
    React.createElement(AnalyzeWorkspace, {
      analyzeMode: 'impact',
      setAnalyzeMode: () => undefined,
      user: 'sbingham@example.com',
      setUser: () => undefined,
      objectName: 'Opportunity',
      setObjectName: () => undefined,
      fieldName: 'Opportunity.StageName',
      setFieldName: () => undefined,
      systemPermission: 'ManageUsers',
      setSystemPermission: () => undefined,
      limitRaw: '25',
      setLimitRaw: () => undefined,
      strictMode: true,
      setStrictMode: () => undefined,
      explainMode: false,
      setExplainMode: () => undefined,
      debugMode: false,
      setDebugMode: () => undefined,
      permissionsResult: null,
      permissionDiagnosis: null,
      automationResult: null,
      impactResult: {
        field: 'Opportunity.StageName',
        strictMode: true,
        explainMode: false,
        minConfidenceApplied: 0.7,
        paths: [],
        totalPaths: 0,
        truncated: false,
        relationsChecked: ['reads', 'writes'],
        explanation: 'No deterministic impact path matched the request.'
      },
      systemPermissionResult: null,
      loading: false,
      onRunPermissions: () => undefined,
      onDiagnoseUserMapping: () => undefined,
      onRunAutomation: () => undefined,
      onRunImpact: () => undefined,
      onRunSystemPermission: () => undefined,
      onOpenAsk: () => undefined,
      onOpenBrowser: () => undefined,
      onOpenRefresh: () => undefined
    } as any)
  );
  assert.match(impactRecoveryMarkup, />Open Org Browser</);
  assert.match(impactRecoveryMarkup, />Open Refresh &amp; Build</);
  assert.doesNotMatch(impactRecoveryMarkup, />Open Ask for Impact Scope</);

  const systemMarkup = renderToStaticMarkup(
    React.createElement(AnalyzeWorkspace, {
      analyzeMode: 'system',
      setAnalyzeMode: () => undefined,
      user: 'sbingham@example.com',
      setUser: () => undefined,
      objectName: 'Opportunity',
      setObjectName: () => undefined,
      fieldName: 'Opportunity.StageName',
      setFieldName: () => undefined,
      systemPermission: 'ManageUsers',
      setSystemPermission: () => undefined,
      limitRaw: '25',
      setLimitRaw: () => undefined,
      strictMode: true,
      setStrictMode: () => undefined,
      explainMode: false,
      setExplainMode: () => undefined,
      debugMode: false,
      setDebugMode: () => undefined,
      permissionsResult: null,
      permissionDiagnosis: null,
      automationResult: null,
      impactResult: null,
      systemPermissionResult: {
        user: 'sbingham@example.com',
        permission: 'ManageUsers',
        granted: true,
        mappingStatus: 'resolved',
        principalsChecked: ['Profile:System_Administrator'],
        paths: [
          {
            principal: 'Profile:System_Administrator',
            permission: 'ManageUsers',
            path: [
              { from: 'Profile:System_Administrator', rel: 'grants', to: 'SystemPermission:ManageUsers' }
            ]
          }
        ],
        totalPaths: 1,
        truncated: false,
        explanation: 'Permission granted.',
        warnings: []
      },
      loading: false,
      onRunPermissions: () => undefined,
      onDiagnoseUserMapping: () => undefined,
      onRunAutomation: () => undefined,
      onRunImpact: () => undefined,
      onRunSystemPermission: () => undefined,
      onOpenAsk: () => undefined,
      onOpenBrowser: () => undefined,
      onOpenRefresh: () => undefined
    } as any)
  );
  assert.match(systemMarkup, /<span class="path-value">Profile:System_Administrator<\/span> -&gt; <span class="path-value">ManageUsers<\/span>/);
  assert.match(systemMarkup, /<span class="path-value">Profile:System_Administrator -grants-&gt; SystemPermission:ManageUsers<\/span>/);
}

run();
