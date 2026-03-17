import assert from 'node:assert/strict';
import { buildRetrieveAwarePromptGroups } from '../../web/app/workspaces/ask/retrieve-aware-prompts';
import type { MetadataSelection } from '../../web/app/workspaces/browser/types';

function run(): void {
  const selections: MetadataSelection[] = [
    { type: 'Flow', members: ['Civil_Rights_Intake_Questionnaire', 'OpportunityStageSync'] },
    { type: 'CustomObject', members: ['Opportunity', 'Case'] },
    { type: 'CustomField', members: ['Opportunity.StageName', 'Case.Status'] },
    { type: 'Layout', members: ['Opportunity-Opportunity Layout'] },
    { type: 'ApexClass', members: ['CaseTypeService'] },
    { type: 'ApexTrigger', members: ['CaseBeforeUpdate'] },
    { type: 'EmailTemplate', members: ['unfiled$public/Customer_Welcome'] },
    { type: 'ConnectedApp', members: ['OrgumentedAPI'] },
    { type: 'PermissionSetGroup', members: ['Support_Users'] },
    { type: 'CustomPermission', members: ['CanApproveIntake'] }
  ];

  const prompts = buildRetrieveAwarePromptGroups(selections);

  assert.deepEqual(prompts.groundedPrompts, [
    'Based only on the latest retrieve, explain what Flow Civil_Rights_Intake_Questionnaire reads and writes.',
    'Based only on the latest retrieve, explain what Flow OpportunityStageSync reads and writes.',
    'Based only on the latest retrieve, what automations update Case.Status?',
    'Based only on the latest retrieve, what automations update Opportunity.StageName?',
    'Based only on the latest retrieve, what runs on object Case?',
    'Based only on the latest retrieve, what runs on object Opportunity?',
    'Based only on the latest retrieve, what touches Case.Status?',
    'Based only on the latest retrieve, what touches Opportunity.StageName?',
    'Based only on the latest retrieve, where is Apex Class CaseTypeService used?',
    'Based only on the latest retrieve, where is Apex Trigger CaseBeforeUpdate used?',
    'Based only on the latest retrieve, where is Connected App OrgumentedAPI used?',
    'Based only on the latest retrieve, where is Custom Field Case.Status used?',
    'Based only on the latest retrieve, where is Custom Field Opportunity.StageName used?',
    'Based only on the latest retrieve, where is Custom Object Case used?',
    'Based only on the latest retrieve, where is Custom Object Opportunity used?',
    'Based only on the latest retrieve, where is Custom Permission CanApproveIntake used?',
    'Based only on the latest retrieve, where is Email Template unfiled$public/Customer_Welcome used?',
    'Based only on the latest retrieve, where is Flow Civil_Rights_Intake_Questionnaire used?',
    'Based only on the latest retrieve, where is Flow OpportunityStageSync used?',
    'Based only on the latest retrieve, where is Layout Opportunity-Opportunity Layout used?',
    'Based only on the latest retrieve, where is Permission Set Group Support_Users used?'
  ]);

  assert.ok(
    prompts.followUpPrompts.includes('Who can edit Opportunity.StageName?'),
    'retrieved field prompts should include permission follow-ups'
  );
  assert.ok(
    prompts.followUpPrompts.includes('Who can edit object Case?'),
    'retrieved object prompts should include permission follow-ups'
  );

  const deduped = buildRetrieveAwarePromptGroups([
    { type: 'Flow', members: ['OpportunityStageSync', 'OpportunityStageSync'] },
    { type: 'CustomField', members: ['Opportunity.StageName', 'Opportunity.StageName'] }
  ]);
  assert.equal(deduped.groundedPrompts.length, 5);
  assert.ok(
    deduped.groundedPrompts.includes(
      'Based only on the latest retrieve, explain what Flow OpportunityStageSync reads and writes.'
    )
  );
  assert.ok(
    deduped.groundedPrompts.includes(
      'Based only on the latest retrieve, where is Flow OpportunityStageSync used?'
    )
  );
  assert.ok(
    deduped.groundedPrompts.includes(
      'Based only on the latest retrieve, what touches Opportunity.StageName?'
    )
  );
  assert.ok(
    deduped.groundedPrompts.includes(
      'Based only on the latest retrieve, what automations update Opportunity.StageName?'
    )
  );
  assert.ok(
    deduped.groundedPrompts.includes(
      'Based only on the latest retrieve, where is Custom Field Opportunity.StageName used?'
    )
  );
  assert.equal(deduped.followUpPrompts.length, 1);

  console.log('ask retrieve prompts test passed');
}

run();
