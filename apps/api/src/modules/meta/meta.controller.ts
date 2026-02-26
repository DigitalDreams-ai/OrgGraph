import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { MetaContextService } from './meta-context.service';
import type { MetaAdaptResponse, MetaContextState } from './meta.types';

@Controller()
export class MetaController {
  constructor(private readonly metaContextService: MetaContextService) {}

  @Get('/meta/context')
  getContext(): { status: 'implemented'; context: MetaContextState } {
    return {
      status: 'implemented',
      context: this.metaContextService.getContext()
    };
  }

  @Post('/meta/adapt')
  adapt(@Body() body?: { dryRun?: boolean }): MetaAdaptResponse {
    if (
      body !== undefined &&
      body !== null &&
      (typeof body !== 'object' || Array.isArray(body))
    ) {
      throw new BadRequestException('body must be an object');
    }
    if (body?.dryRun !== undefined && typeof body.dryRun !== 'boolean') {
      throw new BadRequestException('dryRun must be a boolean');
    }
    return this.metaContextService.adapt(body?.dryRun ?? false);
  }
}
