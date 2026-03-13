import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrowserWorkspace } from '../app/workspaces/browser/browser-workspace';
import type {
  MetadataCatalogPayload,
  MetadataRetrieveResultView,
  MetadataSelectionSummary
} from '../app/workspaces/browser/types';

function buildCatalog(
  overrides: Partial<MetadataCatalogPayload> = {}
): MetadataCatalogPayload {
  return {
    source: 'metadata_api',
    refreshedAt: '2026-03-13T01:00:00Z',
    totalTypes: 1,
    types: [
      {
        type: 'CustomField',
        memberCount: 37,
        directoryName: 'objects',
        inFolder: false,
        metaFile: true,
        suffix: 'field-meta.xml',
        childFamilyCount: 0
      }
    ],
    ...overrides
  };
}

function buildRetrieve(): MetadataRetrieveResultView {
  return {
    alias: 'shulman-uat',
    status: 'completed',
    parsePath:
      'C:/Users/sean/AppData/Roaming/Orgumented/sf-project/force-app/main/default/objects/Opportunity/fields/Very_Long_Field_Name_With_Many_Segments__c.field-meta.xml',
    metadataArgs: [
      'CustomField:Opportunity.Very_Long_Field_Name_With_Many_Segments__c',
      'Flow:Civil_Rights_Intake_Questionnaire_With_An_Extra_Long_Identifier'
    ],
    autoRefresh: true,
    completedAt: '2026-03-13T01:01:00Z',
    refresh: {
      nodeCount: 2824,
      edgeCount: 4356,
      evidenceCount: 15746
    }
  };
}

