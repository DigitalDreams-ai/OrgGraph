import { Injectable, NotFoundException } from '@nestjs/common';
import fs from 'node:fs';
import { COMPOSITION_OPERATORS, DERIVATION_RELATIONS } from '@orggraph/ontology';
import type { CompositionOperator } from '@orggraph/ontology';
import { AnalysisService } from '../analysis/analysis.service';
import { stableId } from '../common/ids';
import { resolveRefreshStatePath } from '../common/path';
import { AppConfigService } from '../config/app-config.service';
import { EvidenceStoreService } from '../evidence/evidence-store.service';
import { LlmService } from '../llm/llm.service';
import { PlannerService } from '../planner/planner.service';
import { QueriesService } from '../queries/queries.service';
import { AskProofStoreService } from './ask-proof-store.service';
import type {
  AskMeaningMetrics,
  AskProofArtifact,
  AskProofLookupResponse,
  AskReplayRequest,
  AskReplayResponse,
  AskRequest,
  AskResponse,
  AskTrustLevel
} from './ask.types';

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
    private readonly proofStore: AskProofStoreService
  ) {}

  async ask(input: AskRequest): Promise<AskResponse> {
    const { response, proof } = await this.execute(input, true);
    this.proofStore.append(proof);
    return response;
  }

  getProof(proofId: string): AskProofLookupResponse {
    const proof = this.proofStore.findByProofId(proofId);
    if (!proof) {
      throw new NotFoundException(`proof not found: ${proofId}`);
    }
    return { proof, status: 'implemented' };
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

    const replayRun = await this.execute(proof.request, false);
    const replayed = replayRun.response;
    const matched =
      replayed.deterministicAnswer === proof.responseSummary.deterministicAnswer &&
      replayed.plan.intent === proof.plan.intent &&
      replayed.policy.policyId === proof.policyId &&
      replayed.proof.snapshotId === proof.snapshotId;

    return {
      replayToken: proof.replayToken,
      proofId: proof.proofId,
      matched,
      snapshotId: proof.snapshotId,
      policyId: proof.policyId,
      original: {
        answer: proof.responseSummary.answer,
        deterministicAnswer: proof.responseSummary.deterministicAnswer,
        confidence: proof.responseSummary.confidence,
        mode: proof.responseSummary.mode,
        trustLevel: proof.trustLevel
      },
      replayed: {
        answer: replayed.answer,
        deterministicAnswer: replayed.deterministicAnswer,
        confidence: replayed.confidence,
        mode: replayed.mode,
        trustLevel: replayed.trustLevel
      },
      status: 'implemented'
    };
  }

  private async execute(input: AskRequest, includeCreatedAtInProof: boolean): Promise<{
    response: AskResponse;
    proof: AskProofArtifact;
  }> {
    const plan = this.planner.plan(input.query);
    const includeLowConfidence = input.includeLowConfidence === true;
    const consistencyCheck =
      input.consistencyCheck ?? this.configService.askConsistencyCheckEnabled();
    const maxCitations = Math.max(1, Math.min(20, input.maxCitations ?? 5));
    const snapshotId = this.readSnapshotId();
    const policy = {
      policyId: this.buildPolicyId(),
      groundingThreshold: this.configService.askGroundingScoreThreshold(),
      constraintThreshold: this.configService.askConstraintSatisfactionThreshold(),
      ambiguityMaxThreshold: this.configService.askAmbiguityMaxThreshold()
    };

    let citationHits = this.evidence.search(input.query, maxCitations);
    if (citationHits.length === 0) {
      const fallbackTerms = [plan.entities.field, plan.entities.object, plan.entities.user]
        .filter((x): x is string => Boolean(x))
        .join(' ');
      if (fallbackTerms.length > 0) {
        citationHits = this.evidence.search(fallbackTerms, maxCitations);
      }
    }
    citationHits = this.dedupeCitations(citationHits);

    const citations = citationHits.map((hit) => ({
      id: hit.id,
      sourcePath: hit.sourcePath,
      sourceType: hit.sourceType,
      snippet: hit.chunkText.slice(0, 240),
      score: hit.score
    }));

    let answer = 'No deterministic plan matched the query.';
    let deterministicAnswer = answer;
    let confidence = 0.2;
    let consistency: AskResponse['consistency'] = {
      checked: false,
      aligned: true,
      reason: 'consistency check not applicable'
    };
    const operatorsExecuted: CompositionOperator[] = [COMPOSITION_OPERATORS.SPECIALIZE];
    const rejectedBranches: Array<{ branch: string; reason: string }> = [];

    if (plan.intent === 'perms' || plan.intent === 'mixed') {
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
        rejectedBranches.push({
          branch: 'queries.perms',
          reason: 'no granting path found for requested principal/object'
        });
      }
    } else if (plan.intent === 'automation') {
      operatorsExecuted.push(COMPOSITION_OPERATORS.OVERLAY, COMPOSITION_OPERATORS.INTERSECT);
      const object = plan.entities.object ?? 'Case';
      const result = await this.analysis.automation(
        object,
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
        rejectedBranches.push({
          branch: 'analysis.automation',
          reason: 'no automation relation matched for requested object'
        });
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
        rejectedBranches.push({
          branch: 'analysis.impact',
          reason: 'no impact paths found for requested field'
        });
      }
    } else {
      rejectedBranches.push({
        branch: 'planner.default',
        reason: 'no deterministic graph intent matched query'
      });
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
          if (citations.length > 0 && citedIds.length === 0) {
            const observed =
              llmResult.citationsUsed.length > 0 ? llmResult.citationsUsed.join(',') : '(none)';
            throw new Error(
              `LLM response did not reference provided citations (observed: ${observed})`
            );
          }

          answer = llmResult.answer;
          confidence = Math.min(0.97, confidence + 0.03);
          llm = {
            enabled: true,
            used: true,
            provider: llmResult.provider,
            model: llmResult.model,
            latencyMs: Date.now() - llmStartedAt
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

    if (trustLevel === 'refused') {
      mode = 'deterministic';
      answer =
        'Refused: insufficient deterministic support under the active policy envelope. Refine query or refresh metadata.';
      llm = {
        ...llm,
        used: false,
        fallbackReason: llm.fallbackReason ?? 'policy envelope rejected response'
      };
      rejectedBranches.push({
        branch: 'policy.envelope',
        reason: 'grounding/constraint thresholds not met'
      });
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
    const proofId = stableId('proof', proofSeed, includeCreatedAtInProof ? new Date().toISOString() : '');
    const replayToken = stableId('trace', proofId, snapshotId, policy.policyId);
    const proof: AskProofArtifact = {
      proofId,
      replayToken,
      generatedAt: new Date().toISOString(),
      snapshotId,
      policyId: policy.policyId,
      request: input,
      plan,
      operatorsExecuted,
      rejectedBranches,
      derivationEdges,
      citationIds: citations.map((citation) => citation.id),
      trustLevel,
      metrics,
      responseSummary: {
        answer,
        deterministicAnswer,
        confidence,
        mode
      }
    };

    const response: AskResponse = {
      answer,
      deterministicAnswer,
      plan,
      citations,
      confidence,
      mode,
      llm,
      consistency,
      policy,
      metrics,
      trustLevel,
      proof: {
        proofId,
        replayToken,
        snapshotId,
        operatorsExecuted,
        rejectedBranches
      },
      status: 'implemented'
    };

    return { response, proof };
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

  private buildPolicyId(): string {
    return stableId(
      'policy',
      this.configService.askGroundingScoreThreshold().toFixed(3),
      this.configService.askConstraintSatisfactionThreshold().toFixed(3),
      this.configService.askAmbiguityMaxThreshold().toFixed(3)
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
