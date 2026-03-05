import assert from 'node:assert/strict';
import { PlannerService } from '../src/modules/planner/planner.service';

function run(): void {
  const planner = new PlannerService();

  const permsPlan = planner.plan('Can jane@example.com edit object Case?');
  assert.equal(permsPlan.intent, 'perms');
  assert.equal(permsPlan.entities.user, 'jane@example.com');
  assert.equal(permsPlan.entities.object, 'Case');
  assert.equal(typeof permsPlan.normalizedQuery, 'string');

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

  const flowEvidencePlan = planner.plan(
    'Based only on the latest retrieve, explain what Flow Civil_Rights_Intake_Questionnaire reads and writes.'
  );
  assert.equal(flowEvidencePlan.intent, 'automation');
  assert.equal(flowEvidencePlan.entities.object, undefined);

  const flowEvidenceSpacedPlan = planner.plan(
    'Based only on the latest retrieve, explain what Flow Opportunity Stage Sync reads and writes.'
  );
  assert.equal(flowEvidenceSpacedPlan.intent, 'automation');
  assert.equal(flowEvidenceSpacedPlan.entities.object, undefined);

  const normalizedPermPlan = planner.plan('Who can edit object Opportunity?');
  assert.equal(normalizedPermPlan.intent, 'perms');
  assert.ok(normalizedPermPlan.rewriteRules?.includes('perm_who_can_edit'));

  const normalizedAutoPlan = planner.plan('Which flows run on object Opportunity?');
  assert.equal(normalizedAutoPlan.intent, 'automation');
  assert.ok(normalizedAutoPlan.rewriteRules?.includes('auto_which_flows'));

  const normalizedImpactPlan = planner.plan('What changes if Opportunity.StageName is updated?');
  assert.equal(normalizedImpactPlan.intent, 'impact');
  assert.ok(normalizedImpactPlan.rewriteRules?.includes('impact_what_changes_if'));

  const reviewRiskPlan = planner.plan('What is the real risk of changing Opportunity.StageName?');
  assert.equal(reviewRiskPlan.intent, 'review');
  assert.equal(reviewRiskPlan.reviewWorkflow?.kind, 'high_risk_change_review');
  assert.equal(reviewRiskPlan.reviewWorkflow?.compilerRuleId, 'review_risk_change');
  assert.equal(reviewRiskPlan.reviewWorkflow?.action, 'change');
  assert.equal(reviewRiskPlan.reviewWorkflow?.focus, 'risk');
  assert.equal(reviewRiskPlan.reviewWorkflow?.targetType, 'field');
  assert.equal(reviewRiskPlan.reviewWorkflow?.targetLabel, 'Opportunity.StageName');
  assert.deepEqual(reviewRiskPlan.graphCalls, ['queries.perms', 'analysis.automation', 'analysis.impact']);

  const reviewApprovalPlan = planner.plan(
    'Should we approve changing Opportunity.StageName for jane@example.com?'
  );
  assert.equal(reviewApprovalPlan.intent, 'review');
  assert.equal(reviewApprovalPlan.entities.user, 'jane@example.com');
  assert.equal(reviewApprovalPlan.reviewWorkflow?.compilerRuleId, 'review_approval_change');
  assert.equal(reviewApprovalPlan.reviewWorkflow?.focus, 'approval');

  const reviewApprovalVariantPlan = planner.plan(
    'Approve the Opportunity.StageName change for jane@example.com.'
  );
  assert.equal(reviewApprovalVariantPlan.intent, 'review');
  assert.equal(reviewApprovalVariantPlan.entities.user, 'jane@example.com');
  assert.equal(reviewApprovalVariantPlan.reviewWorkflow?.compilerRuleId, 'review_approval_change');
  assert.equal(reviewApprovalVariantPlan.reviewWorkflow?.focus, 'approval');
  assert.equal(reviewApprovalVariantPlan.reviewWorkflow?.targetLabel, 'Opportunity.StageName');

  const reviewBreakagePlan = planner.plan('What breaks if we change Opportunity.StageName?');
  assert.equal(reviewBreakagePlan.intent, 'review');
  assert.equal(reviewBreakagePlan.reviewWorkflow?.compilerRuleId, 'review_breakage_change');
  assert.equal(reviewBreakagePlan.reviewWorkflow?.focus, 'breakage');

  const reviewRiskVariantPlan = planner.plan('Review the change risk for Opportunity.StageName.');
  assert.equal(reviewRiskVariantPlan.intent, 'review');
  assert.equal(reviewRiskVariantPlan.reviewWorkflow?.compilerRuleId, 'review_risk_change');
  assert.equal(reviewRiskVariantPlan.reviewWorkflow?.focus, 'risk');
  assert.equal(reviewRiskVariantPlan.reviewWorkflow?.targetLabel, 'Opportunity.StageName');

  const nonReviewApprovalPlan = planner.plan('Should we approve jane@example.com for Opportunity?');
  assert.notEqual(nonReviewApprovalPlan.intent, 'review');

  const nonReviewRiskPlan = planner.plan('What is the risk of Opportunity.StageName?');
  assert.notEqual(nonReviewRiskPlan.intent, 'review');

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
