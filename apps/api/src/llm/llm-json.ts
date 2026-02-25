import type { LlmGenerateResponse } from './llm.types';

interface ParsedResponse {
  answer?: unknown;
  reasoning_summary?: unknown;
  citations_used?: unknown;
}

export function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export function parseLlmJsonResponse(
  raw: string,
  provider: 'openai' | 'anthropic',
  model: string
): LlmGenerateResponse {
  let parsed: ParsedResponse;
  try {
    parsed = JSON.parse(extractJsonObject(raw)) as ParsedResponse;
  } catch {
    throw new Error('LLM response was not valid JSON');
  }

  if (typeof parsed.answer !== 'string' || parsed.answer.trim().length === 0) {
    throw new Error('LLM response missing non-empty answer');
  }
  if (typeof parsed.reasoning_summary !== 'string' || parsed.reasoning_summary.trim().length === 0) {
    throw new Error('LLM response missing non-empty reasoning_summary');
  }

  const citations = Array.isArray(parsed.citations_used)
    ? parsed.citations_used
        .map((item) => {
          if (typeof item === 'string') {
            return item.trim();
          }
          if (typeof item === 'number' && Number.isFinite(item)) {
            return String(item);
          }
          return '';
        })
        .filter((item) => item.length > 0)
    : [];

  return {
    answer: parsed.answer.trim(),
    reasoningSummary: parsed.reasoning_summary.trim(),
    citationsUsed: [...new Set(citations)],
    provider,
    model,
    rawText: raw
  };
}
