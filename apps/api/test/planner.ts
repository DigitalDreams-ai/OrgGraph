import assert from 'node:assert/strict';
import { PlannerService } from '../src/modules/planner/planner.service';

function run(): void {
  const planner = new PlannerService();

  const permsPlan = planner.plan('Can jane@example.com edit object Case?');
  assert.equal(permsPlan.intent, 'perms');
  assert.equal(permsPlan.entities.user, 'jane@example.com');
  assert.equal(permsPlan.entities.object, 'Case');

  const complexEmailPermsPlan = planner.plan(
    'Can _john.shbu0nbf92ei.98wz66bcffvd.lb7cpijolxkf.rvguteb2fgug@litify.com.uat edit object Opportunity?'
  );
  assert.equal(complexEmailPermsPlan.intent, 'perms');
  assert.equal(
    complexEmailPermsPlan.entities.user,
    '_john.shbu0nbf92ei.98wz66bcffvd.lb7cpijolxkf.rvguteb2fgug@litify.com.uat'
  );
  assert.equal(complexEmailPermsPlan.entities.object, 'Opportunity');
  assert.equal(complexEmailPermsPlan.entities.field, undefined);

  const impactPlan = planner.plan('What touches Opportunity.StageName?');
  assert.equal(impactPlan.intent, 'impact');
  assert.equal(impactPlan.entities.field, 'Opportunity.StageName');
  assert.equal(impactPlan.entities.object, 'Opportunity');

  const customImpactPlan = planner.plan(
    'What touches litify_pm__Matter__c.litify_pm__Status__c?'
  );
  assert.equal(customImpactPlan.intent, 'impact');
  assert.equal(customImpactPlan.entities.field, 'litify_pm__Matter__c.litify_pm__Status__c');
  assert.equal(customImpactPlan.entities.object, 'litify_pm__Matter__c');

  const autoPlan = planner.plan('What runs on object Opportunity?');
  assert.equal(autoPlan.intent, 'automation');
  assert.equal(autoPlan.entities.object, 'Opportunity');

  const unknownPlan = planner.plan('hello world');
  assert.equal(unknownPlan.intent, 'unknown');

  const mixedA = planner.plan(
    'Can jane@example.com edit object Opportunity and what touches Opportunity.StageName?'
  );
  const mixedB = planner.plan(
    'What touches Opportunity.StageName and can jane@example.com edit object Opportunity?'
  );
  assert.equal(mixedA.intent, 'mixed');
  assert.equal(mixedA.graphCalls[0], 'queries.perms');
  assert.equal(mixedA.graphCalls[mixedA.graphCalls.length - 1], 'analysis.impact');
  assert.deepEqual(mixedA.graphCalls, mixedB.graphCalls, 'graphCalls ordering must be stable');

  console.log('planner test passed');
}

run();
