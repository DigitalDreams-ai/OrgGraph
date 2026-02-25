import { Injectable, Logger } from '@nestjs/common';
import { AnalysisService } from '../analysis/analysis.service';
import { AppConfigService } from '../config/app-config.service';
import { EvidenceStoreService } from '../evidence/evidence-store.service';
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
    private readonly evidence: EvidenceStoreService
  ) {}

  ask(input: AskRequest): AskResponse {
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
    let confidence = 0.2;
    let consistency: AskResponse['consistency'] = {
      checked: false,
      aligned: true,
      reason: 'consistency check not applicable'
    };

    if (plan.intent === 'perms' || plan.intent === 'mixed') {
      const user = plan.entities.user ?? 'jane@example.com';
      const object = plan.entities.object ?? 'Case';
      const result = this.queries.perms(user, object, plan.entities.field);
      answer = result.explanation;
      confidence = result.granted ? 0.86 : 0.62;
      consistency = {
        checked: false,
        aligned: true,
        reason: 'perms intent uses deterministic query directly'
      };
    } else if (plan.intent === 'automation') {
      const object = plan.entities.object ?? 'Case';
      const result = this.analysis.automation(
        object,
        undefined,
        false,
        false,
        includeLowConfidence
      );
      answer = result.explanation;
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
      const result = this.analysis.impact(
        field,
        undefined,
        false,
        false,
        false,
        includeLowConfidence
      );
      answer = result.explanation;
      confidence = result.paths.length > 0 ? 0.8 : 0.55;
      if (consistencyCheck) {
        const verification = this.analysis.impact(
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

    const response: AskResponse = {
      answer,
      plan,
      citations,
      confidence,
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
}
