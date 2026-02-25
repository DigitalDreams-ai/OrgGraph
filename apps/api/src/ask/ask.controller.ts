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
  ask(@Body() body: AskRequest): AskResponse {
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

    if (body.context !== undefined) {
      if (typeof body.context !== 'object' || body.context === null || Array.isArray(body.context)) {
        throw new BadRequestException('context must be a key-value object');
      }
      if (Object.keys(body.context).length > 20) {
        throw new BadRequestException('context may include at most 20 keys');
      }
    }

    try {
      return this.askService.ask(body);
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
