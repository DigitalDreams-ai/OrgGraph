import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AnalysisService } from './analysis.service';

@Controller()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('/impact')
  impact(
    @Query('field') field?: string
  ): {
    field: string;
    relationsChecked: string[];
    paths: Array<{ from: string; rel: string; to: string }>;
    explanation: string;
    status: 'scaffold';
  } {
    if (!field) {
      throw new BadRequestException('field query param is required');
    }

    return this.analysisService.impact(field);
  }

  @Get('/automation')
  automation(
    @Query('object') object?: string
  ): {
    object: string;
    relationsChecked: string[];
    automations: Array<{ type: string; name: string; rel: string }>;
    explanation: string;
    status: 'scaffold';
  } {
    if (!object) {
      throw new BadRequestException('object query param is required');
    }

    return this.analysisService.automation(object);
  }
}
