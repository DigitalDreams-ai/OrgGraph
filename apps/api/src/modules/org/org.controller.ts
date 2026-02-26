import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { OrgService } from './org.service';
import type {
  OrgMetadataCatalogResponse,
  OrgMetadataMembersResponse,
  OrgMetadataRetrieveRequest,
  OrgMetadataRetrieveResponse,
  OrgRetrieveRequest,
  OrgRetrieveResponse,
  OrgStatusResponse
} from './org.types';

interface OrgRetrieveBody {
  runAuth?: unknown;
  runRetrieve?: unknown;
  autoRefresh?: unknown;
}

interface OrgMetadataRetrieveBody {
  selections?: unknown;
  autoRefresh?: unknown;
}

@Controller()
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('/org/status')
  async status(): Promise<OrgStatusResponse> {
    return this.orgService.status();
  }

  @Post('/org/retrieve')
  async retrieve(@Body() body: OrgRetrieveBody = {}): Promise<OrgRetrieveResponse> {
    this.ensureBoolean('runAuth', body.runAuth);
    this.ensureBoolean('runRetrieve', body.runRetrieve);
    this.ensureBoolean('autoRefresh', body.autoRefresh);

    const request: OrgRetrieveRequest = {
      runAuth: body.runAuth as boolean | undefined,
      runRetrieve: body.runRetrieve as boolean | undefined,
      autoRefresh: body.autoRefresh as boolean | undefined
    };
    return this.orgService.retrieveAndRefresh(request);
  }

  @Get('/org/metadata/catalog')
  async metadataCatalog(
    @Query('q') q?: string,
    @Query('limit') limitRaw?: string,
    @Query('refresh') refreshRaw?: string
  ): Promise<OrgMetadataCatalogResponse> {
    const limit = limitRaw ? Number(limitRaw) : undefined;
    if (limitRaw && (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 5000)) {
      throw new BadRequestException('limit must be an integer between 1 and 5000');
    }
    if (
      refreshRaw !== undefined &&
      refreshRaw !== 'true' &&
      refreshRaw !== 'false' &&
      refreshRaw !== '1' &&
      refreshRaw !== '0'
    ) {
      throw new BadRequestException("refresh must be one of: true, false, 1, 0");
    }
    return this.orgService.metadataCatalog({
      search: q?.trim() || undefined,
      limit,
      refresh: refreshRaw === 'true' || refreshRaw === '1'
    });
  }

  @Get('/org/metadata/members')
  async metadataMembers(
    @Query('type') type?: string,
    @Query('q') q?: string,
    @Query('limit') limitRaw?: string,
    @Query('refresh') refreshRaw?: string
  ): Promise<OrgMetadataMembersResponse> {
    if (!type || type.trim().length === 0) {
      throw new BadRequestException('type is required');
    }
    const limit = limitRaw ? Number(limitRaw) : undefined;
    if (limitRaw && (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 5000)) {
      throw new BadRequestException('limit must be an integer between 1 and 5000');
    }
    if (
      refreshRaw !== undefined &&
      refreshRaw !== 'true' &&
      refreshRaw !== 'false' &&
      refreshRaw !== '1' &&
      refreshRaw !== '0'
    ) {
      throw new BadRequestException("refresh must be one of: true, false, 1, 0");
    }
    return this.orgService.metadataMembers({
      type: type.trim(),
      search: q?.trim() || undefined,
      limit,
      refresh: refreshRaw === 'true' || refreshRaw === '1'
    });
  }

  @Post('/org/metadata/retrieve')
  async metadataRetrieve(
    @Body() body: OrgMetadataRetrieveBody = {}
  ): Promise<OrgMetadataRetrieveResponse> {
    this.ensureBoolean('autoRefresh', body.autoRefresh);
    if (!Array.isArray(body.selections) || body.selections.length === 0) {
      throw new BadRequestException('selections must be a non-empty array');
    }
    const selections = body.selections.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException('each selection must be an object');
      }
      const type = (item as { type?: unknown }).type;
      const members = (item as { members?: unknown }).members;
      if (typeof type !== 'string' || type.trim().length === 0) {
        throw new BadRequestException('selection.type must be a non-empty string');
      }
      if (members !== undefined && (!Array.isArray(members) || members.some((m) => typeof m !== 'string'))) {
        throw new BadRequestException('selection.members must be an array of strings');
      }
      return {
        type: type.trim(),
        members: (members as string[] | undefined)?.map((m) => m.trim()).filter((m) => m.length > 0)
      };
    });

    const input: OrgMetadataRetrieveRequest = {
      selections,
      autoRefresh: body.autoRefresh as boolean | undefined
    };
    return this.orgService.retrieveSelectedMetadata(input);
  }

  private ensureBoolean(name: string, value: unknown): void {
    if (value === undefined) {
      return;
    }
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${name} must be a boolean`);
    }
  }
}
