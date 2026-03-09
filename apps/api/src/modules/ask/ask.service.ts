import { Injectable, NotFoundException } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { COMPOSITION_OPERATORS, DERIVATION_RELATIONS } from '@orgumented/ontology';
import type { CompositionOperator } from '@orgumented/ontology';
import { AnalysisService } from '../analysis/analysis.service';
import { stableId } from '../../common/ids';
import { resolveRefreshStatePath } from '../../common/path';
import { AppConfigService } from '../../config/app-config.service';
import { EvidenceStoreService } from '../evidence/evidence-store.service';
import type { EvidenceSearchResult } from '../evidence/evidence.types';
import { LlmService } from '../llm/llm.service';
import { PlannerService } from '../planner/planner.service';
import { QueriesService } from '../queries/queries.service';
import { AskMetricsStoreService } from './ask-metrics-store.service';
import { AskProofStoreService } from './ask-proof-store.service';
import type {
  AskArchitectureDecisionRequest,
  AskArchitectureDecisionResponse,
  AskMeaningMetrics,
  AskMetricsExportResponse,
  AskTrustDashboardResponse,
  AskSimulationCompareRequest,
  AskSimulationCompareResponse,
  AskSimulationRequest,
  AskSimulationResponse,
  AskSimulationRiskProfile,
  AskDecisionPacket,
  AskEvidenceScope,
  AskEvidenceSelection,
  AskProofListResponse,
  AskPolicyValidateRequest,
  AskPolicyValidateResponse,
  AskProofArtifact,
  AskProofLookupResponse,
  AskRejectedBranch,
  AskReplayRequest,
  AskReplayResponse,
  AskRequest,
  AskResponse,
  AskTraceLevel,
  AskTrustLevel
} from './ask.types';

interface FlowEvidenceSummary {
  explanation: string;
  matchedCount: number;
  readFields: string[];
  writeFields: string[];
  readObjects: string[];
  writeObjects: string[];
  referencedObjects: string[];
  triggerTypes: string[];
}

@Injectable()
export class AskService {
  private static readonly LLM_MIN_CONFIDENCE = 0.6;

  constructor(
    private readonly configService: AppConfigService,
    private readonly planner: PlannerService,
    private readonly queries: QueriesService,
    private readonly analysis: AnalysisService,
    private readonly evidence: EvidenceStoreService,
    private readonly llmService: LlmService,
    private readonly proofStore: AskProofStoreService,
    private readonly metricsStore: AskMetricsStoreService
  ) {}

  async ask(input: AskRequest): Promise<AskResponse> {
    const { response, proof } = await this.execute(input);
    this.proofStore.append(proof);
    this.metricsStore.append({
      recordedAt: new Date().toISOString(),
      snapshotId: proof.snapshotId,
      policyId: proof.policyId,
      query: input.query,
      intent: proof.plan.intent,
      trustLevel: proof.trustLevel,
      metrics: proof.metrics,
      llm: {
        provider: response.llm.provider,
        model: response.llm.model,
        used: response.llm.used,
        latencyMs: response.llm.latencyMs,
        tokenUsage: response.llm.tokenUsage,
        estimatedCostUsd: response.llm.estimatedCostUsd,
        fallbackReason: response.llm.fallbackReason
      }
    });
    return response;
  }

  getProof(proofId: string): AskProofLookupResponse {
    const proof = this.proofStore.findByProofId(proofId);
    if (!proof) {
      throw new NotFoundException(`proof not found: ${proofId}`);
    }
    return { proof, status: 'implemented' };
  }

  listRecentProofs(limit = 10): AskProofListResponse {
    const proofs = this.proofStore.listRecent(limit).map((proof) => ({
      proofId: proof.proofId,
      replayToken: proof.replayToken,
      generatedAt: proof.generatedAt,
      snapshotId: proof.snapshotId,
      trustLevel: proof.trustLevel,
      query: proof.request.query
    }));
    return {
      proofs,
      total: proofs.length,
      status: 'implemented'
    };
  }

  exportMetrics(): AskMetricsExportResponse {
    return this.metricsStore.exportSummary();
  }

  trustDashboard(): AskTrustDashboardResponse {
    const metrics = this.metricsStore.exportSummary();
    const proofCount = this.proofStore.countAll();
    const trusted = metrics.bySnapshot.reduce((sum, item) => sum + item.trusted, 0);
    const conditional = metrics.bySnapshot.reduce((sum, item) => sum + item.conditional, 0);
    const refused = metrics.bySnapshot.reduce((sum, item) => sum + item.refused, 0);
    const llmFallbackCount = metrics.byProvider.reduce((sum, item) => sum + item.errorCount, 0);
    const replayPassRate = metrics.totalRecords === 0 ? 1 : Number((trusted / metrics.totalRecords).toFixed(4));
    const proofCoverageRate =
      metrics.totalRecords === 0 ? 1 : Number((Math.min(1, proofCount / metrics.totalRecords)).toFixed(4));
    const sortedSnapshots = [...metrics.bySnapshot].sort((a, b) => a.latestRecordedAt.localeCompare(b.latestRecordedAt));
    const latest = sortedSnapshots[sortedSnapshots.length - 1];
    const previous = sortedSnapshots[sortedSnapshots.length - 2];

    return {
      status: 'implemented',
      generatedAt: new Date().toISOString(),
      totals: {
        askRecords: metrics.totalRecords,
        proofArtifacts: proofCount,
        trusted,
        conditional,
        refused
      },
      replayPassRate,
      proofCoverageRate,
      driftTrend: {
        snapshotCount: metrics.bySnapshot.length,
        latestSnapshotId: latest?.snapshotId,
        previousSnapshotId: previous?.snapshotId
      },
      failureClasses: [
        { class: 'llm_fallback', count: llmFallbackCount },
        { class: 'policy_refusal', count: refused },
        { class: 'constraint_risk', count: conditional },
        {
          class: 'none',
          count: Math.max(
            0,
            metrics.totalRecords - (llmFallbackCount + refused + conditional)
          )
        }
      ]
    };
  }