function run(): void {
  const longMember =
    'Opportunity.Very_Long_Field_Name_With_Many_Segments__c/Deeply_Nested_Component_Name_That_Must_Not_Clip';
  const selectionSummary: MetadataSelectionSummary = {
    typeCount: 1,
    memberCount: 1
  };

  const markup = renderToStaticMarkup(
    React.createElement(BrowserWorkspace, {
      activeAlias: 'shulman-uat',
      selectedAlias: 'shulman-uat',
      metadataSearch: '',
      setMetadataSearch: () => undefined,
      metadataFamilySearch: '',
      setMetadataFamilySearch: () => undefined,
      metadataMemberSearch: '',
      setMetadataMemberSearch: () => undefined,
      metadataLimitRaw: '200',
      setMetadataLimitRaw: () => undefined,
      metadataForceRefresh: false,
      setMetadataForceRefresh: () => undefined,
      metadataAutoRefresh: true,
      setMetadataAutoRefresh: () => undefined,
      metadataCatalog: buildCatalog(),
      metadataSearchResults: [],
      metadataMembersByType: {},
      metadataLoadingType: '',
      metadataWarnings: [],
      metadataSelectionsPreview: '{"types":["CustomField"]}',
      selectedMetadata: [
        {
          type: 'CustomField',
          members: [longMember]
        }
      ],
      selectionSummary,
      visibleCatalogTypes: ['CustomField'],
      lastMetadataRetrieve: buildRetrieve(),
      metadataCatalogRequested: true,
      loading: false,
      onRefreshTypes: () => undefined,
      onRefreshExplorer: () => undefined,
      onLoadVisibleMembers: () => undefined,
      onClearFilters: () => undefined,
      onClearSelections: () => undefined,
      onLoadMembers: () => undefined,
      getTypeSelectionState: (): 'none' | 'partial' | 'all' => 'partial',
      isMemberSelected: () => true,
      onSetTypeSelected: () => undefined,
      onSetMemberSelected: () => undefined,
      onSetMembersSelected: () => undefined,
      onRemoveType: () => undefined,
      onRemoveMember: () => undefined,
      onRetrieveSelected: () => undefined,
      onOpenRefresh: () => undefined
    })
  );

  assert.match(
    markup,
    /<strong>Parse path:<\/strong>\s*<span class="path-value">C:\/Users\/sean\/AppData\/Roaming\/Orgumented\/sf-project\/force-app\/main\/default\/objects\/Opportunity\/fields\/Very_Long_Field_Name_With_Many_Segments__c\.field-meta\.xml<\/span>/
  );
  assert.match(
    markup,
    /<strong>Metadata args:<\/strong>\s*<span class="path-value">CustomField:Opportunity\.Very_Long_Field_Name_With_Many_Segments__c Flow:Civil_Rights_Intake_Questionnaire_With_An_Extra_Long_Identifier<\/span>/
  );
  assert.match(
    markup,
    /<button[^>]*class="ghost chip-btn"[^>]*>\s*<span class="path-value">Opportunity\.Very_Long_Field_Name_With_Many_Segments__c\/Deeply_Nested_Component_Name_That_Must_Not_Clip<\/span>\s*<span aria-hidden="true">×<\/span>\s*<\/button>/
  );

  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(css, /\.selection-members button\s*\{[\s\S]*min-width:\s*0;[\s\S]*max-width:\s*100%;/);
  assert.match(
    css,
    /\.metadata-family-count\s*\{[\s\S]*min-width:\s*0;[\s\S]*overflow-wrap:\s*anywhere;[\s\S]*word-break:\s*break-word;/
  );
  assert.match(css, /\.citation-list li\s*\{[\s\S]*min-width:\s*0;[\s\S]*overflow-wrap:\s*anywhere;[\s\S]*word-break:\s*break-word;/);
  assert.match(
    css,
    /\.workflow-step-list\s*\{[\s\S]*min-width:\s*0;[\s\S]*overflow-wrap:\s*anywhere;[\s\S]*word-break:\s*break-word;/
  );

  const limitedMarkup = renderToStaticMarkup(
    React.createElement(BrowserWorkspace, {
      activeAlias: 'shulman-uat',
      selectedAlias: 'shulman-uat',
      metadataSearch: '',
      setMetadataSearch: () => undefined,
      metadataFamilySearch: '',
      setMetadataFamilySearch: () => undefined,
      metadataMemberSearch: '',
      setMetadataMemberSearch: () => undefined,
      metadataLimitRaw: '25',
      setMetadataLimitRaw: () => undefined,
      metadataForceRefresh: false,
      setMetadataForceRefresh: () => undefined,
      metadataAutoRefresh: true,
      setMetadataAutoRefresh: () => undefined,
      metadataCatalog: buildCatalog({
        totalTypes: 250,
        types: [
          {
            type: 'CustomField',
            memberCount: 37,
            directoryName: 'objects',
            inFolder: false,
            metaFile: true,
            suffix: 'field-meta.xml',
            childFamilyCount: 0
          }
        ]
      }),
      metadataSearchResults: [],
      metadataMembersByType: {},
      metadataLoadingType: '',
      metadataWarnings: [
        'Live metadata family discovery unavailable: C:/Users/sean/AppData/Roaming/Orgumented/very/deep/operator/path/with/a/long/discovery-warning-that-must-wrap-cleanly-and-remain-readable.txt',
        'result truncated to limit=25'
      ],
      metadataSelectionsPreview: '{"types":[]}',
      selectedMetadata: [],
      selectionSummary: {
        typeCount: 0,
        memberCount: 0
      },
      visibleCatalogTypes: ['CustomField'],
      lastMetadataRetrieve: null,
      metadataCatalogRequested: true,
      loading: false,
      onRefreshTypes: () => undefined,
      onRefreshExplorer: () => undefined,
      onLoadVisibleMembers: () => undefined,
      onClearFilters: () => undefined,
      onClearSelections: () => undefined,
      onLoadMembers: () => undefined,
      getTypeSelectionState: (): 'none' | 'partial' | 'all' => 'none',
      isMemberSelected: () => false,
      onSetTypeSelected: () => undefined,
      onSetMemberSelected: () => undefined,
      onSetMembersSelected: () => undefined,
      onRemoveType: () => undefined,
      onRemoveMember: () => undefined,
      onRetrieveSelected: () => undefined,
      onOpenRefresh: () => undefined
    })
  );

  assert.match(limitedMarkup, /Catalog coverage: limited/);
  assert.match(limitedMarkup, /Coverage limited/);
  assert.match(limitedMarkup, /Do not treat this as full org inventory yet/);
  assert.match(limitedMarkup, /Load Full Family Catalog/);
  assert.match(limitedMarkup, /result truncated to limit=25/);
  assert.match(
    limitedMarkup,
    /Live metadata family discovery unavailable: C:\/Users\/sean\/AppData\/Roaming\/Orgumented\/very\/deep\/operator\/path\/with\/a\/long\/discovery-warning-that-must-wrap-cleanly-and-remain-readable\.txt/
  );
}

run();
