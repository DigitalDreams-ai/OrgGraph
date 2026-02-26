import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { OrgService } from './org.service';
import type { OrgRetrieveRequest, OrgRetrieveResponse } from './org.types';

interface OrgRetrieveBody {
  runAuth?: unknown;
  runRetrieve?: unknown;
  autoRefresh?: unknown;
}

@Controller()
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

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

  private ensureBoolean(name: string, value: unknown): void {
    if (value === undefined) {
      return;
    }
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${name} must be a boolean`);
    }
  }
}

