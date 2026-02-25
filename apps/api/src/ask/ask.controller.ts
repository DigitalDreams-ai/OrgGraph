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

    if (body.maxCitations !== undefined && (!Number.isInteger(body.maxCitations) || body.maxCitations < 1)) {
      throw new BadRequestException('maxCitations must be a positive integer');
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
      throw new InternalServerErrorException(envelope);
    }
  }
}