  validatePolicy(input: AskPolicyValidateRequest): AskPolicyValidateResponse {
    const thresholds = {
      groundingThreshold:
        input.groundingThreshold ?? this.configService.askGroundingScoreThreshold(),
      constraintThreshold:
        input.constraintThreshold ?? this.configService.askConstraintSatisfactionThreshold(),
      ambiguityMaxThreshold:
        input.ambiguityMaxThreshold ?? this.configService.askAmbiguityMaxThreshold()
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    if (thresholds.groundingThreshold < 0 || thresholds.groundingThreshold > 1) {
      errors.push('groundingThreshold must be between 0 and 1');
    }
    if (thresholds.constraintThreshold < 0 || thresholds.constraintThreshold > 1) {
      errors.push('constraintThreshold must be between 0 and 1');
    }
    if (thresholds.ambiguityMaxThreshold < 0 || thresholds.ambiguityMaxThreshold > 1) {
      errors.push('ambiguityMaxThreshold must be between 0 and 1');
    }
    if (thresholds.constraintThreshold < thresholds.groundingThreshold) {
      warnings.push(
        'constraintThreshold is lower than groundingThreshold; this may admit under-constrained outputs'
      );
    }
    if (thresholds.ambiguityMaxThreshold > 0.7) {
      warnings.push('ambiguityMaxThreshold > 0.7 may over-label uncertain output as trusted');
    }

    const policyId = stableId(
      'policy',
      thresholds.groundingThreshold.toFixed(3),
      thresholds.constraintThreshold.toFixed(3),
      thresholds.ambiguityMaxThreshold.toFixed(3)
    );

    return {
      policyId,
      valid: errors.length === 0,
      errors,
      warnings,
      thresholds,
      dryRun: input.dryRun === true,
      status: 'implemented'
    };
  }

  async replay(request: AskReplayRequest): Promise<AskReplayResponse> {
    const lookupValue = request.replayToken ?? request.proofId;
    if (!lookupValue) {
      throw new NotFoundException('replayToken or proofId is required');
    }

    const proof = request.replayToken
      ? this.proofStore.findByReplayToken(request.replayToken)
      : this.proofStore.findByProofId(request.proofId as string);
    if (!proof) {
      throw new NotFoundException(`proof not found: ${lookupValue}`);
    }

    const replayRun = await this.execute(proof.request);
    const replayed = replayRun.response;
    const replayedCorePayloadJson = this.buildCorePayloadJson(replayed);
    const corePayloadMatched = replayedCorePayloadJson === proof.responseSummary.corePayloadJson;
    const matched =
      corePayloadMatched &&
      replayed.deterministicAnswer === proof.responseSummary.deterministicAnswer &&
      replayed.plan.intent === proof.plan.intent &&
      replayed.policy.policyId === proof.policyId &&
      replayed.proof.snapshotId === proof.snapshotId;

    return {
      replayToken: proof.replayToken,
      proofId: proof.proofId,
      matched,
      corePayloadMatched,
      metricsMatched:
        JSON.stringify(replayed.metrics) === JSON.stringify(proof.metrics),
      snapshotId: proof.snapshotId,
      policyId: proof.policyId,
      original: {
        answer: proof.responseSummary.answer,
        deterministicAnswer: proof.responseSummary.deterministicAnswer,
        confidence: proof.responseSummary.confidence,
        mode: proof.responseSummary.mode,
        trustLevel: proof.trustLevel,
        metrics: proof.metrics
      },
      replayed: {
        answer: replayed.answer,
        deterministicAnswer: replayed.deterministicAnswer,
        confidence: replayed.confidence,
        mode: replayed.mode,
        trustLevel: replayed.trustLevel,
        metrics: replayed.metrics
      },
      status: 'implemented'
    };
  }

  async architectureDecision(
    input: AskArchitectureDecisionRequest
  ): Promise<AskArchitectureDecisionResponse> {
    const maxPaths = Math.max(1, Math.min(50, input.maxPaths ?? 10));
    const perms = await this.queries.perms(input.user, input.object, input.field, maxPaths);
    const automations = await this.analysis.automation(input.object, maxPaths, false, false, false);
    const impact = await this.analysis.impact(input.field, maxPaths, false, false, false, false);

    const permissionBlastRadius = {
      granted: perms.granted,
      principalCount: perms.principalsChecked.length,
      pathCount: perms.paths.length,
      blastRadiusScore: Number(
        Math.min(
          1,
          (perms.granted ? 0.35 : 0.1) +
            Math.min(0.45, perms.principalsChecked.length / 100) +
            Math.min(0.2, perms.paths.length / 20)
        ).toFixed(3)
      ),
      explanation: perms.explanation,
      proofPaths: perms.paths
    };

    const relationBySource = new Map<string, Set<string>>();
    for (const item of automations.automations) {
      if (!relationBySource.has(item.name)) {
        relationBySource.set(item.name, new Set());
      }
      relationBySource.get(item.name)?.add(item.rel);
    }
    for (const path of impact.paths) {
      if (!relationBySource.has(path.from)) {
        relationBySource.set(path.from, new Set());
      }
      relationBySource.get(path.from)?.add(path.rel);
    }
    const topCollisions = [...relationBySource.entries()]
      .filter(([, relations]) => relations.size > 1)
      .map(([source, relations]) => ({ source, relations: [...relations].sort() }))
      .sort((a, b) => b.relations.length - a.relations.length || a.source.localeCompare(b.source))
      .slice(0, 10);
    const automationCollision = {
      automationCount: automations.totalAutomations,
      impactPathCount: impact.totalPaths,
      collisionCount: topCollisions.length,
      collisionScore: Number(
        Math.min(
          1,
          Math.max(
            automations.totalAutomations,
            impact.totalPaths
          ) === 0
            ? 0
            : topCollisions.length / Math.max(automations.totalAutomations, impact.totalPaths)
        ).toFixed(3)
      ),
      explanation:
        topCollisions.length > 0
          ? `found ${topCollisions.length} source(s) with multi-relation automation/impact overlap`
          : 'no multi-relation automation/impact overlap found',
      topCollisions
    };

    const latestState = this.readRefreshState();
    const diff = latestState?.semanticDiff ?? {
      addedNodeCount: 0,
      removedNodeCount: 0,
      addedEdgeCount: 0,
      removedEdgeCount: 0
    };
    const driftMagnitude =
      Math.abs(diff.addedNodeCount) +
      Math.abs(diff.removedNodeCount) +
      Math.abs(diff.addedEdgeCount) +
      Math.abs(diff.removedEdgeCount);
    const releaseRiskScore = Number(
      Math.min(
        1,
        permissionBlastRadius.blastRadiusScore * 0.35 +
          automationCollision.collisionScore * 0.4 +
          Math.min(1, driftMagnitude / 3000) * 0.25
      ).toFixed(3)
    );
    const releaseRiskLevel: 'low' | 'medium' | 'high' =
      releaseRiskScore >= 0.7 ? 'high' : releaseRiskScore >= 0.4 ? 'medium' : 'low';
    const releaseRisk = {
      level: releaseRiskLevel,
      riskScore: releaseRiskScore,
      explanation: `release risk is ${releaseRiskLevel} (score=${releaseRiskScore.toFixed(3)}) from permission blast radius, automation collisions, and semantic delta`,
      semanticDiff: diff,
      meaningChangeSummary: latestState?.meaningChangeSummary ?? 'meaning change summary unavailable'
    };

    const metrics = this.buildMetrics({
      citationCount: 1,
      confidence: Math.max(0.4, 1 - releaseRiskScore * 0.5),
      consistencyChecked: true,
      consistencyAligned: true,
      intent: 'mixed',
      rejectedBranchCount: perms.granted ? 0 : 1
    });
    metrics.ambiguityScore = Number(Math.min(1, releaseRiskScore * 0.9).toFixed(3));
    metrics.riskSurfaceScore = Number(Math.min(1, releaseRiskScore).toFixed(3));
    const policy = {
      groundingThreshold: this.configService.askGroundingScoreThreshold(),
      constraintThreshold: this.configService.askConstraintSatisfactionThreshold(),
      ambiguityMaxThreshold: this.configService.askAmbiguityMaxThreshold()
    };
    const trustLevel = this.resolveTrustLevel(metrics, policy);
    const topRiskDrivers = [
      `permission blast radius score ${permissionBlastRadius.blastRadiusScore.toFixed(3)}`,
      `automation collision score ${automationCollision.collisionScore.toFixed(3)}`,
      `release semantic drift score ${Math.min(1, driftMagnitude / 3000).toFixed(3)}`
    ];
    const snapshotId = latestState?.snapshotId ?? this.readSnapshotId();
    const replayToken = stableId(
      'phase15-decision',
      snapshotId,
      input.user,
      input.object,
      input.field,
      releaseRiskScore.toFixed(3)
    );
    const summary = `${releaseRisk.level} release risk for ${input.field}; trust=${trustLevel}`;

    return {
      user: input.user,
      object: input.object,
      field: input.field,
      engines: {
        permissionBlastRadius,
        automationCollision,
        releaseRisk
      },
      composite: {
        trustLevel,
        summary,
        topRiskDrivers,
        replayToken,
        snapshotId
      },
      status: 'implemented'
    };
  }

  async simulateScenario(input: AskSimulationRequest): Promise<AskSimulationResponse> {
    const maxPaths = Math.max(1, Math.min(50, input.maxPaths ?? 10));
    const profile: AskSimulationRiskProfile = input.profile ?? 'balanced';
    const profileWeights = this.profileWeights(profile);

    const perms = await this.queries.perms(input.user, input.object, input.field, maxPaths);
    const automations = await this.analysis.automation(input.object, maxPaths, false, false, false);
    const impact = await this.analysis.impact(input.field, maxPaths, false, false, false, false);

    const changeComplexity = Math.min(
      1,
      (input.proposedChanges.length / 10) *
        0.5 +
        (input.proposedChanges.filter((c) => c.field).length / Math.max(1, input.proposedChanges.length)) *
          0.5
    );
    const permissionImpact = Number(
      Math.min(
        1,
        (perms.granted ? 0.25 : 0.55) +
          Math.min(0.25, perms.principalsChecked.length / 200) +
          Math.min(0.2, perms.paths.length / 20)
      ).toFixed(3)
    );
    const releaseRisk = Number(
      Math.min(
        1,
        Math.min(0.5, automations.totalAutomations / 20) +
          Math.min(0.35, impact.totalPaths / 30) +
          changeComplexity * 0.15
      ).toFixed(3)
    );
    const compositeRisk = Number(
      Math.min(
        1,
        permissionImpact * profileWeights.permission +
          releaseRisk * profileWeights.release +
          changeComplexity * profileWeights.complexity
      ).toFixed(3)
    );

    const rollbackConfidence = Number(
      Math.max(
        0,
        Math.min(
          1,
          1 -
            (compositeRisk * 0.7 +
              Math.min(0.2, automations.totalAutomations / 50) +
              (perms.granted ? 0 : 0.08))
        )
      ).toFixed(3)
    );

    const mitigations: string[] = [];
    if (!perms.granted) {
      mitigations.push('Validate object and field access path in target principals before release.');
    }
    if (impact.totalPaths > 0) {
      mitigations.push('Run impact replay checks for each high-impact field before deploy cutover.');
    }
    if (automations.totalAutomations > 0) {
      mitigations.push('Create sandbox scenario tests for intersecting automations and triggers.');
    }
    if (changeComplexity >= 0.5) {
      mitigations.push('Split rollout into phased change sets to reduce blast radius.');
    }
    if (mitigations.length === 0) {
      mitigations.push('Proceed with standard release checklist and post-deploy replay validation.');
    }

    const recommendationLevel: AskSimulationResponse['recommendation']['level'] =
      compositeRisk >= 0.7 || rollbackConfidence < 0.35
        ? 'block'
        : compositeRisk >= 0.45 || rollbackConfidence < 0.55
          ? 'review'
          : 'proceed';
    const rationale = `profile=${profile}; compositeRisk=${compositeRisk.toFixed(
      3
    )}; rollbackConfidence=${rollbackConfidence.toFixed(3)}; perms=${
      perms.granted ? 'granted' : 'not_granted'
    }; impactPaths=${impact.totalPaths}; automations=${automations.totalAutomations}`;

    return {
      user: input.user,
      object: input.object,
      field: input.field,
      profile,
      requestedChangeCount: input.proposedChanges.length,
      simulatedImpactSurface: {
        permissionPaths: perms.paths.length,
        automationMatches: automations.totalAutomations,
        impactPaths: impact.totalPaths
      },
      scores: {
        permissionImpact,
        releaseRisk,
        compositeRisk,
        rollbackConfidence
      },
      recommendation: {
        level: recommendationLevel,
        rationale,
        mitigations
      },
      status: 'implemented'
    };
  }

  async compareSimulations(
    input: AskSimulationCompareRequest
  ): Promise<AskSimulationCompareResponse> {
    const scenarioA = await this.simulateScenario(input.scenarioA);
    const scenarioB = await this.simulateScenario(input.scenarioB);

    const scoreA = scenarioA.scores.compositeRisk - scenarioA.scores.rollbackConfidence * 0.25;
    const scoreB = scenarioB.scores.compositeRisk - scenarioB.scores.rollbackConfidence * 0.25;

    let recommendedScenario: 'A' | 'B' | 'tie' = 'tie';
    if (Math.abs(scoreA - scoreB) >= 0.02) {
      recommendedScenario = scoreA < scoreB ? 'A' : 'B';
    }
    const rationale =
      recommendedScenario === 'tie'
        ? 'scenarios are near-equivalent under current risk profile and confidence weighting'
        : `scenario ${recommendedScenario} has lower weighted risk score (A=${scoreA.toFixed(
            3
          )}, B=${scoreB.toFixed(3)})`;

    return {
      scenarioA,
      scenarioB,
      recommendedScenario,
      rationale,
      status: 'implemented'
    };
  }

  private profileWeights(profile: AskSimulationRiskProfile): {
    permission: number;
    release: number;
    complexity: number;
  } {
    if (profile === 'strict') {
      return { permission: 0.5, release: 0.35, complexity: 0.15 };
    }
    if (profile === 'exploratory') {
      return { permission: 0.25, release: 0.45, complexity: 0.3 };
    }
    return { permission: 0.4, release: 0.4, complexity: 0.2 };
  }

  private async execute(input: AskRequest): Promise<{
    response: AskResponse;
    proof: AskProofArtifact;
  }> {
    const plan = this.planner.plan(input.query);
    const latestRetrieveRequested = /\blatest retrieve\b/i.test(input.query);
    const evidenceScope = this.normalizeEvidenceScope(input.evidenceScope);
    const includeLowConfidence = input.includeLowConfidence === true;
    const consistencyCheck =
      input.consistencyCheck ?? this.configService.askConsistencyCheckEnabled();
    const maxCitations = Math.max(1, Math.min(20, input.maxCitations ?? 5));
    const traceLevel: AskTraceLevel = input.traceLevel ?? 'standard';
    const snapshotId = this.readSnapshotId();
    const policy = {
      policyId: this.buildPolicyId(
        this.configService.askGroundingScoreThreshold(),
        this.configService.askConstraintSatisfactionThreshold(),
        this.configService.askAmbiguityMaxThreshold()
      ),
      groundingThreshold: this.configService.askGroundingScoreThreshold(),
      constraintThreshold: this.configService.askConstraintSatisfactionThreshold(),
      ambiguityMaxThreshold: this.configService.askAmbiguityMaxThreshold()
    };

    let citationHits = this.searchEvidence(input.query, maxCitations, evidenceScope);
    if (citationHits.length === 0) {
      const fallbackTerms = [plan.entities.field, plan.entities.object, plan.entities.user]
        .filter((x): x is string => Boolean(x))
        .join(' ');
      if (fallbackTerms.length > 0) {
        citationHits = this.searchEvidence(fallbackTerms, maxCitations, evidenceScope);
      }
    }
    citationHits = this.dedupeCitations(citationHits);

    let citations = this.mapCitationHits(citationHits);

    let answer = 'No deterministic plan matched the query.';
    let deterministicAnswer = answer;
    let confidence = 0.2;
    let decisionPacket: AskDecisionPacket | undefined;
    let consistency: AskResponse['consistency'] = {
      checked: false,
      aligned: true,
      reason: 'consistency check not applicable'
    };
    const operatorsExecuted: CompositionOperator[] = [COMPOSITION_OPERATORS.SPECIALIZE];
    const executionTrace: string[] = [`intent=${plan.intent}`, `traceLevel=${traceLevel}`];
    if (latestRetrieveRequested) {
      executionTrace.push('retrieveScope.requested=true');
    }
    if (evidenceScope) {
      executionTrace.push(
        `retrieveScope.kind=${evidenceScope.kind}`,
        `retrieveScope.alias=${evidenceScope.alias || 'n/a'}`,
        `retrieveScope.metadataArgs=${String(evidenceScope.metadataArgs.length)}`,
        `retrieveScope.selections=${String(evidenceScope.selections?.length ?? 0)}`
      );
    }
    const rejectedBranches: AskRejectedBranch[] = [];
    const reject = (
      branch: string,
      reasonCode: AskRejectedBranch['reasonCode'],
      reason: string
    ): void => {
      rejectedBranches.push({ branch, reasonCode, reason });
    };

    const latestRetrieveFlowQuery =
      latestRetrieveRequested && plan.intent === 'automation' && /\bflow\b/i.test(input.query);

    if (latestRetrieveRequested && !evidenceScope) {
      answer =
        'Refused: this query requested latest-retrieve-only evidence, but no retrieve handoff scope was supplied. Re-run Ask from the current retrieve card.';
      deterministicAnswer = answer;
      confidence = 0.18;
      consistency = {
        checked: consistencyCheck,
        aligned: true,
        reason: 'query requested latest-retrieve-only evidence without a supplied retrieve handoff scope'
      };
      executionTrace.push('retrieveScope.failClosed=missing');
      reject(
        'evidence.scope',
        'EVIDENCE_SCOPE_UNAVAILABLE',
        'latest-retrieve-only query was executed without an evidence scope'
      );
    } else if (latestRetrieveRequested && !latestRetrieveFlowQuery) {
      answer =
        'Refused: latest-retrieve-only Ask is currently supported only for explicit Flow read/write review asks. This query would require graph-wide analysis outside the scoped retrieve.';
      deterministicAnswer = answer;
      confidence = 0.18;
      consistency = {
        checked: consistencyCheck,
        aligned: true,
        reason: 'latest-retrieve-only constraint is not yet supported for this Ask intent family'
      };
      executionTrace.push('retrieveScope.failClosed=unsupported-intent');
      reject(
        'evidence.scope',
        'EVIDENCE_SCOPE_UNSUPPORTED',
        'latest-retrieve-only query attempted an unsupported intent family'
      );
    } else if (plan.intent === 'review' && plan.reviewWorkflow) {
      operatorsExecuted.push(
        COMPOSITION_OPERATORS.OVERLAY,
        COMPOSITION_OPERATORS.CONSTRAIN,
        COMPOSITION_OPERATORS.INTERSECT
      );
      const user = plan.entities.user ?? 'jane@example.com';
      const object = plan.entities.object ?? 'Opportunity';
      const field = plan.entities.field;
      const targetLabel = plan.reviewWorkflow.targetLabel;
      const perms = await this.queries.perms(user, object, field);
      const automations = await this.analysis.automation(
        object,
        undefined,
        false,
        false,
        includeLowConfidence
      );
      const impact = field
        ? await this.analysis.impact(field, undefined, false, false, false, includeLowConfidence)
        : {
            field: object,
            paths: [],
            totalPaths: 0,
            explanation: `field-level impact unavailable for object-scoped review of ${object}`
          };

      const reviewRiskScore = Number(
        Math.min(
          1,
          (perms.granted ? 0.2 : 0.45) +
            Math.min(0.25, automations.totalAutomations / 12) +
            Math.min(0.3, impact.totalPaths / 18)
        ).toFixed(3)
      );
      const riskLevel: AskDecisionPacket['riskLevel'] =
        reviewRiskScore >= 0.7 ? 'high' : reviewRiskScore >= 0.4 ? 'medium' : 'low';
      const recommendedAction =
        plan.reviewWorkflow.focus === 'approval'
          ? riskLevel === 'high'
            ? 'do not approve yet'
            : riskLevel === 'medium'
              ? 'review before approving'
              : 'approve with targeted verification'
          : plan.reviewWorkflow.focus === 'breakage'
            ? `expect ${impact.totalPaths} deterministic impact path(s)`
            : `${riskLevel} review risk`;
      const summary =
        plan.reviewWorkflow.focus === 'approval'
          ? `High-risk change review for ${targetLabel}: ${recommendedAction}.`
          : plan.reviewWorkflow.focus === 'breakage'
            ? `Change review for ${targetLabel}: ${recommendedAction}.`
            : `High-risk change review for ${targetLabel}: ${recommendedAction}.`;
      const evidenceCoverage = {
        citationCount: citations.length,
        hasPermissionPaths: perms.totalPaths > 0,
        hasAutomationCoverage: automations.totalAutomations > 0,
        hasImpactPaths: impact.totalPaths > 0
      };
      const topAutomationNames = [...new Set(automations.automations.map((item) => item.name))].slice(0, 3);
      const topImpactedSources = [...new Set(impact.paths.map((item) => item.from))].slice(0, 3);
      const topAutomationSummary =
        topAutomationNames.length > 0 ? topAutomationNames.join(', ') : 'no deterministic automation names';
      const topImpactSummary =
        topImpactedSources.length > 0 ? topImpactedSources.join(', ') : 'no deterministic impact sources';
      const topCitationSources = [
        ...new Set(citations.map((citation) => this.toCitationSourceLabel(citation.sourcePath)))
      ]
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 3);
      const topCitationSummary =
        topCitationSources.length > 0
          ? topCitationSources.join(', ')
          : 'citation source labels unavailable';
      const automationSpotlight =
        topAutomationNames.length > 0
          ? `top automation sources: ${topAutomationSummary}`
          : `no deterministic automation names matched ${object}`;
      const impactSpotlight =
        topImpactedSources.length > 0
          ? `top impact sources: ${topImpactSummary}`
          : `no deterministic impact sources matched ${targetLabel}`;
      const citationSpotlight =
        topCitationSources.length > 0
          ? `top citation sources: ${topCitationSummary}`
          : 'top citation sources unavailable';
      const topRiskDrivers = [
        `${citations.length} citation(s) ground this decision packet`,
        citationSpotlight,
        `${impact.totalPaths} impact path(s) reference ${targetLabel}`,
        `${automations.totalAutomations} automation item(s) touch ${object}`,
        automationSpotlight,
        impactSpotlight,
        perms.granted
          ? `${user} retains deterministic access coverage for ${field ?? object}`
          : `${user} lacks deterministic access coverage for ${field ?? object}`
      ];
      const nextActions: AskDecisionPacket['nextActions'] = [
        {
          label: 'Inspect impacted automation',
          rationale:
            automations.totalAutomations > 0
              ? `review the highest-scoring automations before changing the target. Start with ${topAutomationSummary}.`
              : 'confirm no hidden automation exists outside the current snapshot'
        },
        {
          label: 'Inspect permissions',
          rationale: perms.explanation
        },
        {
          label: field ? 'Inspect impact paths' : 'Open proof for object review',
          rationale:
            impact.totalPaths > 0
              ? `${impact.explanation} Start with ${topImpactSummary}.`
              : impact.explanation
        },
        {
          label: 'Inspect citation sources',
          rationale: `Validate decision grounding against: ${topCitationSummary}.`
        }
      ];
      if (citations.length < 3) {
        nextActions.unshift({
          label: 'Retrieve broader metadata scope',
          rationale:
            'only limited citations grounded this packet. Retrieve adjacent metadata families and rerun Ask before approval.'
        });
      }
      decisionPacket = {
        kind: 'high_risk_change_review',
        focus: plan.reviewWorkflow.focus,
        targetLabel,
        targetType: plan.reviewWorkflow.targetType,
        summary,
        riskScore: reviewRiskScore,
        riskLevel,
        evidenceCoverage,
        topRiskDrivers,
        permissionImpact: {
          user,
          summary: perms.explanation,
          granted: perms.granted,
          pathCount: perms.totalPaths,
          principalCount: perms.principalsChecked.length,
          warnings: perms.warnings
        },
        automationImpact: {
          summary: automations.explanation,
          automationCount: automations.totalAutomations,
          topAutomationNames
        },
        changeImpact: {
          summary: impact.explanation,
          impactPathCount: impact.totalPaths,
          topImpactedSources
        },
        nextActions
      };
      answer =
        `${summary} Permission impact: ${perms.explanation}. ` +
        `Automation impact: ${automations.explanation}. ` +
        `Change impact: ${impact.explanation}.`;
      executionTrace.push(
        `review.compilerRule=${plan.reviewWorkflow.compilerRuleId}`,
        `review.action=${plan.reviewWorkflow.action}`,
        `review.focus=${plan.reviewWorkflow.focus}`,
        `review.target=${targetLabel}`,
        `review.citation.sources=${String(topCitationSources.length)}`,
        `review.perms.granted=${String(perms.granted)}`,
        `review.automation.count=${String(automations.totalAutomations)}`,
        `review.impact.paths=${String(impact.totalPaths)}`
      );
      confidence =
        riskLevel === 'high' ? 0.91 : riskLevel === 'medium' ? 0.86 : 0.82;
      consistency = {
        checked: consistencyCheck,
        aligned: true,
        reason: 'review intent composes perms, automation, and impact into one deterministic review packet'
      };
      if (!perms.granted) {
        reject('queries.perms', 'NO_OBJECT_OR_FIELD_GRANT', 'review packet found no deterministic access grant');
      }
      if (automations.totalAutomations === 0) {
        reject('analysis.automation', 'NO_AUTOMATION_MATCH', 'review packet found no automation coverage');
      }
      if (field && impact.totalPaths === 0) {
        reject('analysis.impact', 'NO_IMPACT_PATHS', 'review packet found no deterministic impact paths');
      }
    } else if (plan.intent === 'mixed') {
      operatorsExecuted.push(
        COMPOSITION_OPERATORS.OVERLAY,
        COMPOSITION_OPERATORS.CONSTRAIN,
        COMPOSITION_OPERATORS.INTERSECT
      );
      const user = plan.entities.user ?? 'jane@example.com';
      const object = plan.entities.object ?? 'Opportunity';
      const field = plan.entities.field ?? `${object}.StageName`;
      const perms = await this.queries.perms(user, object, field);
      const impact = await this.analysis.impact(field, undefined, false, false, false, includeLowConfidence);
      const releaseRisk = impact.totalPaths > 0 ? 'elevated' : 'low';
      answer =
        `Release-risk + permission-impact: ${releaseRisk} risk for changing ${field}. ` +
        `${perms.explanation}. ${impact.explanation}.`;
      executionTrace.push(
        `mixed.perms.granted=${String(perms.granted)}`,
        `mixed.impact.paths=${String(impact.totalPaths)}`
      );
      deterministicAnswer = answer;
      confidence = perms.granted && impact.totalPaths > 0 ? 0.9 : 0.72;
      consistency = {
        checked: consistencyCheck,
        aligned: true,
        reason: 'mixed intent composed deterministically from perms + impact'
      };
      if (!perms.granted) {
        reject('queries.perms', 'NO_OBJECT_OR_FIELD_GRANT', 'user lacks object/field grant for release scenario');
      }
      if (impact.totalPaths === 0) {
        reject('analysis.impact', 'NO_IMPACT_PATHS', 'no impact paths found for release scenario');
      }
    } else if (plan.intent === 'perms') {
      operatorsExecuted.push(COMPOSITION_OPERATORS.CONSTRAIN, COMPOSITION_OPERATORS.INTERSECT);
      const user = plan.entities.user ?? 'jane@example.com';
      const object = plan.entities.object ?? 'Case';
      const result = await this.queries.perms(user, object, plan.entities.field);
      answer = result.explanation;
      deterministicAnswer = result.explanation;
      confidence = result.granted ? 0.86 : 0.62;
      consistency = {
        checked: false,
        aligned: true,
        reason: 'perms intent uses deterministic query directly'
      };
      if (!result.granted) {
        reject(
          'queries.perms',
          'NO_OBJECT_OR_FIELD_GRANT',
          'no granting path found for requested principal/object'
        );
      }
    } else if (plan.intent === 'automation') {
      operatorsExecuted.push(COMPOSITION_OPERATORS.OVERLAY, COMPOSITION_OPERATORS.INTERSECT);
      const flowQueryRequested = /\bflow\b/i.test(input.query);
      const requestedFlowNameFromQuery = this.extractRequestedFlowName(input.query);
      const requestedFlowName =
        this.resolveScopedFlowNameAlias(
          requestedFlowNameFromQuery ??
          (flowQueryRequested && this.shouldInferFlowNameFromCitations(input.query)
            ? this.inferRequestedFlowNameFromCitations(citationHits)
            : undefined),
          evidenceScope
        );
      const object = this.normalizeAutomationObject(plan.entities.object);
      if (requestedFlowName) {
        let flowEvidenceSummary = this.buildFlowEvidenceSummary(requestedFlowName, citationHits);
        if (flowEvidenceSummary.matchedCount === 0) {
          const targetedFlowHits = this.dedupeCitations(
            this.searchEvidence(`flow ${requestedFlowName}`, Math.max(12, maxCitations * 4), evidenceScope)
          );
          if (targetedFlowHits.length > 0) {
            citationHits = this.dedupeCitations([...citationHits, ...targetedFlowHits]).slice(
              0,
              Math.max(maxCitations, targetedFlowHits.length)
            );
            citations = this.mapCitationHits(citationHits);
            flowEvidenceSummary = this.buildFlowEvidenceSummary(requestedFlowName, citationHits);
            executionTrace.push(
              `automation.flowEvidence.retry=targeted-name`,
              `automation.flowEvidence.retryHits=${String(targetedFlowHits.length)}`
            );
          }
        }
        if (flowEvidenceSummary.matchedCount === 0 && evidenceScope) {
          const scopedFlowHits = this.resolveScopedFlowEvidence(requestedFlowName, evidenceScope);
          if (scopedFlowHits.length > 0) {
            citationHits = this.dedupeCitations([...citationHits, ...scopedFlowHits]).slice(
              0,
              Math.max(maxCitations, scopedFlowHits.length)
            );
            citations = this.mapCitationHits(citationHits);
            flowEvidenceSummary = this.buildFlowEvidenceSummary(requestedFlowName, citationHits);
            executionTrace.push(
              'automation.flowEvidence.retry=direct-source',
              `automation.flowEvidence.directSourceHits=${String(scopedFlowHits.length)}`
            );
          }
        }
        answer = flowEvidenceSummary.explanation;
        deterministicAnswer = flowEvidenceSummary.explanation;
        confidence = flowEvidenceSummary.matchedCount > 0 ? 0.79 : 0.52;
        decisionPacket = this.buildAutomationFlowDecisionPacket({
          flowName: requestedFlowName,
          summary: flowEvidenceSummary,
          citationCount: citations.length,
          citationSourceLabels: citations.map((citation) => this.toCitationSourceLabel(citation.sourcePath)),
          user: plan.entities.user
        });
        executionTrace.push(
          `automation.flowName=${requestedFlowName}`,
          requestedFlowNameFromQuery
            ? 'automation.flowName.source=query'
            : 'automation.flowName.source=citation',
          `automation.flowEvidence.matches=${String(flowEvidenceSummary.matchedCount)}`,
          `automation.packet.kind=${decisionPacket.kind}`,
          `automation.packet.risk=${decisionPacket.riskLevel}`
        );
        consistency = {
          checked: consistencyCheck,
          aligned: true,
          reason: consistencyCheck
            ? 'ask automation answer is sourced from flow evidence when object is not explicit'
            : 'consistency check disabled'
        };
        if (flowEvidenceSummary.matchedCount === 0) {
          reject(
            'analysis.automation',
            'NO_AUTOMATION_MATCH',
            `no retrieved flow evidence matched ${requestedFlowName}`
          );
        }
      } else if (flowQueryRequested && !object) {
        const flowSuggestions = this
          .rankFlowNamesFromCitations(citationHits)
          .map(([name]) => name)
          .slice(0, 3);
        const suggestionText =
          flowSuggestions.length > 0
            ? `Closest retrieved flow candidates: ${flowSuggestions.join(', ')}.`
            : 'No flow candidates were detected in the current retrieve citations.';
        answer =
          `Flow question detected but the exact flow API name could not be resolved. ${suggestionText} ` +
          'Re-run Ask with: Based only on the latest retrieve, explain what Flow <FlowApiName> reads and writes.';
        deterministicAnswer = answer;
        confidence = 0.46;
        const unresolvedTarget = flowSuggestions[0] ?? 'flow-name-unresolved';
        decisionPacket = this.buildAutomationFlowDecisionPacket({
          flowName: unresolvedTarget,
          summary: {
            explanation:
              'Flow target was unresolved from the query. Deterministic read/write synthesis is blocked until an exact flow API name is provided.',
            matchedCount: 0,
            readFields: [],
            writeFields: [],
            readObjects: [],
            writeObjects: [],
            referencedObjects: [],
            triggerTypes: []
          },
          citationCount: citations.length,
          citationSourceLabels: citations.map((citation) => this.toCitationSourceLabel(citation.sourcePath)),
          user: plan.entities.user
        });
        decisionPacket.targetLabel = 'flow-name-unresolved';
        decisionPacket.summary =
          'Flow target could not be resolved from the query. No deterministic read/write summary was produced.';
        decisionPacket.nextActions = [
          {
            label: 'Specify exact flow API name',
            rationale:
              'Use the exact flow API name in Ask (for example, Flow Civil_Rights_Intake_Questionnaire reads and writes).'
          },
          {
            label: 'Browse flow metadata',
            rationale:
              'Load Flow family in Org Browser, verify the flow API name, then rerun Ask.'
          },
          {
            label: 'Increase evidence coverage',
            rationale: suggestionText
          }
        ];
        executionTrace.push(
          'automation.flowName.source=unresolved',
          `automation.flowSuggestions=${flowSuggestions.join('|') || 'none'}`,
          'automation.failClosed=unresolved-flow-target'
        );
        consistency = {
          checked: consistencyCheck,
          aligned: true,
          reason: consistencyCheck
            ? 'flow-targeted ask failed closed because no exact flow name was resolved'
            : 'consistency check disabled'
        };
        reject(
          'analysis.automation',
          'FLOW_NAME_UNRESOLVED',
          'flow-targeted ask did not resolve an exact flow name'
        );
      } else {
        const result = await this.analysis.automation(
          object ?? 'Case',
          undefined,
          false,
          false,
          includeLowConfidence
        );
        answer = result.explanation;
        deterministicAnswer = result.explanation;
        confidence = result.automations.length > 0 ? 0.82 : 0.58;
        consistency = {
          checked: consistencyCheck,
          aligned: true,
          reason: consistencyCheck
            ? 'ask automation answer is sourced from /automation deterministic output'
            : 'consistency check disabled'
        };
        if (result.automations.length === 0) {
          reject(
            'analysis.automation',
            'NO_AUTOMATION_MATCH',
            'no automation relation matched for requested object'
          );
        }
      }
    } else if (plan.intent === 'impact') {
      operatorsExecuted.push(COMPOSITION_OPERATORS.OVERLAY, COMPOSITION_OPERATORS.CONSTRAIN);
      const field = plan.entities.field ?? 'Opportunity.StageName';
      const result = await this.analysis.impact(
        field,
        undefined,
        false,
        false,
        false,
        includeLowConfidence
      );
      answer = result.explanation;
      deterministicAnswer = result.explanation;
      confidence = result.paths.length > 0 ? 0.8 : 0.55;
      if (consistencyCheck) {
        const verification = await this.analysis.impact(
          field,
          undefined,
          false,
          false,
          false,
          includeLowConfidence
        );
        const aligned =
          verification.totalPaths === result.totalPaths &&
          verification.explanation === result.explanation;
        consistency = {
          checked: true,
          aligned,
          reason: aligned
            ? 'ask impact answer matches /impact deterministic output'
            : 'ask impact answer diverged from /impact deterministic output'
        };
      } else {
        consistency = {
          checked: false,
          aligned: true,
          reason: 'consistency check disabled'
        };
      }
      if (result.paths.length === 0) {
        reject('analysis.impact', 'NO_IMPACT_PATHS', 'no impact paths found for requested field');
      }
    } else {
      reject('planner.default', 'NO_DETERMINISTIC_INTENT', 'no deterministic graph intent matched query');
    }
    deterministicAnswer = answer;

    const requestedMode = input.mode ?? this.llmService.defaultMode();
    const llmEnabled = this.llmService.isEnabled();
    let mode: AskResponse['mode'] = requestedMode;
    let llm: AskResponse['llm'] = {
      enabled: llmEnabled,
      used: false,
      provider: input.llm?.provider ?? this.configService.llmProvider()
    };

    if (requestedMode === 'llm_assist') {
      if (!llmEnabled) {
        mode = 'deterministic';
        llm = {
          ...llm,
          used: false,
          fallbackReason: 'llm disabled by configuration'
        };
      } else if (citations.length === 0 || confidence < AskService.LLM_MIN_CONFIDENCE) {
        mode = 'deterministic';
        llm = {
          ...llm,
          used: false,
          fallbackReason: 'insufficient evidence for llm_assist'
        };
        answer = deterministicAnswer;
      } else {
        const llmStartedAt = Date.now();
        try {
          const llmResult = await this.llmService.generate(
            {
              query: input.query,
              deterministicAnswer,
              plan,
              citations
            },
            {
              provider: input.llm?.provider,
              model: input.llm?.model,
              timeoutMs: input.llm?.timeoutMs,
              maxOutputTokens: input.llm?.maxOutputTokens
            }
          );

          const citedIds = this.resolveCitedIds(
            llmResult.citationsUsed,
            citations.map((citation) => citation.id),
            llmResult.rawText
          );
          const llmLatencyMs = Date.now() - llmStartedAt;

          if (citations.length > 0 && citedIds.length === 0) {
            const observed =
              llmResult.citationsUsed.length > 0 ? llmResult.citationsUsed.join(',') : '(none)';
            throw new Error(
              `LLM response did not reference provided citations (observed: ${observed})`
            );
          }
          if (llmLatencyMs > this.configService.askLlmMaxLatencyMs()) {
            throw new Error(
              `LLM latency ${llmLatencyMs}ms exceeded budget ${this.configService.askLlmMaxLatencyMs()}ms`
            );
          }
          if (
            typeof llmResult.tokenUsage?.output === 'number' &&
            llmResult.tokenUsage.output > this.configService.llmMaxOutputTokens()
          ) {
            throw new Error(
              `LLM output tokens ${llmResult.tokenUsage.output} exceeded budget ${this.configService.llmMaxOutputTokens()}`
            );
          }
          if (
            typeof llmResult.estimatedCostUsd === 'number' &&
            llmResult.estimatedCostUsd > this.configService.askLlmCostBudgetUsd()
          ) {
            throw new Error(
              `LLM estimated cost $${llmResult.estimatedCostUsd.toFixed(6)} exceeded budget $${this.configService.askLlmCostBudgetUsd().toFixed(6)}`
            );
          }

          answer = llmResult.answer;
          confidence = Math.min(0.97, confidence + 0.03);
          llm = {
            enabled: true,
            used: true,
            provider: llmResult.provider,
            model: llmResult.model,
            latencyMs: llmLatencyMs,
            tokenUsage: llmResult.tokenUsage,
            estimatedCostUsd: llmResult.estimatedCostUsd
          };
        } catch (error) {
          mode = 'deterministic';
          llm = {
            ...llm,
            used: false,
            fallbackReason: error instanceof Error ? error.message : 'unknown llm error',
            latencyMs: Date.now() - llmStartedAt
          };
          answer = deterministicAnswer;
        }
      }
    } else {
      mode = 'deterministic';
      llm = {
        ...llm,
        used: false
      };
    }

    const metrics = this.buildMetrics({
      citationCount: citations.length,
      confidence,
      consistencyChecked: consistency.checked,
      consistencyAligned: consistency.aligned,
      intent: plan.intent,
      rejectedBranchCount: rejectedBranches.length
    });
    const trustLevel = this.resolveTrustLevel(metrics, policy);
    const refusalReasons: string[] = [];

    if (trustLevel === 'refused') {
      mode = 'deterministic';
      answer =
        'Refused: insufficient deterministic support under the active policy envelope. Refine query or refresh metadata.';
      llm = {
        ...llm,
        used: false,
        fallbackReason: llm.fallbackReason ?? 'policy envelope rejected response'
      };
      reject('policy.envelope', 'POLICY_ENVELOPE_REJECTED', 'grounding/constraint thresholds not met');
      if (metrics.groundingScore < policy.groundingThreshold) {
        refusalReasons.push(
          `grounding_score ${metrics.groundingScore.toFixed(3)} below threshold ${policy.groundingThreshold.toFixed(3)}`
        );
      }
      if (metrics.constraintSatisfaction < policy.constraintThreshold) {
        refusalReasons.push(
          `constraint_satisfaction ${metrics.constraintSatisfaction.toFixed(3)} below threshold ${policy.constraintThreshold.toFixed(3)}`
        );
      }
    }

    const derivationEdges = [
      {
        id: stableId('der', plan.intent, 'plan', input.query),
        rel: DERIVATION_RELATIONS.DERIVED_FROM,
        from: 'plan',
        to: plan.intent
      },
      ...citations.map((citation) => ({
        id: stableId('der', citation.id, 'evidence', plan.intent),
        rel: DERIVATION_RELATIONS.SUPPORTS,
        from: citation.id,
        to: 'claim_1'
      }))
    ];

    const proofSeed = `${snapshotId}|${policy.policyId}|${input.query}|${deterministicAnswer}|${mode}`;
    const proofId = stableId('proof', proofSeed);
    const replayToken = stableId('trace', proofId, snapshotId, policy.policyId);
    const corePayloadJson = this.buildCorePayloadJson({
      deterministicAnswer,
      mode,
      plan,
      policyId: policy.policyId,
      trustLevel,
      metrics,
      decisionPacket
    });
    const corePayloadFingerprint = stableId('core', corePayloadJson);
    const fullProof: AskProofArtifact = {
      proofId,
      replayToken,
      generatedAt: new Date().toISOString(),
      snapshotId,
      policyId: policy.policyId,
      traceLevel,
      request: input,
      plan,
      operatorsExecuted,
      rejectedBranches,
      derivationEdges,
      citationIds: citations.map((citation) => citation.id),
      executionTrace,
      trustLevel,
      metrics,
      responseSummary: {
        answer,
        deterministicAnswer,
        confidence,
        mode,
        corePayloadFingerprint,
        corePayloadJson
      }
    };
    const proof = this.applyTraceLevel(fullProof, traceLevel);

    const response: AskResponse = {
      answer,
      deterministicAnswer,
      plan,
      decisionPacket,
      citations,
      confidence,
      mode,
      llm,
      consistency,
      policy,
      metrics,
      trustLevel,
      refusalReasons: refusalReasons.length > 0 ? refusalReasons : undefined,
      proof: {
        proofId,
        replayToken,
        snapshotId,
        traceLevel,
        operatorsExecuted,
        rejectedBranches
      },
      status: 'implemented'
    };

    return { response, proof };
  }

