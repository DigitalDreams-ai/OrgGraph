import assert from 'node:assert/strict';
import { buildRetrieveAwarePromptGroups } from '../../web/app/workspaces/ask/retrieve-aware-prompts';
import type { MetadataSelection } from '../../web/app/workspaces/browser/types';

function run(): void {
  const selections: MetadataSelection[] = [
    { type: 'Flow', members: ['Civil_Rights_Intake_Questionnaire', 'OpportunityStageSync'] },
    { type: 'CustomObject', members: ['Opportunity', 'Case'] },
    { type: 'CustomField', members: ['Opportunity.StageName', 'Case.Status'] }
  ];

  const prompts = buildRetrieveAwarePromptGroups(selections);

  assert.deepEqual(prompts.groundedPrompts, [
    'Based only on the latest retrieve, explain what Flow Civil_Rights_Intake_Questionnaire reads and writes.',
    'Based only on the latest retrieve, explain what Flow OpportunityStageSync reads and writes.'
  ]);

  assert.ok(
    prompts.followUpPrompts.includes('What touches Opportunity.StageName?'),
    'retrieved field prompts should include impact follow-ups'
  );
  assert.ok(
    prompts.followUpPrompts.includes('Who can edit Opportunity.StageName?'),
    'retrieved field prompts should include permission follow-ups'
  );
  assert.ok(
    prompts.followUpPrompts.includes('What automations update Case.Status?'),
    'retrieved field prompts should include automation follow-ups'
  );
  assert.ok(
    prompts.followUpPrompts.includes('What runs on object Opportunity?'),
    'retrieved object prompts should include automation follow-ups'
  );
  assert.ok(
    prompts.followUpPrompts.includes('Who can edit object Case?'),
    'retrieved object prompts should include permission follow-ups'
  );

  const deduped = buildRetrieveAwarePromptGroups([
    { type: 'Flow', members: ['OpportunityStageSync', 'OpportunityStageSync'] },
    { type: 'CustomField', members: ['Opportunity.StageName', 'Opportunity.StageName'] }
  ]);
  assert.equal(deduped.groundedPrompts.length, 1);
  assert.equal(
    deduped.followUpPrompts.filter((prompt) => prompt === 'What touches Opportunity.StageName?').length,
    1
  );

  console.log('ask retrieve prompts test passed');
}

run();
