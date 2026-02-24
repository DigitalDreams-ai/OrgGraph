import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { QueriesService } from './queries.service';

@Controller()
export class QueriesController {
  constructor(private readonly queriesService: QueriesService) {}

  @Get('/perms')
  perms(
    @Query('user') user?: string,
    @Query('object') object?: string,
    @Query('field') field?: string
  ): {
    user: string;
    object: string;
    field?: string;
    principalsChecked: string[];
    paths: Array<{ principal: string; object: string; path: Array<{ from: string; rel: string; to: string }> }>;
    granted: boolean;
    objectGranted: boolean;
    fieldGranted?: boolean;
    explanation: string;
  } {
    if (!user || !object) {
      throw new BadRequestException('user and object query params are required');
    }

    return this.queriesService.perms(user, object, field);
  }
}