  private searchEvidence(
    query: string,
    maxResults: number,
    evidenceScope?: AskEvidenceScope
  ): EvidenceSearchResult[] {
    const options = evidenceScope ? this.buildEvidenceSearchOptions(evidenceScope) : undefined;
    return this.evidence.search(query, maxResults, options);
  }

  private buildEvidenceSearchOptions(evidenceScope: AskEvidenceScope):
    | {
        sourcePathEquals: string[];
        sourcePathPrefixes: string[];
      }
    | undefined {
    const exactMatches = new Set<string>();
    const prefixMatches = new Set<string>();
    const selections =
      evidenceScope.selections && evidenceScope.selections.length > 0
        ? evidenceScope.selections
        : this.buildSelectionsFromMetadataArgs(evidenceScope.metadataArgs);

    for (const selection of selections) {
      this.addEvidenceScopeRules(prefixMatches, exactMatches, evidenceScope.parsePath, selection);
    }

    if (exactMatches.size === 0 && prefixMatches.size === 0) {
      return undefined;
    }

    return {
      sourcePathEquals: [...exactMatches],
      sourcePathPrefixes: [...prefixMatches]
    };
  }

  private resolveScopedFlowEvidence(
    flowName: string,
    evidenceScope: AskEvidenceScope
  ): EvidenceSearchResult[] {
    const canonicalFlowName = this.resolveScopedFlowNameAlias(flowName, evidenceScope) ?? flowName;
    const rule = this.resolveSelectionSourceRule(evidenceScope.parsePath, 'Flow', canonicalFlowName);
    if (!rule?.exactPath) {
      return [];
    }
    const indexedHits = this.evidence.listBySourcePath(rule.exactPath, 24);
    if (indexedHits.length > 0) {
      return indexedHits;
    }

    const flowPath = path.join(evidenceScope.parsePath, 'flows', `${canonicalFlowName}.flow-meta.xml`);
    if (!fs.existsSync(flowPath)) {
      return [];
    }

    const raw = fs.readFileSync(flowPath, 'utf8');
    if (raw.trim().length === 0) {
      return [];
    }

    return [
      {
        id: `ev_scoped_${stableId(flowPath)}`,
        sourcePath: flowPath,
        sourceType: 'flow',
        chunkText: raw,
        entityTags: [canonicalFlowName],
        score: 1
      }
    ];
  }

