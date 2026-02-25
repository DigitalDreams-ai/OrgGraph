import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AnalysisService } from './analysis.service';

@Controller()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('/impact')
  async impact(
    @Query('field') field?: string,
    @Query('limit') limitRaw?: string,
    @Query('strict') strictRaw?: string,
    @Query('debug') debugRaw?: string,
    @Query('explain') explainRaw?: string,
    @Query('includeLowConfidence') includeLowConfidenceRaw?: string
  ): Promise<{
    field: string;
    relationsChecked: string[];
    paths: Array<{ from: string; rel: string; to: string; confidence: 'high' | 'medium' | 'low'; score: number }>;
    totalPaths: number;
    truncated: boolean;
    explanation: string;
    strictMode: boolean;
    minConfidenceApplied: 'low' | 'medium' | 'high';
    explainMode: boolean;
    explain?: { scoring: { relBaseScore: Record<string, number>; confidenceWeights: Record<string, number> } };
    debug?: { raw: unknown[] };
    status: 'implemented';
  }> {
    if (!field) {
      throw new BadRequestException('field query param is required');
    }

    if (!/^[A-Za-z][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(field.trim())) {
      throw new BadRequestException('field must match Object.Field format');
    }

    let limit: number | undefined;
    if (limitRaw !== undefined) {
      limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException('limit must be an integer between 1 and 100');
      }
    }

    const strict = strictRaw === 'true';
    const debug = debugRaw === 'true';
    const explain = explainRaw === 'true';
    const includeLowConfidence = includeLowConfidenceRaw === 'true';

    return this.analysisService.impact(
      field.trim(),
      limit,
      strict,
      debug,
      explain,
      includeLowConfidence
    );
  }

  @Get('/automation')
  async automation(
    @Query('object') object?: string,
    @Query('limit') limitRaw?: string,
    @Query('strict') strictRaw?: string,
    @Query('explain') explainRaw?: string,
    @Query('includeLowConfidence') includeLowConfidenceRaw?: string
  ): Promise<{
    object: string;
    relationsChecked: string[];
    automations: Array<{ type: string; name: string; rel: string; confidence: 'high' | 'medium' | 'low'; score: number }>;
    totalAutomations: number;
    truncated: boolean;
    explanation: string;
    strictMode: boolean;
    minConfidenceApplied: 'low' | 'medium' | 'high';
    explainMode: boolean;
    explain?: { scoring: { relBaseScore: Record<string, number>; confidenceWeights: Record<string, number> } };
    status: 'scaffold' | 'implemented';
  }> {
    if (!object) {
      throw new BadRequestException('object query param is required');
    }

    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(object.trim())) {
      throw new BadRequestException('object must be a valid Salesforce object name');
    }

    let limit: number | undefined;
    if (limitRaw !== undefined) {
      limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException('limit must be an integer between 1 and 100');
      }
    }

    const strict = strictRaw === 'true';
    const explain = explainRaw === 'true';
    const includeLowConfidence = includeLowConfidenceRaw === 'true';
    return this.analysisService.automation(
      object.trim(),
      limit,
      strict,
      explain,
      includeLowConfidence
    );
  }
}
