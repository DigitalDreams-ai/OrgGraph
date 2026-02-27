import { Injectable } from '@nestjs/common';
import type { AskPlan, AskIntent } from './planner.types';

@Injectable()
export class PlannerService {
  plan(query: string): AskPlan {
    const normalized = query.trim();
    const { normalizedQuery, rewriteRules } = this.normalizeQuery(normalized);
    const lower = normalizedQuery.toLowerCase();

    const user = this.extractUser(normalized);
    const field = this.extractField(normalized);
    const object = this.extractObject(normalized, field) ?? this.extractObject(normalizedQuery, field);

    const hasPerms = /(perm|permission|edit|access|who can edit|who has access|can\s+i)/i.test(lower);
    const hasAutomation = /(automation|trigger|flow|runs\s+on|what\s+runs|which\s+flows|which\s+triggers)/i.test(lower);
    const hasImpact = /(impact|break|touches|what\s+touches|blast radius|what changes if)/i.test(lower);

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
      normalizedQuery,
      rewriteRules,
      entities: { user, object, field },
      graphCalls,
      evidenceCalls: ['evidence.search']
    };
  }

  private normalizeQuery(input: string): { normalizedQuery: string; rewriteRules: string[] } {
    let normalized = input.toLowerCase().replace(/\s+/g, ' ').trim();
    const rewriteRules: string[] = [];

    const rules: Array<{ pattern: RegExp; replacement: string; id: string }> = [
      { pattern: /\bwho can edit\b/g, replacement: 'permission edit', id: 'perm_who_can_edit' },
      { pattern: /\bwho has access\b/g, replacement: 'permission access', id: 'perm_who_has_access' },
      { pattern: /\bwhich flows\b/g, replacement: 'automation flows', id: 'auto_which_flows' },
      { pattern: /\bwhich triggers\b/g, replacement: 'automation triggers', id: 'auto_which_triggers' },
      { pattern: /\bblast radius\b/g, replacement: 'impact', id: 'impact_blast_radius' },
      { pattern: /\bwhat changes if\b/g, replacement: 'impact', id: 'impact_what_changes_if' }
    ];

    for (const rule of rules) {
      if (rule.pattern.test(normalized)) {
        normalized = normalized.replace(rule.pattern, rule.replacement);
        rewriteRules.push(rule.id);
      }
    }

    return { normalizedQuery: normalized, rewriteRules };
  }

  private extractUser(input: string): string | undefined {
    const match = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match?.[0].toLowerCase();
  }

  private extractField(input: string): string | undefined {
    const emailRanges = this.findEmailRanges(input);
    const pattern = /\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b/g;
    for (const match of input.matchAll(pattern)) {
      const index = match.index ?? 0;
      const before = index > 0 ? input[index - 1] : '';
      if (before === '@') {
        continue;
      }
      if (this.overlapsEmailRange(index, match[0].length, emailRanges)) {
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

  private findEmailRanges(input: string): Array<{ start: number; end: number }> {
    const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    const ranges: Array<{ start: number; end: number }> = [];
    for (const match of input.matchAll(emailPattern)) {
      const start = match.index ?? -1;
      if (start < 0) {
        continue;
      }
      ranges.push({ start, end: start + match[0].length });
    }
    return ranges;
  }

  private overlapsEmailRange(
    tokenStart: number,
    tokenLength: number,
    ranges: Array<{ start: number; end: number }>
  ): boolean {
    const tokenEnd = tokenStart + tokenLength;
    return ranges.some((range) => tokenStart < range.end && tokenEnd > range.start);
  }
}
