import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  InternalServerErrorException,
  Post
} from '@nestjs/common';
import { AskService } from './ask.service';
import type { AskInternalErrorEnvelope, AskRequest, AskResponse } from './ask.types';

@Controller()
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post('/ask')
  async ask(@Body() body: AskRequest): Promise<AskResponse> {
    if (!body || typeof body.query !== 'string' || body.query.trim().length === 0) {
      throw new BadRequestException('query is required');
    }

    if (body.query.trim().length > 1000) {
      throw new BadRequestException('query must be 1000 characters or fewer');
    }

    if (
      body.maxCitations !== undefined &&
      (!Number.isInteger(body.maxCitations) || body.maxCitations < 1 || body.maxCitations > 20)
    ) {
      throw new BadRequestException('maxCitations must be an integer between 1 and 20');
    }

    if (
      body.includeLowConfidence !== undefined &&
      typeof body.includeLowConfidence !== 'boolean'
    ) {
      throw new BadRequestException('includeLowConfidence must be a boolean');
    }

    if (body.consistencyCheck !== undefined && typeof body.consistencyCheck !== 'boolean') {
      throw new BadRequestException('consistencyCheck must be a boolean');
    }

    if (
      body.mode !== undefined &&
      body.mode !== 'deterministic' &&
      body.mode !== 'llm_assist'
    ) {
      throw new BadRequestException("mode must be 'deterministic' or 'llm_assist'");
    }

    if (body.llm !== undefined) {
      if (typeof body.llm !== 'object' || body.llm === null || Array.isArray(body.llm)) {
        throw new BadRequestException('llm must be an object');
      }
      if (
        body.llm.provider !== undefined &&
        body.llm.provider !== 'none' &&
        body.llm.provider !== 'openai' &&
        body.llm.provider !== 'anthropic'
      ) {
        throw new BadRequestException("llm.provider must be 'none', 'openai', or 'anthropic'");
      }
      if (
        body.llm.model !== undefined &&
        (typeof body.llm.model !== 'string' || body.llm.model.trim().length === 0)
      ) {
        throw new BadRequestException('llm.model must be a non-empty string');
      }
      if (
        body.llm.timeoutMs !== undefined &&
        (!Number.isInteger(body.llm.timeoutMs) || body.llm.timeoutMs < 500 || body.llm.timeoutMs > 120000)
      ) {
        throw new BadRequestException('llm.timeoutMs must be an integer between 500 and 120000');
      }
      if (
        body.llm.maxOutputTokens !== undefined &&
        (!Number.isInteger(body.llm.maxOutputTokens) ||
          body.llm.maxOutputTokens < 32 ||
          body.llm.maxOutputTokens > 4096)
      ) {
        throw new BadRequestException('llm.maxOutputTokens must be an integer between 32 and 4096');
      }
    }

    if (body.context !== undefined) {
      if (typeof body.context !== 'object' || body.context === null || Array.isArray(body.context)) {
        throw new BadRequestException('context must be a key-value object');
      }
      if (Object.keys(body.context).length > 20) {
        throw new BadRequestException('context may include at most 20 keys');
      }
    }

    try {
      return await this.askService.ask(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown ask error';
      const envelope: AskInternalErrorEnvelope = {
        error: {
          code: 'ASK_INTERNAL_ERROR',
          stage: 'response',
          message
        }
      };
      throw new InternalServerErrorException({
        message: 'ask orchestration failed',
        details: envelope.error
      });
    }
  }
}
