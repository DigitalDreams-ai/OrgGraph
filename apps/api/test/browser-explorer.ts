import assert from 'node:assert/strict';
import {
  assessMetadataCatalogCoverage,
  describeMetadataCatalogCoverage,
  buildMemberTree,
  filterMetadataCatalogTypes
} from '../../web/app/workspaces/browser/browser-explorer';
import type { MetadataCatalogPayload } from '../../web/app/workspaces/browser/types';

const fullCatalog: MetadataCatalogPayload = {
  source: 'metadata_api',
  refreshedAt: '2026-03-08T00:00:00Z',
  totalTypes: 3,
  types: [
    { type: 'ApexClass', memberCount: 2 },
    { type: 'CustomObject', memberCount: 4 },
    { type: 'Layout', memberCount: 1 }
  ]
};

function run(): void {
  const tree = buildMemberTree([
    'Opportunity.StageName',
    'Opportunity.CloseDate',
    'Account.Name',
    'flows/Civil_Rights_Intake_Questionnaire'
  ]);

  assert.deepEqual(
    tree.map((node) => node.label),
    ['Account', 'flows', 'Opportunity'],
    'tree should group members into deterministic top-level folders'
  );
  assert.equal(tree.find((node) => node.label === 'Opportunity')?.children.length, 2);
  assert.equal(
    tree.find((node) => node.label === 'flows')?.children[0]?.label,
    'Civil_Rights_Intake_Questionnaire'
  );

  const filteredByType = filterMetadataCatalogTypes(fullCatalog.types, 'layout');
  assert.deepEqual(
    filteredByType.map((entry) => entry.type),
    ['Layout'],
    'family filter should match direct type names'
  );

  const filteredByDescriptor = filterMetadataCatalogTypes(
    [
      ...fullCatalog.types,
      {
        type: 'CustomField',
        memberCount: 12,
        directoryName: 'objects',
        childXmlNames: ['ValidationRule']
      }
    ],
    'validation rule'
  );
  assert.deepEqual(
    filteredByDescriptor.map((entry) => entry.type),
    ['CustomField'],
    'family filter should match normalized descriptor text'
  );

  const fullCoverage = assessMetadataCatalogCoverage(fullCatalog, []);
  assert.equal(fullCoverage.state, 'full');
  assert.match(fullCoverage.summary, /live metadata family coverage/i);
  const fullPanel = describeMetadataCatalogCoverage(fullCatalog, []);
  assert.equal(fullPanel.badgeLabel, 'Live coverage');
  assert.equal(fullPanel.countsLabel, '3 of 3 families visible');
  assert.match(fullPanel.nextStep, /search by metadata name/i);

  const localCoverage = assessMetadataCatalogCoverage(
    {
      ...fullCatalog,
      source: 'local'
    },
    []
  );
  assert.equal(localCoverage.state, 'limited');
  assert.ok(
    localCoverage.reasons.some((reason) => /local parse path/i.test(reason)),
    'local-only catalog should report limited coverage'
  );

  const fallbackCoverage = assessMetadataCatalogCoverage(fullCatalog, [
    'live metadata family discovery unavailable; using non-cached fallback family set'
  ]);
  assert.equal(fallbackCoverage.state, 'limited');
  assert.ok(
    fallbackCoverage.reasons.some((reason) => /fell back/i.test(reason)),
    'fallback warning should report limited coverage'
  );
  const fallbackPanel = describeMetadataCatalogCoverage(fullCatalog, [
    'live metadata family discovery unavailable; using non-cached fallback family set'
  ]);
  assert.equal(fallbackPanel.badgeLabel, 'Coverage limited');
  assert.match(fallbackPanel.nextStep, /force refresh/i);

  const truncatedCoverage = assessMetadataCatalogCoverage(
    {
      ...fullCatalog,
      totalTypes: 125,
      types: fullCatalog.types.slice(0, 3)
    },
    ['result truncated to limit=3']
  );
  assert.equal(truncatedCoverage.state, 'limited');
  assert.ok(
    truncatedCoverage.reasons.some((reason) => /truncating the visible family list/i.test(reason)),
    'truncation warning should report limited coverage'
  );
  const truncatedPanel = describeMetadataCatalogCoverage(
    {
      ...fullCatalog,
      totalTypes: 125,
      types: fullCatalog.types.slice(0, 3)
    },
    ['result truncated to limit=3']
  );
  assert.equal(truncatedPanel.countsLabel, '3 of 125 families visible');
  assert.match(truncatedPanel.nextStep, /increase search\/member limit/i);

  const unavailableCoverage = assessMetadataCatalogCoverage(null, []);
  assert.equal(unavailableCoverage.state, 'unavailable');
  assert.match(unavailableCoverage.summary, /not loaded yet/i);
  const unavailablePanel = describeMetadataCatalogCoverage(null, []);
  assert.equal(unavailablePanel.badgeLabel, 'Not loaded');
  assert.match(unavailablePanel.nextStep, /load all families/i);

  console.log('browser explorer test passed');
}

run();
