import assert from 'node:assert/strict';
import { PlannerService } from '../src/modules/planner/planner.service';

function run(): void {
  const planner = new PlannerService();

  const permsPlan = planner.plan('Can jane@example.com edit object Case?');
  assert.equal(permsPlan.intent, 'perms');
  assert.equal(permsPlan.entities.user, 'jane@example.com');
  assert.equal(permsPlan.entities.object, 'Case');
  assert.equal(typeof permsPlan.normalizedQuery, 'string');
  assert.equal(permsPlan.semanticFrame?.version, 'v1');
  assert.equal(permsPlan.semanticFrame?.intent, 'permission_path_explanation');
  assert.equal(permsPlan.semanticFrame?.sourceMode, 'graph_global');
  assert.equal(permsPlan.semanticFrame?.target?.kind, 'object');
  assert.equal(permsPlan.semanticFrame?.target?.selected, 'Case');
  assert.equal(permsPlan.semanticFrame?.admissibility.status, 'accepted');
  assert.equal(permsPlan.semanticFrame?.ambiguity.status, 'clear');

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
  assert.equal(impactPlan.semanticFrame?.version, 'v1');
  assert.equal(impactPlan.semanticFrame?.intent, 'impact_analysis');
  assert.equal(impactPlan.semanticFrame?.sourceMode, 'graph_global');
  assert.equal(impactPlan.semanticFrame?.target?.kind, 'field');
  assert.equal(impactPlan.semanticFrame?.target?.selected, 'Opportunity.StageName');
  assert.equal(impactPlan.semanticFrame?.admissibility.status, 'accepted');
  assert.equal(impactPlan.semanticFrame?.ambiguity.status, 'clear');

  const customImpactPlan = planner.plan(
    'What touches litify_pm__Matter__c.litify_pm__Status__c?'
  );
  assert.equal(customImpactPlan.intent, 'impact');
  assert.equal(customImpactPlan.entities.field, 'litify_pm__Matter__c.litify_pm__Status__c');
  assert.equal(customImpactPlan.entities.object, 'litify_pm__Matter__c');
  assert.equal(customImpactPlan.semanticFrame?.target?.kind, 'field');
  assert.equal(
    customImpactPlan.semanticFrame?.target?.selected,
    'litify_pm__Matter__c.litify_pm__Status__c'
  );

  const objectImpactPlan = planner.plan('What changes if object Opportunity is updated?');
  assert.equal(objectImpactPlan.intent, 'impact');
  assert.equal(objectImpactPlan.entities.object, 'Opportunity');
  assert.equal(objectImpactPlan.semanticFrame?.target?.kind, 'object');
  assert.equal(objectImpactPlan.semanticFrame?.target?.selected, 'Opportunity');
  assert.equal(objectImpactPlan.semanticFrame?.admissibility.status, 'blocked');
  assert.equal(objectImpactPlan.semanticFrame?.admissibility.reason, 'unsupported_target_kind');
  assert.equal(objectImpactPlan.semanticFrame?.ambiguity.status, 'unsupported_question');

  const autoPlan = planner.plan('What runs on object Opportunity?');
  assert.equal(autoPlan.intent, 'automation');
  assert.equal(autoPlan.entities.object, 'Opportunity');
  assert.equal(autoPlan.semanticFrame?.version, 'v1');
  assert.equal(autoPlan.semanticFrame?.intent, 'automation_path_explanation');
  assert.equal(autoPlan.semanticFrame?.sourceMode, 'graph_global');
  assert.equal(autoPlan.semanticFrame?.target?.kind, 'object');
  assert.equal(autoPlan.semanticFrame?.target?.selected, 'Opportunity');
  assert.equal(autoPlan.semanticFrame?.admissibility.status, 'accepted');
  assert.equal(autoPlan.semanticFrame?.ambiguity.status, 'clear');

  const autoFieldPlan = planner.plan('What automations update Opportunity.StageName?');
  assert.equal(autoFieldPlan.intent, 'automation');
  assert.equal(autoFieldPlan.entities.field, 'Opportunity.StageName');
  assert.equal(autoFieldPlan.semanticFrame?.intent, 'automation_path_explanation');
  assert.equal(autoFieldPlan.semanticFrame?.target?.kind, 'field');
  assert.equal(autoFieldPlan.semanticFrame?.target?.selected, 'Opportunity.StageName');
  assert.equal(autoFieldPlan.semanticFrame?.admissibility.status, 'accepted');

  const latestRetrieveAutoPlan = planner.plan(
    'Based only on the latest retrieve, what runs on object Opportunity?'
  );
  assert.equal(latestRetrieveAutoPlan.intent, 'automation');
  assert.equal(latestRetrieveAutoPlan.semanticFrame?.sourceMode, 'latest_retrieve');

  const blockedAutoPlan = planner.plan('What automations update this?');
  assert.equal(blockedAutoPlan.intent, 'automation');
  assert.equal(blockedAutoPlan.semanticFrame?.intent, 'automation_path_explanation');
  assert.equal(blockedAutoPlan.semanticFrame?.admissibility.status, 'blocked');
  assert.equal(blockedAutoPlan.semanticFrame?.admissibility.reason, 'no_grounded_target');
  assert.equal(blockedAutoPlan.semanticFrame?.ambiguity.status, 'insufficient_evidence');

  const flowEvidencePlan = planner.plan(
    'Based only on the latest retrieve, explain what Flow Civil_Rights_Intake_Questionnaire reads and writes.'
  );
  assert.equal(flowEvidencePlan.intent, 'automation');
  assert.equal(flowEvidencePlan.entities.object, undefined);
  assert.equal(flowEvidencePlan.semanticFrame, undefined);

  const flowEvidenceSpacedPlan = planner.plan(
    'Based only on the latest retrieve, explain what Flow Opportunity Stage Sync reads and writes.'
  );
  assert.equal(flowEvidenceSpacedPlan.intent, 'automation');
  assert.equal(flowEvidenceSpacedPlan.entities.object, undefined);

  const flowEvidencePathPlan = planner.plan(
    'Based only on the latest retrieve, explain what Flow C:/tmp/force-app/main/default/flows/Civil_Rights_Intake_Questionnaire.flow-meta.xml reads and writes.'
  );
  assert.equal(flowEvidencePathPlan.intent, 'automation');
  assert.equal(flowEvidencePathPlan.entities.object, undefined);

  const normalizedPermPlan = planner.plan('Who can edit object Opportunity?');
  assert.equal(normalizedPermPlan.intent, 'perms');
  assert.ok(normalizedPermPlan.rewriteRules?.includes('perm_who_can_edit'));
  assert.equal(normalizedPermPlan.semanticFrame?.intent, 'permission_path_explanation');
  assert.equal(normalizedPermPlan.semanticFrame?.target?.selected, 'Opportunity');
  assert.equal(normalizedPermPlan.semanticFrame?.admissibility.status, 'accepted');

  const latestRetrievePermPlan = planner.plan(
    'Based only on the latest retrieve, who can edit Opportunity.StageName?'
  );
  assert.equal(latestRetrievePermPlan.intent, 'perms');
  assert.equal(latestRetrievePermPlan.semanticFrame?.intent, 'permission_path_explanation');
  assert.equal(latestRetrievePermPlan.semanticFrame?.sourceMode, 'latest_retrieve');
  assert.equal(latestRetrievePermPlan.semanticFrame?.target?.kind, 'field');
  assert.equal(
    latestRetrievePermPlan.semanticFrame?.target?.selected,
    'Opportunity.StageName'
  );
  assert.equal(latestRetrievePermPlan.semanticFrame?.admissibility.status, 'blocked');
  assert.equal(
    latestRetrievePermPlan.semanticFrame?.admissibility.reason,
    'evidence_scope_unsupported'
  );
  assert.equal(latestRetrievePermPlan.semanticFrame?.ambiguity.status, 'unsupported_question');

  const normalizedAutoPlan = planner.plan('Which flows run on object Opportunity?');
  assert.equal(normalizedAutoPlan.intent, 'automation');
  assert.ok(normalizedAutoPlan.rewriteRules?.includes('auto_which_flows'));

  const normalizedImpactPlan = planner.plan('What changes if Opportunity.StageName is updated?');
  assert.equal(normalizedImpactPlan.intent, 'impact');
  assert.ok(normalizedImpactPlan.rewriteRules?.includes('impact_what_changes_if'));
  assert.equal(normalizedImpactPlan.semanticFrame?.admissibility.status, 'accepted');

  const latestRetrieveImpactPlan = planner.plan(
    'Based only on the latest retrieve, what touches Opportunity.StageName?'
  );
  assert.equal(latestRetrieveImpactPlan.intent, 'impact');
  assert.equal(latestRetrieveImpactPlan.semanticFrame?.sourceMode, 'latest_retrieve');

  const ungroundedImpactPlan = planner.plan('What touches this?');
  assert.equal(ungroundedImpactPlan.intent, 'impact');
  assert.equal(ungroundedImpactPlan.semanticFrame?.admissibility.status, 'blocked');
  assert.equal(ungroundedImpactPlan.semanticFrame?.admissibility.reason, 'no_grounded_target');
  assert.equal(ungroundedImpactPlan.semanticFrame?.ambiguity.status, 'insufficient_evidence');

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
  assert.equal(reviewApprovalPlan.semanticFrame?.version, 'v1');
  assert.equal(reviewApprovalPlan.semanticFrame?.intent, 'approval_decision');
  assert.equal(reviewApprovalPlan.semanticFrame?.sourceMode, 'graph_global');
  assert.equal(reviewApprovalPlan.semanticFrame?.target?.kind, 'field');
  assert.equal(reviewApprovalPlan.semanticFrame?.target?.selected, 'Opportunity.StageName');
  assert.equal(reviewApprovalPlan.semanticFrame?.admissibility.status, 'accepted');
  assert.equal(reviewApprovalPlan.semanticFrame?.ambiguity.status, 'clear');

  const reviewApprovalVariantPlan = planner.plan(
    'Approve the Opportunity.StageName change for jane@example.com.'
  );
  assert.equal(reviewApprovalVariantPlan.intent, 'review');
  assert.equal(reviewApprovalVariantPlan.entities.user, 'jane@example.com');
  assert.equal(reviewApprovalVariantPlan.reviewWorkflow?.compilerRuleId, 'review_approval_change');
  assert.equal(reviewApprovalVariantPlan.reviewWorkflow?.focus, 'approval');
  assert.equal(reviewApprovalVariantPlan.reviewWorkflow?.targetLabel, 'Opportunity.StageName');
  assert.equal(reviewApprovalVariantPlan.semanticFrame?.intent, 'approval_decision');
  assert.equal(reviewApprovalVariantPlan.semanticFrame?.target?.selected, 'Opportunity.StageName');

  const latestRetrieveReviewApprovalPlan = planner.plan(
    'Based only on the latest retrieve, should we approve changing Opportunity.StageName for jane@example.com?'
  );
  assert.equal(latestRetrieveReviewApprovalPlan.intent, 'review');
  assert.equal(latestRetrieveReviewApprovalPlan.semanticFrame?.intent, 'approval_decision');
  assert.equal(latestRetrieveReviewApprovalPlan.semanticFrame?.sourceMode, 'latest_retrieve');
  assert.equal(latestRetrieveReviewApprovalPlan.semanticFrame?.target?.selected, 'Opportunity.StageName');
  assert.equal(latestRetrieveReviewApprovalPlan.semanticFrame?.admissibility.status, 'blocked');
  assert.equal(
    latestRetrieveReviewApprovalPlan.semanticFrame?.admissibility.reason,
    'evidence_scope_unsupported'
  );
  assert.equal(latestRetrieveReviewApprovalPlan.semanticFrame?.ambiguity.status, 'unsupported_question');

  const reviewBreakagePlan = planner.plan('What breaks if we change Opportunity.StageName?');
  assert.equal(reviewBreakagePlan.intent, 'review');
  assert.equal(reviewBreakagePlan.reviewWorkflow?.compilerRuleId, 'review_breakage_change');
  assert.equal(reviewBreakagePlan.reviewWorkflow?.focus, 'breakage');
  assert.equal(reviewBreakagePlan.semanticFrame, undefined);

  const componentUsagePlan = planner.plan('Where is Layout Opportunity-Opportunity Layout used?');
  assert.equal(componentUsagePlan.intent, 'unknown');
  assert.equal(componentUsagePlan.semanticFrame?.intent, 'evidence_lookup');
  assert.equal(componentUsagePlan.semanticFrame?.sourceMode, 'graph_global');
  assert.equal(componentUsagePlan.semanticFrame?.target?.kind, 'metadata_component');
  assert.equal(
    componentUsagePlan.semanticFrame?.target?.selected,
    'Layout Opportunity-Opportunity Layout'
  );
  assert.equal(componentUsagePlan.semanticFrame?.admissibility.status, 'accepted');
  assert.equal(componentUsagePlan.semanticFrame?.ambiguity.status, 'clear');

  const componentUsageFlowPlan = planner.plan(
    'Where is Flow Civil_Rights_Intake_Questionnaire used?'
  );
  assert.equal(componentUsageFlowPlan.intent, 'unknown');
  assert.equal(componentUsageFlowPlan.semanticFrame?.intent, 'evidence_lookup');
  assert.equal(componentUsageFlowPlan.semanticFrame?.target?.kind, 'metadata_component');
  assert.equal(
    componentUsageFlowPlan.semanticFrame?.target?.selected,
    'Flow Civil_Rights_Intake_Questionnaire'
  );
  assert.equal(componentUsageFlowPlan.semanticFrame?.admissibility.status, 'accepted');

  const componentUsageFlowMetadataArgPlan = planner.plan(
    'Where is Flow:Civil_Rights_Intake_Questionnaire used?'
  );
  assert.equal(componentUsageFlowMetadataArgPlan.intent, 'unknown');
  assert.equal(componentUsageFlowMetadataArgPlan.semanticFrame?.intent, 'evidence_lookup');
  assert.equal(
    componentUsageFlowMetadataArgPlan.semanticFrame?.target?.selected,
    'Flow Civil_Rights_Intake_Questionnaire'
  );

  const componentUsageFlowCalledPlan = planner.plan(
    'Where is Flow called "Civil_Rights_Intake_Questionnaire" used?'
  );
  assert.equal(componentUsageFlowCalledPlan.intent, 'unknown');
  assert.equal(componentUsageFlowCalledPlan.semanticFrame?.intent, 'evidence_lookup');
  assert.equal(
    componentUsageFlowCalledPlan.semanticFrame?.target?.selected,
    'Flow Civil_Rights_Intake_Questionnaire'
  );

  const componentUsageFlowPathPlan = planner.plan(
    'Where is Flow C:/tmp/force-app/main/default/flows/Civil_Rights_Intake_Questionnaire.flow-meta.xml used?'
  );
  assert.equal(componentUsageFlowPathPlan.intent, 'unknown');
  assert.equal(componentUsageFlowPathPlan.semanticFrame?.intent, 'evidence_lookup');
  assert.equal(
    componentUsageFlowPathPlan.semanticFrame?.target?.selected,
    'Flow Civil_Rights_Intake_Questionnaire'
  );

  const componentUsageLayoutNamedPlan = planner.plan(
    'Where is Layout named "Opportunity-Opportunity Layout" used?'
  );
  assert.equal(componentUsageLayoutNamedPlan.intent, 'unknown');
  assert.equal(componentUsageLayoutNamedPlan.semanticFrame?.intent, 'evidence_lookup');
  assert.equal(
    componentUsageLayoutNamedPlan.semanticFrame?.target?.selected,
    'Layout Opportunity-Opportunity Layout'
  );

  const componentUsageCustomFieldMetadataArgPlan = planner.plan(
    'Where is CustomField:Opportunity.StageName used?'
  );
  assert.equal(componentUsageCustomFieldMetadataArgPlan.intent, 'unknown');
  assert.equal(componentUsageCustomFieldMetadataArgPlan.semanticFrame?.intent, 'evidence_lookup');
  assert.equal(
    componentUsageCustomFieldMetadataArgPlan.semanticFrame?.target?.selected,
    'Custom Field Opportunity.StageName'
  );

  const componentUsageRecordIdPlan = planner.plan('Where is 00X000000000123AAA used?');
  assert.equal(componentUsageRecordIdPlan.intent, 'unknown');
  assert.equal(componentUsageRecordIdPlan.semanticFrame?.intent, 'evidence_lookup');
  assert.equal(componentUsageRecordIdPlan.semanticFrame?.admissibility.status, 'blocked');
  assert.equal(
    componentUsageRecordIdPlan.semanticFrame?.admissibility.reason,
    'record_id_unsupported'
  );
  assert.equal(componentUsageRecordIdPlan.semanticFrame?.ambiguity.status, 'unsupported_question');

  const reviewRiskVariantPlan = planner.plan('Review the change risk for Opportunity.StageName.');
  assert.equal(reviewRiskVariantPlan.intent, 'review');
  assert.equal(reviewRiskVariantPlan.reviewWorkflow?.compilerRuleId, 'review_risk_change');
  assert.equal(reviewRiskVariantPlan.reviewWorkflow?.focus, 'risk');
  assert.equal(reviewRiskVariantPlan.reviewWorkflow?.targetLabel, 'Opportunity.StageName');
  assert.equal(reviewRiskVariantPlan.semanticFrame, undefined);

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
