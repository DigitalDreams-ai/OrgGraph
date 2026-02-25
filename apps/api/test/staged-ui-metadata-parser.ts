import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NODE_TYPES } from '@orggraph/ontology';
import { StagedUiMetadataParserService } from '../src/ingestion/staged-ui-metadata-parser.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orggraph-ui-metadata-'));
  fs.mkdirSync(path.join(root, 'pages'), { recursive: true });
  fs.mkdirSync(path.join(root, 'lwc', 'recordSummary'), { recursive: true });
  fs.mkdirSync(path.join(root, 'aura', 'CaseWidget'), { recursive: true });
  fs.mkdirSync(path.join(root, 'quickActions'), { recursive: true });
  fs.mkdirSync(path.join(root, 'layouts'), { recursive: true });

  fs.writeFileSync(path.join(root, 'pages', 'OpportunityReview.page'), '<apex:page/>', 'utf8');
  fs.writeFileSync(
    path.join(root, 'quickActions', 'Opportunity.MarkWon.quickAction-meta.xml'),
    '<QuickAction/>',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'layouts', 'Opportunity-Opportunity Layout.layout-meta.xml'),
    '<Layout/>',
    'utf8'
  );

  const parser = new StagedUiMetadataParserService();
  const payload = parser.parseFromFixtures(root);

  assert.ok(
    payload.nodes.find((node) => node.type === NODE_TYPES.APEX_PAGE && node.name === 'OpportunityReview'),
    'ApexPage node should exist'
  );
  assert.ok(
    payload.nodes.find(
      (node) => node.type === NODE_TYPES.LIGHTNING_COMPONENT_BUNDLE && node.name === 'recordSummary'
    ),
    'LightningComponentBundle node should exist'
  );
  assert.ok(
    payload.nodes.find((node) => node.type === NODE_TYPES.AURA_DEFINITION_BUNDLE && node.name === 'CaseWidget'),
    'AuraDefinitionBundle node should exist'
  );
  assert.ok(
    payload.nodes.find((node) => node.type === NODE_TYPES.QUICK_ACTION && node.name === 'Opportunity.MarkWon'),
    'QuickAction node should exist'
  );
  assert.ok(
    payload.nodes.find(
      (node) => node.type === NODE_TYPES.LAYOUT && node.name === 'Opportunity-Opportunity Layout'
    ),
    'Layout node should exist'
  );

  fs.rmSync(root, { recursive: true, force: true });
  console.log('staged ui metadata parser test passed');
}

run();
