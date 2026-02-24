import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { QueriesService } from './queries.service';

@Controller()
export class QueriesController {
  constructor(private readonly queriesService: QueriesService) {}

  @Get('/perms')
  perms(
    @Query('user') user?: string,
    @Query('object') object?: string
  ): {
    user: string;
    object: string;
    principalsChecked: string[];
    paths: Array<{ principal: string; object: string; path: Array<{ from: string; rel: string; to: string }> }>;
    explanation: string;
  } {
    if (!user || !object) {
      throw new BadRequestException('user and object query params are required');
    }

    return this.queriesService.perms(user, object);
  }
}
