import { Injectable, Logger } from '@nestjs/common';
import { AnalysisService } from '../analysis/analysis.service';
import { EvidenceStoreService } from '../evidence/evidence-store.service';
import { QueriesService } from '../queries/queries.service';
import { PlannerService } from '../planner/planner.service';
import type { AskRequest, AskResponse } from './ask.types';

@Injectable()
export class AskService {
  private readonly logger = new Logger(AskService.name);

  constructor(
    private readonly planner: PlannerService,
    private readonly queries: QueriesService,
    private readonly analysis: AnalysisService,
    private readonly evidence: EvidenceStoreService
  ) {}

  ask(input: AskRequest): AskResponse {
    const startedAt = Date.now();
    const plan = this.planner.plan(input.query);
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

    const citations = citationHits.map((hit) => ({
      id: hit.id,
      sourcePath: hit.sourcePath,
      sourceType: hit.sourceType,
      snippet: hit.chunkText.slice(0, 240),
      score: hit.score
    }));

    let answer = 'No deterministic plan matched the query.';
    let confidence = 0.2;

    if (plan.intent === 'perms' || plan.intent === 'mixed') {
      const user = plan.entities.user ?? 'jane@example.com';
      const object = plan.entities.object ?? 'Case';
      const result = this.queries.perms(user, object, plan.entities.field);
      answer = result.explanation;
      confidence = result.granted ? 0.86 : 0.62;
    } else if (plan.intent === 'automation') {
      const object = plan.entities.object ?? 'Case';
      const result = this.analysis.automation(object);
      answer = result.explanation;
      confidence = result.automations.length > 0 ? 0.82 : 0.58;
    } else if (plan.intent === 'impact') {
      const field = plan.entities.field ?? 'Opportunity.StageName';
      const result = this.analysis.impact(field);
      answer = result.explanation;
      confidence = result.paths.length > 0 ? 0.8 : 0.55;
    }

    const response: AskResponse = {
      answer,
      plan,
      citations,
      confidence,
      status: 'implemented'
    };

    this.logger.log(
      `ask intent=${plan.intent} elapsedMs=${Date.now() - startedAt} citations=${citations.length}`
    );

    return response;
  }
}