  private resolveScopedFlowNameAlias(
    flowName: string | undefined,
    evidenceScope?: AskEvidenceScope
  ): string | undefined {
    if (!flowName || !evidenceScope) {
      return flowName;
    }

    const compactRequested = this.compactFlowToken(flowName);
    if (!compactRequested) {
      return flowName;
    }

    const candidates = new Set<string>();
    for (const selection of evidenceScope.selections ?? []) {
      if (selection.type.trim().toLowerCase() !== 'flow') {
        continue;
      }
      for (const member of selection.members ?? []) {
        const normalizedMember = this.normalizeRequestedFlowName(member);
        if (normalizedMember) {
          candidates.add(normalizedMember);
        }
      }
    }

    for (const metadataArg of evidenceScope.metadataArgs ?? []) {
      const [typeRaw, memberRaw] = metadataArg.split(':', 2);
      if (typeRaw?.trim().toLowerCase() !== 'flow') {
        continue;
      }
      const normalizedMember = this.normalizeRequestedFlowName(memberRaw);
      if (normalizedMember) {
        candidates.add(normalizedMember);
      }
    }

    for (const candidate of candidates) {
      if (this.compactFlowToken(candidate) === compactRequested) {
        return candidate;
      }
    }

    return flowName;
  }

  private normalizeEvidenceScope(evidenceScope?: AskEvidenceScope): AskEvidenceScope | undefined {
    if (!evidenceScope) {
      return undefined;
    }

    const parsePath = evidenceScope.parsePath?.trim();
    if (!parsePath) {
      return undefined;
    }

    const metadataArgs = (evidenceScope.metadataArgs ?? [])
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const selections = (evidenceScope.selections ?? [])
      .filter((selection) => selection && typeof selection.type === 'string' && selection.type.trim().length > 0)
      .map((selection) => ({
        type: selection.type.trim(),
        members: (selection.members ?? [])
          .map((member) => member.trim())
          .filter((member) => member.length > 0)
      }));

    return {
      kind: 'latest_retrieve',
      alias: evidenceScope.alias?.trim() || undefined,
      parsePath,
      metadataArgs,
      selections
    };
  }

