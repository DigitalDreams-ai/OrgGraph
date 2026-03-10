import { Injectable } from '@nestjs/common';
import type {
  AskPlan,
  AskIntent,
  AskReviewWorkflow,
  AskSemanticFrameSourceMode,
  AskSemanticFrameTarget,
  AskSemanticFrameV1
} from './planner.types';

@Injectable()
export class PlannerService {
  plan(query: string): AskPlan {
    const normalized = query.trim();
    const { normalizedQuery, rewriteRules } = this.normalizeQuery(normalized);
    const lower = normalizedQuery.toLowerCase();
    const tokens = this.tokenizeQuery(normalizedQuery);

    const user = this.extractUser(normalized);
    const field = this.extractField(normalized);
    const object = this.extractObject(normalized, field) ?? this.extractObject(normalizedQuery, field);
    const reviewWorkflow = this.compileReviewWorkflow(tokens, object, field);

    const hasPerms = /(perm|permission|edit|access|who can edit|who has access|can\s+i)/i.test(lower);
    const hasAutomation = /(automation|trigger|flow|runs\s+on|what\s+runs|which\s+flows|which\s+triggers)/i.test(lower);
    const hasImpact = /(impact|break|touches|what\s+touches|blast radius|what changes if)/i.test(lower);

    let intent: AskIntent = 'unknown';
    if (reviewWorkflow) {
      intent = 'review';
    } else {
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
    }

    const graphCalls: string[] = [];
    if (intent === 'review') {
      graphCalls.push('queries.perms', 'analysis.automation', 'analysis.impact');
    } else if (intent === 'perms' || intent === 'mixed') {
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
      evidenceCalls: ['evidence.search'],
      reviewWorkflow,
      semanticFrame: this.buildSemanticFrame(intent, normalizedQuery, object, field)
    };
  }

  private buildSemanticFrame(
    intent: AskIntent,
    normalizedQuery: string,
    object?: string,
    field?: string
  ): AskSemanticFrameV1 | undefined {
    if (intent === 'impact') {
      const sourceMode: AskSemanticFrameSourceMode = /\blatest retrieve\b/i.test(normalizedQuery)
        ? 'latest_retrieve'
        : 'graph_global';
      const target = this.buildMetadataTarget(field, object);

      return {
        version: 'v1',
        intent: 'impact_analysis',
        target: target ?? undefined,
        sourceMode,
        scope: {
          snapshot: 'current',
          orgSession: 'active'
        },
        modifiers: {
          includeAutomation: true,
          includePermissions: false,
          includeEvidence: true,
          includeProof: false
        },
        admissibility: field
          ? {
              status: 'accepted',
              reason: null
            }
          : target
          ? {
              status: 'blocked',
              reason: 'unsupported_target_kind'
            }
          : {
              status: 'blocked',
              reason: 'no_grounded_target'
            },
        ambiguity: field
          ? {
              status: 'clear',
              issues: []
            }
          : target
          ? {
              status: 'unsupported_question',
              issues: ['unsupported_target_kind']
            }
          : {
              status: 'insufficient_evidence',
              issues: ['no_grounded_target']
            }
      };
    }

    if (intent !== 'automation' || !this.shouldEmitAutomationSemanticFrame(normalizedQuery, object, field)) {
      return undefined;
    }

    const sourceMode: AskSemanticFrameSourceMode = /\blatest retrieve\b/i.test(normalizedQuery)
      ? 'latest_retrieve'
      : 'graph_global';
    const target = this.buildMetadataTarget(field, object);

    return {
      version: 'v1',
      intent: 'automation_path_explanation',
      target: target ?? undefined,
      sourceMode,
      scope: {
        snapshot: 'current',
        orgSession: 'active'
      },
      modifiers: {
        includeAutomation: true,
        includePermissions: false,
        includeEvidence: true,
        includeProof: false
      },
      admissibility: target
        ? {
            status: 'accepted',
            reason: null
          }
        : {
            status: 'blocked',
            reason: 'no_grounded_target'
          },
      ambiguity: target
        ? {
            status: 'clear',
            issues: []
          }
        : {
            status: 'insufficient_evidence',
            issues: ['no_grounded_target']
          }
    };
  }

