import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  Post,
  Query
} from '@nestjs/common';
import { AskService } from './ask.service';
import type {
  AskArchitectureDecisionRequest,
  AskArchitectureDecisionResponse,
  AskSimulationCompareRequest,
  AskSimulationCompareResponse,
  AskSimulationRequest,
  AskSimulationResponse,
  AskInternalErrorEnvelope,
  AskMetricsExportResponse,
  AskProofListResponse,
  AskPolicyValidateRequest,
  AskPolicyValidateResponse,
  AskProofLookupResponse,
  AskReplayRequest,
  AskReplayResponse,
  AskRequest,
  AskResponse
} from './ask.types';

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
      body.traceLevel !== undefined &&
      body.traceLevel !== 'compact' &&
      body.traceLevel !== 'standard' &&
      body.traceLevel !== 'full'
    ) {
      throw new BadRequestException("traceLevel must be 'compact', 'standard', or 'full'");
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

  @Get('/ask/proof/:proofId')
  getProof(@Param('proofId') proofId: string): AskProofLookupResponse {
    if (typeof proofId !== 'string' || proofId.trim().length === 0) {
      throw new BadRequestException('proofId is required');
    }
    return this.askService.getProof(proofId.trim());
  }

  @Get('/ask/proofs/recent')
  listRecentProofs(@Query('limit') limitRaw?: string): AskProofListResponse {
    const limit = limitRaw ? Number(limitRaw) : 10;
    return this.askService.listRecentProofs(Number.isInteger(limit) ? limit : 10);
  }

  @Get('/ask/metrics/export')
  exportMetrics(): AskMetricsExportResponse {
    return this.askService.exportMetrics();
  }

  @Post('/ask/policy/validate')
  validatePolicy(@Body() body: AskPolicyValidateRequest): AskPolicyValidateResponse {
    if (body === undefined || body === null) {
      return this.askService.validatePolicy({ dryRun: false });
    }
    if (typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('body must be an object');
    }
    for (const [name, value] of Object.entries({
      groundingThreshold: body.groundingThreshold,
      constraintThreshold: body.constraintThreshold,
      ambiguityMaxThreshold: body.ambiguityMaxThreshold
    })) {
      if (value !== undefined && (typeof value !== 'number' || Number.isNaN(value))) {
        throw new BadRequestException(`${name} must be a number`);
      }
    }
    if (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') {
      throw new BadRequestException('dryRun must be a boolean');
    }
    return this.askService.validatePolicy(body);
  }

  @Post('/ask/replay')
  async replay(@Body() body: AskReplayRequest): Promise<AskReplayResponse> {
    if (!body || (typeof body !== 'object' && !Array.isArray(body))) {
      throw new BadRequestException('body is required');
    }
    const replayToken = body.replayToken?.trim();
    const proofId = body.proofId?.trim();
    if (!replayToken && !proofId) {
      throw new BadRequestException('replayToken or proofId is required');
    }
    return this.askService.replay({ replayToken, proofId });
  }

  @Post('/ask/architecture')
  async architectureDecision(
    @Body() body: AskArchitectureDecisionRequest
  ): Promise<AskArchitectureDecisionResponse> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('body is required');
    }
    if (!body.user || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.user.trim())) {
      throw new BadRequestException('user must be a valid email address');
    }
    if (!body.object || !/^[A-Za-z][A-Za-z0-9_]*$/.test(body.object.trim())) {
      throw new BadRequestException('object must be a valid Salesforce object name');
    }
    if (
      !body.field ||
      !/^[A-Za-z][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(body.field.trim())
    ) {
      throw new BadRequestException('field must match Object.Field format');
    }
    if (
      body.maxPaths !== undefined &&
      (!Number.isInteger(body.maxPaths) || body.maxPaths < 1 || body.maxPaths > 50)
    ) {
      throw new BadRequestException('maxPaths must be an integer between 1 and 50');
    }
    return this.askService.architectureDecision({
      user: body.user.trim().toLowerCase(),
      object: body.object.trim(),
      field: body.field.trim(),
      maxPaths: body.maxPaths
    });
  }

  @Post('/ask/simulate')
  async simulate(@Body() body: AskSimulationRequest): Promise<AskSimulationResponse> {
    this.validateSimulationRequest(body);
    return this.askService.simulateScenario({
      ...body,
      user: body.user.trim().toLowerCase(),
      object: body.object.trim(),
      field: body.field.trim()
    });
  }

  @Post('/ask/simulate/compare')
  async compareSimulation(
    @Body() body: AskSimulationCompareRequest
  ): Promise<AskSimulationCompareResponse> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('body is required');
    }
    this.validateSimulationRequest(body.scenarioA);
    this.validateSimulationRequest(body.scenarioB);
    return this.askService.compareSimulations({
      scenarioA: {
        ...body.scenarioA,
        user: body.scenarioA.user.trim().toLowerCase(),
        object: body.scenarioA.object.trim(),
        field: body.scenarioA.field.trim()
      },
      scenarioB: {
        ...body.scenarioB,
        user: body.scenarioB.user.trim().toLowerCase(),
        object: body.scenarioB.object.trim(),
        field: body.scenarioB.field.trim()
      }
    });
  }

  private validateSimulationRequest(body: AskSimulationRequest): void {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('body is required');
    }
    if (!body.user || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.user.trim())) {
      throw new BadRequestException('user must be a valid email address');
    }
    if (!body.object || !/^[A-Za-z][A-Za-z0-9_]*$/.test(body.object.trim())) {
      throw new BadRequestException('object must be a valid Salesforce object name');
    }
    if (
      !body.field ||
      !/^[A-Za-z][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(body.field.trim())
    ) {
      throw new BadRequestException('field must match Object.Field format');
    }
    if (
      body.profile !== undefined &&
      body.profile !== 'strict' &&
      body.profile !== 'balanced' &&
      body.profile !== 'exploratory'
    ) {
      throw new BadRequestException("profile must be 'strict', 'balanced', or 'exploratory'");
    }
    if (
      body.maxPaths !== undefined &&
      (!Number.isInteger(body.maxPaths) || body.maxPaths < 1 || body.maxPaths > 50)
    ) {
      throw new BadRequestException('maxPaths must be an integer between 1 and 50');
    }
    if (!Array.isArray(body.proposedChanges) || body.proposedChanges.length === 0) {
      throw new BadRequestException('proposedChanges must include at least one change');
    }
    if (body.proposedChanges.length > 25) {
      throw new BadRequestException('proposedChanges supports at most 25 items');
    }
  }
}
