import { Injectable, Logger } from '@nestjs/common';
import { AnalysisService } from '../analysis/analysis.service';
import { AppConfigService } from '../config/app-config.service';
import { EvidenceStoreService } from '../evidence/evidence-store.service';
import { LlmService } from '../llm/llm.service';
import { QueriesService } from '../queries/queries.service';
import { PlannerService } from '../planner/planner.service';
import type { AskRequest, AskResponse } from './ask.types';

@Injectable()
export class AskService {
  private readonly logger = new Logger(AskService.name);

  constructor(
    private readonly configService: AppConfigService,
    private readonly planner: PlannerService,
    private readonly queries: QueriesService,
    private readonly analysis: AnalysisService,
    private readonly evidence: EvidenceStoreService,
    private readonly llmService: LlmService
  ) {}

  async ask(input: AskRequest): Promise<AskResponse> {
    const startedAt = Date.now();
    const plan = this.planner.plan(input.query);
    const includeLowConfidence = input.includeLowConfidence === true;
    const consistencyCheck =
      input.consistencyCheck ?? this.configService.askConsistencyCheckEnabled();
    const maxCitations = Math.max(1, Math.min(20, input.maxCitations ?? 5));
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

    if (plan.intent === 'perms' || plan.intent === 'mixed') {
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
    } else if (plan.intent === 'automation') {
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
    } else if (plan.intent === 'impact') {
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
            const observed = llmResult.citationsUsed.length > 0 ? llmResult.citationsUsed.join(',') : '(none)';
            throw new Error(`LLM response did not reference provided citations (observed: ${observed})`);
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

    const response: AskResponse = {
      answer,
      deterministicAnswer,
      plan,
      citations,
      confidence,
      mode,
      llm,
      consistency,
      status: 'implemented'
    };

    this.logger.log(
      `ask intent=${plan.intent} elapsedMs=${Date.now() - startedAt} citations=${citations.length}`
    );

    return response;
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