  private buildSelectionsFromMetadataArgs(metadataArgs: string[]): AskEvidenceSelection[] {
    return metadataArgs.reduce<AskEvidenceSelection[]>((acc, metadataArg) => {
      const [typeRaw, memberRaw] = metadataArg.split(':', 2);
      const type = typeRaw?.trim();
      const member = memberRaw?.trim();
      if (!type) {
        return acc;
      }
      if (!member) {
        acc.push({ type });
        return acc;
      }
      acc.push({ type, members: [member] });
      return acc;
    }, []);
  }

  private addEvidenceScopeRules(
    prefixMatches: Set<string>,
    exactMatches: Set<string>,
    parsePath: string,
    selection: AskEvidenceSelection
  ): void {
    const members = selection.members ?? [];
    if (members.length === 0) {
      const familyDirectory = this.resolveMetadataFamilyDirectory(selection.type);
      if (!familyDirectory) {
        return;
      }
      prefixMatches.add(this.normalizeEvidenceSourcePath(path.join(parsePath, familyDirectory)));
      return;
    }

    for (const member of members) {
      const rule = this.resolveSelectionSourceRule(parsePath, selection.type, member);
      if (!rule) {
        continue;
      }
      if (rule.exactPath) {
        exactMatches.add(rule.exactPath);
      }
      if (rule.prefixPath) {
        prefixMatches.add(rule.prefixPath);
      }
    }
  }

