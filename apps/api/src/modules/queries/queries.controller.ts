import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { QueriesService } from './queries.service';

@Controller()
export class QueriesController {
  constructor(private readonly queriesService: QueriesService) {}

  @Get('/perms')
  async perms(
    @Query('user') user?: string,
    @Query('object') object?: string,
    @Query('field') field?: string,
    @Query('limit') limitRaw?: string
  ): Promise<{
    user: string;
    object: string;
    field?: string;
    principalsChecked: string[];
    paths: Array<{ principal: string; object: string; path: Array<{ from: string; rel: string; to: string }> }>;
    granted: boolean;
    objectGranted: boolean;
    fieldGranted?: boolean;
    totalPaths: number;
    truncated: boolean;
    explanation: string;
    mappingStatus: 'resolved' | 'unmapped_user' | 'map_missing';
    warnings: string[];
  }> {
    if (!user || !object) {
      throw new BadRequestException('user and object query params are required');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.trim())) {
      throw new BadRequestException('user must be a valid email address');
    }

    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(object.trim())) {
      throw new BadRequestException('object must be a valid Salesforce object name');
    }

    if (field !== undefined && field.trim().length > 0 && !/^[A-Za-z][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(field.trim())) {
      throw new BadRequestException('field must match Object.Field format');
    }

    let limit: number | undefined;
    if (limitRaw !== undefined) {
      limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException('limit must be an integer between 1 and 100');
      }
    }

    return this.queriesService.perms(user.trim(), object.trim(), field?.trim(), limit);
  }

  @Get('/perms/system')
  async systemPermission(
    @Query('user') user?: string,
    @Query('permission') permission?: string,
    @Query('limit') limitRaw?: string
  ): Promise<{
    user: string;
    permission: string;
    principalsChecked: string[];
    paths: Array<{ principal: string; permission: string; path: Array<{ from: string; rel: string; to: string }> }>;
    granted: boolean;
    totalPaths: number;
    truncated: boolean;
    explanation: string;
    mappingStatus: 'resolved' | 'unmapped_user' | 'map_missing';
    warnings: string[];
  }> {
    if (!user || !permission) {
      throw new BadRequestException('user and permission query params are required');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.trim())) {
      throw new BadRequestException('user must be a valid email address');
    }

    if (!/^[A-Za-z][A-Za-z0-9_]+$/.test(permission.trim())) {
      throw new BadRequestException('permission must be a valid Salesforce system permission name');
    }

    let limit: number | undefined;
    if (limitRaw !== undefined) {
      limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException('limit must be an integer between 1 and 100');
      }
    }

    return this.queriesService.systemPermission(user.trim(), permission.trim(), limit);
  }
}
