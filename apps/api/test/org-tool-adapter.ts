import assert from 'node:assert/strict';
import { OrgToolAdapterService } from '../src/modules/org/org-tool-adapter.service';

async function run(): Promise<void> {
  const adapter = new OrgToolAdapterService({} as never, {} as never);

  const metadataTypesWithTrailingWarning =
    JSON.stringify(
      {
        status: 0,
        result: {
          metadataObjects: [{ xmlName: 'ApexClass' }, { xmlName: 'Layout' }, { xmlName: 'Flow' }]
        }
      },
      null,
      2
    ) + '\n \u00BB   Warning: @salesforce/cli update available from 2.124.7 to 2.125.2.';

  assert.deepEqual(adapter.parseMetadataTypes(metadataTypesWithTrailingWarning), [
    'ApexClass',
    'Flow',
    'Layout'
  ]);

  const metadataTypesWithLeadingAnsiWarning = [
    '\u001b[33mWarning: plugin telemetry notice\u001b[39m',
    JSON.stringify({
      status: 0,
      result: {
        metadataObjects: [{ xmlName: 'CustomObject' }, { xmlName: 'ApexClass' }]
      }
    })
  ].join('\n');

  assert.deepEqual(adapter.parseMetadataTypes(metadataTypesWithLeadingAnsiWarning), [
    'ApexClass',
    'CustomObject'
  ]);

  const metadataTypesWithTrailingNotice = [
    JSON.stringify({
      status: 0,
      result: {
        metadataObjects: [{ xmlName: 'Profile' }, { xmlName: 'RecordType' }]
      }
    }),
    '@salesforce/cli update available from 2.124.7 to 2.125.2.'
  ].join('\n');

  assert.deepEqual(adapter.parseMetadataTypes(metadataTypesWithTrailingNotice), [
    'Profile',
    'RecordType'
  ]);

  const metadataMembersWithTrailingWarning =
    JSON.stringify(
      {
        status: 0,
        result: [
          { type: 'Layout', fullName: 'Opportunity-Opportunity Layout' },
          { type: 'Layout', fullName: 'Account-Account Layout' }
        ]
      },
      null,
      2
    ) + '\n \u00BB   Warning: some non-fatal warning';

  assert.deepEqual(adapter.parseMetadataList(metadataMembersWithTrailingWarning), [
    { type: 'Layout', fullName: 'Opportunity-Opportunity Layout', fileName: undefined },
    { type: 'Layout', fullName: 'Account-Account Layout', fileName: undefined }
  ]);

  const metadataMembersWithTrailingNotice = [
    JSON.stringify({
      status: 0,
      result: [{ type: 'ApexClass', fullName: 'OpportunitySyncService' }]
    }),
    '@salesforce/cli update available from 2.124.7 to 2.125.2.'
  ].join('\n');

  assert.deepEqual(adapter.parseMetadataList(metadataMembersWithTrailingNotice), [
    { type: 'ApexClass', fullName: 'OpportunitySyncService', fileName: undefined }
  ]);

  const orgDisplayWithLeadingWarning = [
    'Warning: plugin telemetry notice',
    JSON.stringify({
      status: 0,
      result: {
        username: 'user@example.com',
        id: '00Dxx0000000001',
        instanceUrl: 'https://example.my.salesforce.com'
      }
    })
  ].join('\n');

  assert.deepEqual(adapter.parseDisplayedOrg(orgDisplayWithLeadingWarning), {
    username: 'user@example.com',
    orgId: '00Dxx0000000001',
    instanceUrl: 'https://example.my.salesforce.com'
  });

  console.log('org tool adapter parser test passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