  private resolveSelectionSourceRule(
    parsePath: string,
    type: string,
    member: string
  ): { exactPath?: string; prefixPath?: string } | undefined {
    const normalizedType = type.trim().toLowerCase();
    const normalizedMember = member.trim();
    if (!normalizedMember) {
      return undefined;
    }

    if (normalizedType === 'flow') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'flows', `${normalizedMember}.flow-meta.xml`)
        )
      };
    }

    if (normalizedType === 'customobject') {
      return {
        prefixPath: this.normalizeEvidenceSourcePath(path.join(parsePath, 'objects', normalizedMember))
      };
    }

    if (normalizedType === 'customfield') {
      const [objectName, fieldName] = normalizedMember.split('.', 2);
      if (!objectName || !fieldName) {
        return undefined;
      }
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'objects', objectName, 'fields', `${fieldName}.field-meta.xml`)
        )
      };
    }

    if (normalizedType === 'layout') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'layouts', `${normalizedMember}.layout-meta.xml`)
        )
      };
    }

    if (normalizedType === 'apexclass') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(path.join(parsePath, 'classes', `${normalizedMember}.cls`))
      };
    }

    if (normalizedType === 'apextrigger') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'triggers', `${normalizedMember}.trigger`)
        )
      };
    }

    if (normalizedType === 'permissionset') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'permissionsets', `${normalizedMember}.permissionset-meta.xml`)
        )
      };
    }

    if (normalizedType === 'profile') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'profiles', `${normalizedMember}.profile-meta.xml`)
        )
      };
    }

    if (normalizedType === 'permissionsetgroup') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'permissionsetgroups', `${normalizedMember}.permissionsetgroup-meta.xml`)
        )
      };
    }

    if (normalizedType === 'connectedapp') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'connectedapps', `${normalizedMember}.connectedApp-meta.xml`)
        )
      };
    }

    if (normalizedType === 'custompermission') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'custompermissions', `${normalizedMember}.customPermission-meta.xml`)
        )
      };
    }

    if (normalizedType === 'quickaction') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'quickactions', `${normalizedMember}.quickAction-meta.xml`)
        )
      };
    }

    if (normalizedType === 'flexipage') {
      return {
        exactPath: this.normalizeEvidenceSourcePath(
          path.join(parsePath, 'flexipages', `${normalizedMember}.flexipage-meta.xml`)
        )
      };
    }

    return undefined;
  }

  private resolveMetadataFamilyDirectory(type: string): string | undefined {
    const normalizedType = type.trim().toLowerCase();
    if (normalizedType === 'flow') return 'flows';
    if (normalizedType === 'customobject' || normalizedType === 'customfield' || normalizedType === 'recordtype') {
      return 'objects';
    }
    if (normalizedType === 'layout') return 'layouts';
    if (normalizedType === 'flexipage') return 'flexipages';
    if (normalizedType === 'apexclass') return 'classes';
    if (normalizedType === 'apextrigger') return 'triggers';
    if (normalizedType === 'permissionset') return 'permissionsets';
    if (normalizedType === 'profile') return 'profiles';
    if (normalizedType === 'permissionsetgroup') return 'permissionsetgroups';
    if (normalizedType === 'connectedapp') return 'connectedapps';
    if (normalizedType === 'custompermission') return 'custompermissions';
    if (normalizedType === 'quickaction') return 'quickactions';
    return undefined;
  }

  private normalizeEvidenceSourcePath(sourcePath: string): string {
    return sourcePath.replace(/\\/g, '/').toLowerCase();
  }

  private extractRequestedFlowName(query: string): string | undefined {
    const strictMatch = query.match(
      /\bflow(?:\s+(?:named|called))?\s+([A-Za-z0-9_\-\s]+?)(?=\s+(?:reads?|writes?|does|do|triggers?|updates?|references?)\b|[?.!,]|$)/i
    );
    const fallbackMatch = query.match(
      /\bflow(?:\s+(?:named|called))?\s+["'`]?(.+?)["'`]?(?=\s+(?:reads?|writes?|does|do|triggers?|updates?|references?)\b|[?.!,]|$)/i
    );
    const candidates = [strictMatch?.[1], fallbackMatch?.[1]];

    for (const candidate of candidates) {
      const normalized = this.normalizeRequestedFlowName(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private shouldInferFlowNameFromCitations(query: string): boolean {
    const normalized = query.trim().toLowerCase();
    if (normalized.includes('.flow-meta.xml')) {
      return true;
    }
    if (/\bflow\s+(?:called|named)\b/i.test(query)) {
      return true;
    }
    if (/\bflow\s+["'`][^"'`]+["'`]/i.test(query)) {
      return true;
    }
    return false;
  }

  private normalizeRequestedFlowName(candidate: string | undefined): string | undefined {
    if (!candidate) {
      return undefined;
    }
    let normalized = candidate
      .trim()
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^(the|a|an|named|called)\s+/i, '')
      .trim();
    const normalizedPath = normalized.replace(/\\/g, '/');
    const flowPathMatch = normalizedPath.match(/(?:^|\/)flows\/([^/]+)$/i);
    if (flowPathMatch?.[1]) {
      normalized = flowPathMatch[1];
    } else if (normalizedPath.includes('/')) {
      normalized = normalizedPath.split('/').pop() ?? normalized;
    }
    normalized = normalized
      .replace(/\.flow-meta\.xml$/i, '')
      .replace(/\.flow$/i, '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/[.,;:!?]+$/g, '')
      .replace(/^(the|a|an|named|called)\s+/i, '')
      .trim();
    if (normalized.length === 0) {
      return undefined;
    }
    if (
      /^(?:read|reads|write|writes)(?:\s+(?:and|or))?(?:\s+(?:read|reads|write|writes))?$/i.test(
        normalized
      )
    ) {
      return undefined;
    }
    if (new Set(['the', 'a', 'an', 'this', 'that']).has(normalized.toLowerCase())) {
      return undefined;
    }
    return normalized;
  }

  private inferRequestedFlowNameFromCitations(
    evidenceHits: EvidenceSearchResult[]
  ): string | undefined {
    const ranked = this.rankFlowNamesFromCitations(evidenceHits);
    if (ranked.length === 0) {
      return undefined;
    }

    const [topName, topScore] = ranked[0];
    const secondScore = ranked[1]?.[1] ?? 0;
    const totalScore = ranked.reduce((sum, [, score]) => sum + score, 0);

    if (topScore <= 0) {
      return undefined;
    }
    if (topScore < secondScore * 1.15) {
      return undefined;
    }
    if (topScore / totalScore < 0.45) {
      return undefined;
    }

    return topName;
  }

  private rankFlowNamesFromCitations(
    evidenceHits: EvidenceSearchResult[]
  ): Array<[name: string, score: number]> {
    const scoreByFlow = new Map<string, number>();
    for (const hit of evidenceHits) {
      const source = hit.sourcePath.replace(/\\/g, '/');
      const match = source.match(/\/flows\/([^/]+)\.flow-meta\.xml$/i);
      const flowName = this.normalizeRequestedFlowName(match?.[1]);
      if (!flowName) {
        continue;
      }
      const next = (scoreByFlow.get(flowName) ?? 0) + Math.max(0.05, hit.score);
      scoreByFlow.set(flowName, next);
    }
    return [...scoreByFlow.entries()].sort((a, b) => b[1] - a[1]);
  }

  private normalizeAutomationObject(candidate?: string): string | undefined {
    if (!candidate) {
      return undefined;
    }
    const normalized = candidate.trim();
    if (normalized.length === 0) {
      return undefined;
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
      return undefined;
    }
    if (this.isAutomationObjectStopWord(normalized)) {
      return undefined;
    }
    return normalized;
  }

  private isAutomationObjectStopWord(candidate: string): boolean {
    return new Set([
      'the',
      'a',
      'an',
      'latest',
      'this',
      'that',
      'my',
      'our',
      'flow',
      'called',
      'named',
      'read',
      'reads',
      'write',
      'writes'
    ]).has(candidate.toLowerCase());
  }

  private buildFlowEvidenceSummary(
    flowName: string,
    evidenceHits: EvidenceSearchResult[]
  ): FlowEvidenceSummary {
    const flowNameVariants = this.buildFlowNameVariants(flowName);
    const matchingFlowEvidence = evidenceHits.filter((hit) => {
      const sourceLower = hit.sourcePath.toLowerCase();
      const chunkLower = hit.chunkText.toLowerCase();
      const compactSource = this.compactFlowToken(sourceLower);
      const compactChunk = this.compactFlowToken(chunkLower);
      return flowNameVariants.some((variant) => {
        if (sourceLower.includes(variant) || chunkLower.includes(variant)) {
          return true;
        }
        const compactVariant = this.compactFlowToken(variant);
        return compactSource.includes(compactVariant) || compactChunk.includes(compactVariant);
      });
    });

    if (matchingFlowEvidence.length === 0) {
      return {
        explanation: `no retrieved flow evidence matched ${flowName}.`,
        matchedCount: 0,
        readFields: [],
        writeFields: [],
        readObjects: [],
        writeObjects: [],
        referencedObjects: [],
        triggerTypes: []
      };
    }

    const flowEvidence = this.dedupeCitations(
      matchingFlowEvidence.flatMap((hit) => [
        hit,
        ...this.evidence.listBySourcePath(hit.sourcePath, 24)
      ])
    );
    const flowEvidenceBySource = new Map<string, string[]>();
    for (const hit of flowEvidence) {
      const current = flowEvidenceBySource.get(hit.sourcePath) ?? [];
      current.push(hit.chunkText);
      flowEvidenceBySource.set(hit.sourcePath, current);
    }

    const referencedObjects = new Set<string>();
    const readObjects = new Set<string>();
    const writeObjects = new Set<string>();
    const triggerTypes = new Set<string>();
    const readFields = new Set<string>();
    const writeFields = new Set<string>();

    for (const sourceChunks of flowEvidenceBySource.values()) {
      const chunk = sourceChunks.join('');
      const chunkObjects = this.collectTagValues(chunk, 'object');
      for (const objectName of chunkObjects) {
        referencedObjects.add(objectName);
      }
      for (const objectName of this.collectObjectsFromSectionTag(chunk, 'recordLookups')) {
        readObjects.add(objectName);
      }
      for (const sectionTag of ['recordUpdates', 'recordCreates', 'recordDeletes']) {
        for (const objectName of this.collectObjectsFromSectionTag(chunk, sectionTag)) {
          writeObjects.add(objectName);
        }
      }
      for (const trigger of this.collectTagValues(chunk, 'recordTriggerType')) {
        triggerTypes.add(trigger);
      }
      for (const trigger of this.collectTagValues(chunk, 'triggerType')) {
        triggerTypes.add(trigger);
      }

      for (const field of this.collectFieldsFromSectionTag(chunk, 'inputAssignments')) {
        this.addFlowField(writeFields, field, chunkObjects);
      }
      for (const field of this.collectFieldsFromSectionTag(chunk, 'assignmentItems')) {
        this.addFlowField(writeFields, field, chunkObjects);
      }
      for (const assignmentRef of this.collectTagValues(chunk, 'assignToReference')) {
        this.addFlowField(writeFields, assignmentRef, chunkObjects);
      }

      for (const field of this.collectFieldsFromSectionTag(chunk, 'filters')) {
        this.addFlowField(readFields, field, chunkObjects);
      }
      for (const reference of this.collectTagValues(chunk, 'leftValueReference')) {
        this.addFlowField(readFields, reference, chunkObjects);
      }
      for (const expression of this.collectTagValues(chunk, 'expression')) {
        for (const token of expression.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)\b/g)) {
          this.addFlowField(readFields, token[1], chunkObjects);
        }
      }
    }

    for (const objectName of this.extractObjectsFromFieldSet(readFields)) {
      readObjects.add(objectName);
    }
    for (const objectName of this.extractObjectsFromFieldSet(writeFields)) {
      writeObjects.add(objectName);
    }
    for (const objectName of [...readObjects, ...writeObjects]) {
      referencedObjects.add(objectName);
    }

    const readObjectSummary = this.describeValueSet(readObjects, 'read objects');
    const writeObjectSummary = this.describeValueSet(writeObjects, 'write objects');
    const objectSummary = this.describeValueSet(referencedObjects, 'objects');
    const triggerSummary =
      this.describeValueSet(triggerTypes, 'trigger types');
    const readSummary = this.describeFieldSet(readFields, 'reads');
    const writeSummary = this.describeFieldSet(writeFields, 'writes');
    const readFieldList = [...readFields].sort((a, b) => a.localeCompare(b));
    const writeFieldList = [...writeFields].sort((a, b) => a.localeCompare(b));
    const readObjectList = [...readObjects].sort((a, b) => a.localeCompare(b));
    const writeObjectList = [...writeObjects].sort((a, b) => a.localeCompare(b));
    const referencedObjectList = [...referencedObjects].sort((a, b) => a.localeCompare(b));
    const triggerTypeList = [...triggerTypes].sort((a, b) => a.localeCompare(b));

    return {
      explanation:
        `retrieved flow evidence found for ${flowName}; ${flowEvidence.length} citation(s); ` +
        `${readSummary}; ${writeSummary}; ${readObjectSummary}; ${writeObjectSummary}; ${objectSummary}; ${triggerSummary}.`,
      matchedCount: flowEvidence.length,
      readFields: readFieldList,
      writeFields: writeFieldList,
      readObjects: readObjectList,
      writeObjects: writeObjectList,
      referencedObjects: referencedObjectList,
      triggerTypes: triggerTypeList
    };
  }

  private buildAutomationFlowDecisionPacket(input: {
    flowName: string;
    summary: FlowEvidenceSummary;
    citationCount: number;
    citationSourceLabels: string[];
    user?: string;
  }): AskDecisionPacket {
    const coverageScore = Math.min(1, input.citationCount / 6);
    const readFields = [...new Set(input.summary.readFields)];
    const writeFields = [...new Set(input.summary.writeFields)];
    const readObjects = [...new Set(input.summary.readObjects)];
    const writeObjects = [...new Set(input.summary.writeObjects)];
    const referencedObjects = [...new Set(input.summary.referencedObjects)];
    const triggerTypes = [...new Set(input.summary.triggerTypes)];
    const hasReads = readFields.length > 0;
    const hasWrites = writeFields.length > 0;
    const writeCountWeight = Math.min(0.2, writeFields.length * 0.035);
    const readCountWeight = Math.min(0.16, readFields.length * 0.025);
    const triggerWeight = triggerTypes.length > 0 ? 0.08 : 0.03;
    const baseRisk =
      0.32 +
      (hasWrites ? 0.11 : 0.04) +
      (hasReads ? 0.08 : 0.04) +
      writeCountWeight +
      readCountWeight +
      triggerWeight +
      (input.summary.matchedCount === 0 ? 0.28 : 0) +
      (1 - coverageScore) * 0.18;
    const riskScore = Number(Math.min(1, Math.max(0.05, baseRisk)).toFixed(3));
    const riskLevel: AskDecisionPacket['riskLevel'] =
      riskScore >= 0.7 ? 'high' : riskScore >= 0.4 ? 'medium' : 'low';
    const readSummary = this.describeFieldSet(new Set(readFields), 'reads');
    const writeSummary = this.describeFieldSet(new Set(writeFields), 'writes');
    const readObjectSummary = this.describeValueSet(new Set(readObjects), 'read objects');
    const writeObjectSummary = this.describeValueSet(new Set(writeObjects), 'write objects');
    const objectSummary = this.describeValueSet(new Set(referencedObjects), 'objects');
    const triggerSummary = this.describeValueSet(new Set(triggerTypes), 'trigger types');
    const topCitationSources = [
      ...new Set(
        input.citationSourceLabels
          .map((label) => label.trim())
          .filter((label) => label.length > 0)
      )
    ]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 3);
    const topCitationSummary =
      topCitationSources.length > 0
        ? topCitationSources.join(', ')
        : 'citation source labels unavailable';
    const topImpactedSources = [...new Set([...writeFields, ...readFields, ...referencedObjects])].slice(0, 3);
    const primaryPermissionTarget =
      writeFields[0] ?? readFields[0] ?? referencedObjects[0] ?? input.flowName;
    const nextActions: AskDecisionPacket['nextActions'] = [];
    if (input.summary.matchedCount === 0) {
      nextActions.push({
        label: 'Retrieve flow metadata',
        rationale:
          `No retrieved citations matched ${input.flowName}. Retrieve the flow family or broader metadata scope, then rerun Ask.`
      });
    }
    nextActions.push(
      {
        label: 'Inspect write targets',
        rationale: writeSummary
      },
      {
        label: 'Inspect read conditions',
        rationale: readSummary
      }
    );
    if (triggerTypes.length > 0) {
      nextActions.push({
        label: 'Inspect trigger criteria',
        rationale: triggerSummary
      });
    }
    nextActions.push({
      label: 'Run permission check',
      rationale: `Ask who can edit ${primaryPermissionTarget} before approving downstream changes.`
    });
    nextActions.push({
      label: 'Inspect citation sources',
      rationale: `Validate flow grounding against: ${topCitationSummary}.`
    });
    if (input.citationCount < 3) {
      nextActions.push({
        label: 'Increase evidence coverage',
        rationale:
          'Citation coverage is light for this packet. Retrieve related metadata families and rerun Ask for higher confidence.'
      });
    }

    return {
      kind: 'high_risk_change_review',
      focus: 'breakage',
      targetLabel: input.flowName,
      targetType: 'flow',
      summary:
        input.summary.matchedCount > 0
          ? `Flow ${input.flowName} read/write summary grounded by ${input.summary.matchedCount} citation(s): ${readSummary}; ${writeSummary}; ${readObjectSummary}; ${writeObjectSummary}.`
          : `Flow ${input.flowName} is not grounded by the current retrieve evidence yet.`,
      riskScore,
      riskLevel,
      evidenceCoverage: {
        citationCount: input.citationCount,
        hasPermissionPaths: false,
        hasAutomationCoverage: input.summary.matchedCount > 0,
        hasImpactPaths: hasReads || hasWrites
      },
      topRiskDrivers: [
        `${input.summary.matchedCount} citation(s) matched the requested flow`,
        topCitationSources.length > 0
          ? `top citation sources: ${topCitationSummary}`
          : 'top citation sources unavailable',
        `${writeFields.length} explicit write field(s) identified`,
        `${readFields.length} explicit read field(s) identified`,
        readObjectSummary,
        writeObjectSummary,
        writeSummary,
        readSummary,
        objectSummary,
        triggerSummary
      ],
      permissionImpact: {
        user: input.user ?? 'n/a',
        summary:
          `Permission paths are not part of this flow read/write ask. Run a permission ask for ${primaryPermissionTarget} if approval depends on actor access.`,
        granted: false,
        pathCount: 0,
        principalCount: 0,
        warnings: ['permission coverage not evaluated in flow read/write packet']
      },
      automationImpact: {
        summary: input.summary.explanation,
        automationCount: input.summary.matchedCount,
        topAutomationNames: [input.flowName]
      },
      changeImpact: {
        summary: `${readSummary}; ${writeSummary}; ${readObjectSummary}; ${writeObjectSummary}; ${objectSummary}; ${triggerSummary}.`,
        impactPathCount: topImpactedSources.length,
        topImpactedSources
      },
      nextActions: nextActions.slice(0, 6)
    };
  }

  private buildFlowNameVariants(flowName: string): string[] {
    const lower = flowName.toLowerCase().trim();
    const variants = new Set<string>([lower]);
    variants.add(lower.replace(/\s+/g, '_'));
    variants.add(lower.replace(/_/g, ' '));
    variants.add(lower.replace(/[-\s]+/g, '_'));
    variants.add(lower.replace(/[_\s-]+/g, ''));
    return [...variants].filter((value) => value.length > 0);
  }

  private mapCitationHits(
    citationHits: EvidenceSearchResult[]
  ): Array<{
    id: string;
    sourcePath: string;
    sourceType: string;
    snippet: string;
    score: number;
  }> {
    return citationHits.map((hit) => ({
      id: hit.id,
      sourcePath: hit.sourcePath,
      sourceType: hit.sourceType,
      snippet: hit.chunkText.slice(0, 240),
      score: hit.score
    }));
  }

  private compactFlowToken(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private toCitationSourceLabel(sourcePath: string): string {
    const normalized = sourcePath.replace(/\\/g, '/');
    const segments = normalized.split('/').filter((segment) => segment.length > 0);
    const fileName = segments[segments.length - 1];
    return fileName && fileName.length > 0 ? fileName : normalized;
  }

  private collectTagValues(chunk: string, tagName: string): string[] {
    const values = new Set<string>();
    const pattern = new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'gi');
    for (const match of chunk.matchAll(pattern)) {
      const value = match[1].trim();
      if (value.length > 0) {
        values.add(value);
      }
    }
    return [...values];
  }

  private collectFieldsFromSectionTag(chunk: string, sectionTag: string): string[] {
    const fields = new Set<string>();
    const sectionPattern = new RegExp(
      `<${sectionTag}>([\\s\\S]{0,280}?)</${sectionTag}>`,
      'gi'
    );
    for (const section of chunk.matchAll(sectionPattern)) {
      const sectionBody = section[1];
      for (const fieldMatch of sectionBody.matchAll(/<field>([^<]+)<\/field>/gi)) {
        const value = fieldMatch[1].trim();
        if (value.length > 0) {
          fields.add(value);
        }
      }
    }
    return [...fields];
  }

  private collectObjectsFromSectionTag(chunk: string, sectionTag: string): string[] {
    const objects = new Set<string>();
    const sectionPattern = new RegExp(
      `<${sectionTag}>([\\s\\S]{0,420}?)</${sectionTag}>`,
      'gi'
    );
    for (const section of chunk.matchAll(sectionPattern)) {
      const sectionBody = section[1];
      for (const objectName of this.collectTagValues(sectionBody, 'object')) {
        objects.add(objectName);
      }
    }
    return [...objects];
  }

  private addFlowField(target: Set<string>, rawValue: string, objects: string[]): void {
    const normalized = rawValue.trim().replace(/^\{!/, '').replace(/\}$/, '');
    if (normalized.length === 0) {
      return;
    }
    if (/[^A-Za-z0-9_.]/.test(normalized)) {
      return;
    }
    if (normalized.includes('.')) {
      target.add(normalized);
      return;
    }
    if (objects.length === 1) {
      target.add(`${objects[0]}.${normalized}`);
      return;
    }
    target.add(normalized);
  }

  private extractObjectsFromFieldSet(fields: Set<string>): string[] {
    const objects = new Set<string>();
    for (const field of fields) {
      const separator = field.indexOf('.');
      if (separator <= 0) {
        continue;
      }
      objects.add(field.slice(0, separator));
    }
    return [...objects];
  }

  private describeFieldSet(fields: Set<string>, label: string): string {
    if (fields.size === 0) {
      return `${label}: not explicit in retrieved flow evidence`;
    }
    const sorted = [...fields].sort((a, b) => a.localeCompare(b));
    const visible = sorted.slice(0, 6);
    const remaining = sorted.length - visible.length;
    const suffix = remaining > 0 ? ` (+${remaining} more)` : '';
    return `${label}: ${visible.join(', ')}${suffix}`;
  }

  private describeValueSet(values: Set<string>, label: string): string {
    if (values.size === 0) {
      return `${label}: not explicit in retrieved flow evidence`;
    }
    const sorted = [...values].sort((a, b) => a.localeCompare(b));
    const visible = sorted.slice(0, 6);
    const remaining = sorted.length - visible.length;
    const suffix = remaining > 0 ? ` (+${remaining} more)` : '';
    return `${label}: ${visible.join(', ')}${suffix}`;
  }

  private buildMetrics(input: {
    citationCount: number;
    confidence: number;
    consistencyChecked: boolean;
    consistencyAligned: boolean;
    intent: string;
    rejectedBranchCount: number;
  }): AskMeaningMetrics {
    const groundingScore = Math.max(
      0,
      Math.min(1, input.citationCount > 0 ? Math.min(1, 0.55 + input.confidence * 0.45) : 0.25)
    );
    const constraintSatisfaction = input.consistencyChecked
      ? input.consistencyAligned
        ? 1
        : 0.55
      : input.intent === 'unknown'
        ? 0.7
        : 0.92;
    const ambiguityScore = Math.max(
      0,
      Math.min(1, input.intent === 'mixed' ? 0.5 : input.intent === 'unknown' ? 0.8 : 0.25)
    );
    const stabilityScore = input.consistencyChecked ? (input.consistencyAligned ? 1 : 0.6) : 0.9;
    const deltaNovelty = input.intent === 'unknown' ? 0.1 : 0.28;
    const riskSurfaceScore = Math.max(
      0.1,
      Math.min(1, 0.35 + input.rejectedBranchCount * 0.1 + (input.intent === 'impact' ? 0.15 : 0))
    );

    return {
      groundingScore,
      constraintSatisfaction,
      ambiguityScore,
      stabilityScore,
      deltaNovelty,
      riskSurfaceScore
    };
  }

  private buildCorePayloadJson(input: {
    deterministicAnswer: string;
    mode: AskResponse['mode'];
    plan: AskResponse['plan'];
    policyId: string;
    trustLevel: AskTrustLevel;
    metrics: AskMeaningMetrics;
    decisionPacket?: AskDecisionPacket;
  }): string;
  private buildCorePayloadJson(input: AskResponse): string;
  private buildCorePayloadJson(
    input:
      | {
          deterministicAnswer: string;
          mode: AskResponse['mode'];
          plan: AskResponse['plan'];
          policyId: string;
          trustLevel: AskTrustLevel;
          metrics: AskMeaningMetrics;
          decisionPacket?: AskDecisionPacket;
        }
      | AskResponse
  ): string {
    const payload =
      'policy' in input
        ? {
            deterministicAnswer: input.deterministicAnswer,
            mode: input.mode,
            plan: input.plan,
            policyId: input.policy.policyId,
            trustLevel: input.trustLevel,
            metrics: input.metrics,
            decisionPacket: input.decisionPacket
          }
        : {
            deterministicAnswer: input.deterministicAnswer,
            mode: input.mode,
            plan: input.plan,
            policyId: input.policyId,
            trustLevel: input.trustLevel,
            metrics: input.metrics,
            decisionPacket: input.decisionPacket
          };
    return JSON.stringify(payload);
  }

  private applyTraceLevel(proof: AskProofArtifact, level: AskTraceLevel): AskProofArtifact {
    if (level === 'full') {
      return proof;
    }
    if (level === 'compact') {
      return {
        ...proof,
        operatorsExecuted: proof.operatorsExecuted.slice(0, 1),
        rejectedBranches: proof.rejectedBranches.slice(0, 2),
        derivationEdges: [],
        citationIds: proof.citationIds.slice(0, 3),
        executionTrace: undefined
      };
    }
    return {
      ...proof,
      derivationEdges: proof.derivationEdges.slice(0, 12),
      citationIds: proof.citationIds.slice(0, 10),
      executionTrace: undefined
    };
  }

  private resolveTrustLevel(
    metrics: AskMeaningMetrics,
    policy: {
      groundingThreshold: number;
      constraintThreshold: number;
      ambiguityMaxThreshold: number;
    }
  ): AskTrustLevel {
    if (
      metrics.groundingScore < policy.groundingThreshold ||
      metrics.constraintSatisfaction < policy.constraintThreshold
    ) {
      return 'refused';
    }
    if (metrics.ambiguityScore > policy.ambiguityMaxThreshold) {
      return 'conditional';
    }
    return 'trusted';
  }

  private buildPolicyId(
    groundingThreshold: number,
    constraintThreshold: number,
    ambiguityMaxThreshold: number
  ): string {
    return stableId(
      'policy',
      groundingThreshold.toFixed(3),
      constraintThreshold.toFixed(3),
      ambiguityMaxThreshold.toFixed(3)
    );
  }

  private readSnapshotId(): string {
    const refreshStatePath = resolveRefreshStatePath(this.configService.refreshStatePath());
    try {
      if (!fs.existsSync(refreshStatePath)) {
        return 'snap_unavailable';
      }
      const raw = fs.readFileSync(refreshStatePath, 'utf8');
      const parsed = JSON.parse(raw) as { fingerprint?: string };
      const fingerprint = parsed.fingerprint?.trim();
      if (!fingerprint) {
        return 'snap_unavailable';
      }
      return `snap_${fingerprint.slice(0, 24)}`;
    } catch {
      return 'snap_unavailable';
    }
  }

  private readRefreshState():
    | {
        snapshotId: string;
        semanticDiff: {
          addedNodeCount: number;
          removedNodeCount: number;
          addedEdgeCount: number;
          removedEdgeCount: number;
        };
        meaningChangeSummary: string;
      }
    | undefined {
    const refreshStatePath = resolveRefreshStatePath(this.configService.refreshStatePath());
    try {
      if (!fs.existsSync(refreshStatePath)) {
        return undefined;
      }
      const raw = fs.readFileSync(refreshStatePath, 'utf8');
      const parsed = JSON.parse(raw) as {
        snapshotId?: string;
        semanticDiff?: {
          addedNodeCount?: number;
          removedNodeCount?: number;
          addedEdgeCount?: number;
          removedEdgeCount?: number;
        };
        meaningChangeSummary?: string;
      };
      if (!parsed.snapshotId || typeof parsed.snapshotId !== 'string') {
        return undefined;
      }
      return {
        snapshotId: parsed.snapshotId,
        semanticDiff: {
          addedNodeCount: parsed.semanticDiff?.addedNodeCount ?? 0,
          removedNodeCount: parsed.semanticDiff?.removedNodeCount ?? 0,
          addedEdgeCount: parsed.semanticDiff?.addedEdgeCount ?? 0,
          removedEdgeCount: parsed.semanticDiff?.removedEdgeCount ?? 0
        },
        meaningChangeSummary:
          typeof parsed.meaningChangeSummary === 'string'
            ? parsed.meaningChangeSummary
            : 'meaning change summary unavailable'
      };
    } catch {
      return undefined;
    }
  }

  private dedupeCitations<T extends { sourcePath: string; chunkText: string; score: number }>(
    hits: T[]
  ): T[] {
    const byKey = new Map<string, T>();
    for (const hit of hits) {
      const key = `${hit.sourcePath}|${hit.chunkText.trim()}`;
      const existing = byKey.get(key);
      if (!existing || hit.score > existing.score) {
        byKey.set(key, hit);
      }
    }
    return [...byKey.values()].sort((a, b) => b.score - a.score);
  }

  private resolveCitedIds(
    rawCitations: string[],
    validCitationIds: string[],
    rawLlmText?: string
  ): string[] {
    const validSet = new Set(validCitationIds);
    const resolved = new Set<string>();

    for (const raw of rawCitations) {
      const normalized = raw.trim();
      if (!normalized) {
        continue;
      }

      if (validSet.has(normalized)) {
        resolved.add(normalized);
        continue;
      }

      const embeddedId = normalized.match(/(ev_[a-z0-9]+)/i)?.[1];
      if (embeddedId && validSet.has(embeddedId)) {
        resolved.add(embeddedId);
        continue;
      }

      const numeric = normalized.replace(/[^\d]/g, '');
      if (numeric.length > 0) {
        const idx = Number(numeric);
        if (Number.isInteger(idx) && idx >= 1 && idx <= validCitationIds.length) {
          resolved.add(validCitationIds[idx - 1]);
        }
      }
    }

    if (resolved.size === 0 && rawLlmText) {
      const matches = rawLlmText.match(/\[(\d+)\]/g) ?? [];
      for (const match of matches) {
        const idx = Number(match.replace(/[^\d]/g, ''));
        if (Number.isInteger(idx) && idx >= 1 && idx <= validCitationIds.length) {
          resolved.add(validCitationIds[idx - 1]);
        }
      }
    }

    return [...resolved];
  }
}
