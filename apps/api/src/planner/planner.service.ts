import { Injectable } from '@nestjs/common';
import type { AskPlan, AskIntent } from './planner.types';

@Injectable()
export class PlannerService {
  plan(query: string): AskPlan {
    const normalized = query.trim();
    const lower = normalized.toLowerCase();

    const user = this.extractUser(normalized);
    const field = this.extractField(normalized);
    const object = this.extractObject(normalized, field);

    const hasPerms = /(perm|permission|edit|access|can\s+i)/i.test(lower);
    const hasAutomation = /(automation|trigger|flow|runs\s+on|what\s+runs)/i.test(lower);
    const hasImpact = /(impact|break|touches|what\s+touches)/i.test(lower);

    let intent: AskIntent = 'unknown';
    const activeCount = [hasPerms, hasAutomation, hasImpact].filter(Boolean).length;
    if (activeCount > 1) {
      intent = 'mixed';
    } else if (hasPerms) {
      intent = 'perms';
    } else if (hasAutomation) {
      intent = 'automation';
    } else if (hasImpact) {
      intent = 'impact';
    }

    const graphCalls: string[] = [];
    if (intent === 'perms' || intent === 'mixed') {
      graphCalls.push('queries.perms');
    }
    if (intent === 'automation' || intent === 'mixed') {
      graphCalls.push('analysis.automation');
    }
    if (intent === 'impact' || intent === 'mixed') {
      graphCalls.push('analysis.impact');
    }

    return {
      intent,
      entities: { user, object, field },
      graphCalls,
      evidenceCalls: ['evidence.search']
    };
  }

  private extractUser(input: string): string | undefined {
    const match = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match?.[0].toLowerCase();
  }

  private extractField(input: string): string | undefined {
    const pattern = /\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b/g;
    for (const match of input.matchAll(pattern)) {
      const index = match.index ?? 0;
      const before = index > 0 ? input[index - 1] : '';
      if (before === '@') {
        continue;
      }
      return match[0];
    }
    return undefined;
  }

  private extractObject(input: string, field?: string): string | undefined {
    if (field) {
      return field.split('.')[0];
    }

    const explicit = input.match(/\bobject\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (explicit?.[1]) {
      return explicit[1];
    }

    const onObject = input.match(/\bon\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (onObject?.[1]) {
      return onObject[1];
    }

    return undefined;
  }
}
