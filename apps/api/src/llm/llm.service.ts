import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { parseLlmJsonResponse } from './llm-json';
import type {
  LlmGenerateOptions,
  LlmGenerateRequest,
  LlmGenerateResponse,
  LlmHealth,
  LlmProviderName
} from './llm.types';

@Injectable()
export class LlmService {
  constructor(private readonly configService: AppConfigService) {}

  isEnabled(): boolean {
    return this.configService.llmEnabled();
  }

  defaultMode(): 'deterministic' | 'llm_assist' {
    return this.configService.askDefaultMode();
  }

  async health(provider?: LlmProviderName): Promise<LlmHealth> {
    const selected = provider ?? this.configService.llmProvider();
    if (!this.configService.llmEnabled() || selected === 'none') {
      return { ok: true, provider: 'none', message: 'LLM disabled' };
    }

    if (selected === 'openai') {
      const key = this.configService.openaiApiKey();
      return {
        ok: Boolean(key),
        provider: 'openai',
        model: this.configService.openaiModel(),
        message: key ? 'configured' : 'OPENAI_API_KEY missing'
      };
    }

    const key = this.configService.anthropicApiKey();
    return {
      ok: Boolean(key),
      provider: 'anthropic',
      model: this.configService.anthropicModel(),
      message: key ? 'configured' : 'ANTHROPIC_API_KEY missing'
    };
  }

  async generate(
    request: LlmGenerateRequest,
    options: LlmGenerateOptions = {}
  ): Promise<LlmGenerateResponse> {
    if (!this.configService.llmEnabled()) {
      throw new Error('LLM is disabled by configuration');
    }

    const provider = this.resolveProvider(options.provider);
    if (provider === 'none') {
      throw new Error('LLM provider is none');
    }

    if (provider === 'openai') {
      return this.generateOpenAi(request, options);
    }
    return this.generateAnthropic(request, options);
  }

  private resolveProvider(override?: LlmProviderName): LlmProviderName {
    if (!override || !this.configService.llmAllowProviderOverride()) {
      return this.configService.llmProvider();
    }
    return override;
  }

  private resolveModel(provider: 'openai' | 'anthropic', override?: string): string {
    if (!override || !this.configService.llmAllowProviderOverride()) {
      return provider === 'openai' ? this.configService.openaiModel() : this.configService.anthropicModel();
    }
    return override.trim();
  }

  private resolveMaxTokens(override?: number): number {
    if (!override || !this.configService.llmAllowProviderOverride()) {
      return this.configService.llmMaxOutputTokens();
    }
    return override;
  }

  private resolveTimeoutMs(override?: number): number {
    if (!override || !this.configService.llmAllowProviderOverride()) {
      return this.configService.llmTimeoutMs();
    }
    return override;
  }

  private buildPrompt(request: LlmGenerateRequest): string {
    const citations = request.citations
      .map((citation, index) => {
        const sanitizedSnippet = citation.snippet.replace(/\s+/g, ' ').slice(0, 240);
        return `[${index + 1}] id=${citation.id} type=${citation.sourceType} path=${citation.sourcePath}\n${sanitizedSnippet}`;
      })
      .join('\n\n');

    return [
      'You are assisting OrgGraph. Deterministic graph output is the source of truth.',
      'Only produce claims that are supported by provided citations.',
      'If citations are insufficient, keep answer conservative and state uncertainty.',
      'Use citation ids in citations_used, or citation indexes like [1], [2], [3].',
      'Keep answer concise and actionable. Prefer a one-line summary plus short bullet points.',
      'Return strict JSON only with keys: answer, reasoning_summary, citations_used.',
      'citations_used must contain citation ids from the provided list.',
      '',
      `User query: ${request.query}`,
      `Deterministic answer: ${request.deterministicAnswer}`,
      `Planned intent: ${request.plan.intent}`,
      `Plan entities: ${JSON.stringify(request.plan.entities)}`,
      '',
      'Citations (indexed):',
      citations.length > 0 ? citations : '(none provided)'
    ].join('\n');
  }

  private async generateOpenAi(
    request: LlmGenerateRequest,
    options: LlmGenerateOptions
  ): Promise<LlmGenerateResponse> {
    const apiKey = this.configService.openaiApiKey();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for openai provider');
    }

    const model = this.resolveModel('openai', options.model);
    const maxTokens = this.resolveMaxTokens(options.maxOutputTokens);
    const timeoutMs = this.resolveTimeoutMs(options.timeoutMs);
    const prompt = this.buildPrompt(request);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.configService.openaiBaseUrl(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          max_tokens: maxTokens,
          messages: [
            {
              role: 'system',
              content:
                'You must output strict JSON: {"answer":"...","reasoning_summary":"...","citations_used":["ev_..."]}'
            },
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const details = await this.extractErrorDetails(response);
        throw new Error(`OpenAI request failed (${response.status}): ${details}`);
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI response missing message content');
      }
      return parseLlmJsonResponse(content, 'openai', model);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateAnthropic(
    request: LlmGenerateRequest,
    options: LlmGenerateOptions
  ): Promise<LlmGenerateResponse> {
    const apiKey = this.configService.anthropicApiKey();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for anthropic provider');
    }

    const model = this.resolveModel('anthropic', options.model);
    const maxTokens = this.resolveMaxTokens(options.maxOutputTokens);
    const timeoutMs = this.resolveTimeoutMs(options.timeoutMs);
    const prompt = this.buildPrompt(request);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.configService.anthropicBaseUrl(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system:
            'Output strict JSON only with keys answer, reasoning_summary, citations_used; no markdown fences.',
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const details = await this.extractErrorDetails(response);
        throw new Error(`Anthropic request failed (${response.status}): ${details}`);
      }

      const body = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const text = body.content?.find((item) => item.type === 'text')?.text;
      if (!text) {
        throw new Error('Anthropic response missing text content');
      }

      return parseLlmJsonResponse(text, 'anthropic', model);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async extractErrorDetails(response: Response): Promise<string> {
    try {
      const raw = await response.text();
      if (!raw) {
        return 'no response body';
      }
      try {
        const parsed = JSON.parse(raw) as
          | { error?: { message?: string; type?: string } }
          | { message?: string; type?: string };
        if (parsed && typeof parsed === 'object') {
          const errorObj = 'error' in parsed ? parsed.error : parsed;
          if (errorObj && typeof errorObj === 'object') {
            const type =
              'type' in errorObj && typeof errorObj.type === 'string'
                ? `type=${errorObj.type} `
                : '';
            const message =
              'message' in errorObj && typeof errorObj.message === 'string'
                ? errorObj.message
                : '';
            const combined = `${type}${message}`.trim();
            if (combined.length > 0) {
              return combined;
            }
          }
        }
      } catch {
        // fall back to raw excerpt
      }
      return raw.replace(/\s+/g, ' ').slice(0, 280);
    } catch {
      return 'failed to read error response body';
    }
  }
}