  private shouldEmitAutomationSemanticFrame(
    normalizedQuery: string,
    object?: string,
    field?: string
  ): boolean {
    if (field || object) {
      return true;
    }

    return /\bwhat automations update this\b/i.test(normalizedQuery);
  }

  private buildMetadataTarget(field?: string, object?: string): AskSemanticFrameTarget | null {
    if (field) {
      return {
        kind: 'field',
        raw: field,
        candidates: [
          {
            id: field,
            kind: 'field',
            source: 'metadata'
          }
        ],
        selected: field
      };
    }

    if (object) {
      return {
        kind: 'object',
        raw: object,
        candidates: [
          {
            id: object,
            kind: 'object',
            source: 'metadata'
          }
        ],
        selected: object
      };
    }

    return null;
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
      const tokenEnd = index + match[0].length;
      const trailing = input.slice(tokenEnd, tokenEnd + 10).toLowerCase();
      const firstSegment = match[1].toLowerCase();
      const secondSegment = match[2].toLowerCase();
      if ((firstSegment === 'flow' && secondSegment === 'meta') || secondSegment === 'xml') {
        continue;
      }
      if (
        secondSegment === 'flow' &&
        (trailing.startsWith('-meta.xml') || trailing.startsWith('.meta.xml'))
      ) {
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
      const candidate = explicit[1];
      if (!this.isObjectStopWord(candidate)) {
        return candidate;
      }
    }

    const onObject = input.match(/\bon\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (onObject?.[1]) {
      const candidate = onObject[1];
      if (!this.isObjectStopWord(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  private isObjectStopWord(candidate: string): boolean {
    return new Set(['the', 'a', 'an', 'latest', 'this', 'that', 'my', 'our']).has(
      candidate.toLowerCase()
    );
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

  private compileReviewWorkflow(
    tokens: string[],
    object?: string,
    field?: string
  ): AskReviewWorkflow | undefined {
    const targetLabel = field ?? object;
    if (!targetLabel) {
      return undefined;
    }

    const hasChangeAction = this.hasAnyToken(tokens, ['change', 'changing', 'update', 'updating']);
    if (!hasChangeAction) {
      return undefined;
    }

    const approvalRuleMatched =
      this.hasTokenSequence(tokens, ['should', 'we', 'approve']) ||
      this.hasAnyToken(tokens, ['approve', 'approval']);
    const breakageRuleMatched =
      this.hasTokenSequence(tokens, ['what', 'breaks']) ||
      this.hasAnyToken(tokens, ['breaks', 'breakage']);
    const riskRuleMatched =
      this.hasAnyToken(tokens, ['risk', 'review']) ||
      this.hasTokenSequence(tokens, ['what', 'is', 'the', 'real', 'risk']);

    let focus: AskReviewWorkflow['focus'] | undefined;
    let compilerRuleId: AskReviewWorkflow['compilerRuleId'] | undefined;
    if (approvalRuleMatched) {
      focus = 'approval';
      compilerRuleId = 'review_approval_change';
    } else if (breakageRuleMatched) {
      focus = 'breakage';
      compilerRuleId = 'review_breakage_change';
    } else if (riskRuleMatched) {
      focus = 'risk';
      compilerRuleId = 'review_risk_change';
    }

    if (!focus || !compilerRuleId) {
      return undefined;
    }

    return {
      kind: 'high_risk_change_review',
      compilerRuleId,
      action: 'change',
      focus,
      targetType: field ? 'field' : 'object',
      targetLabel
    };
  }

  private tokenizeQuery(input: string): string[] {
    return input
      .toLowerCase()
      .replace(/[?!,;:()]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  private hasAnyToken(tokens: string[], candidates: string[]): boolean {
    const candidateSet = new Set(candidates);
    return tokens.some((token) => candidateSet.has(token));
  }

  private hasTokenSequence(tokens: string[], sequence: string[]): boolean {
    if (sequence.length === 0 || tokens.length < sequence.length) {
      return false;
    }

    for (let index = 0; index <= tokens.length - sequence.length; index += 1) {
      let matched = true;
      for (let offset = 0; offset < sequence.length; offset += 1) {
        if (tokens[index + offset] !== sequence[offset]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return true;
      }
    }

    return false;
  }
}
