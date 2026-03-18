import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GithubService } from './github.service';
import type {
  GithubCreateRepoRequest,
  GithubCreateRepoResponse,
  GithubPublishReviewPacketCommentRequest,
  GithubPublishReviewPacketCommentResponse,
  GithubRepoListResponse,
  GithubSelectRepoRequest,
  GithubSelectRepoResponse,
  GithubSessionStatusResponse
} from './github.types';

@Controller()
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('/github/session/status')
  async sessionStatus(): Promise<GithubSessionStatusResponse> {
    return this.githubService.sessionStatus();
  }

  @Post('/github/session/login')
  async sessionLogin(): Promise<GithubSessionStatusResponse> {
    return this.githubService.loginSession();
  }

  @Get('/github/repos')
  async listRepos(@Query('limit') limitRaw?: string): Promise<GithubRepoListResponse> {
    const limit = limitRaw === undefined ? undefined : Number(limitRaw);
    if (limitRaw !== undefined && (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100)) {
      throw new BadRequestException('limit must be an integer between 1 and 100');
    }
    return this.githubService.listRepos(limit);
  }

  @Post('/github/repos')
  async createRepo(@Body() body: Partial<GithubCreateRepoRequest> = {}): Promise<GithubCreateRepoResponse> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('body is required');
    }
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      throw new BadRequestException('name is required');
    }
    if (body.owner !== undefined && (typeof body.owner !== 'string' || body.owner.trim().length === 0)) {
      throw new BadRequestException('owner must be a non-empty string when provided');
    }
    if (body.description !== undefined && typeof body.description !== 'string') {
      throw new BadRequestException('description must be a string when provided');
    }
    if (body.visibility !== undefined && body.visibility !== 'private' && body.visibility !== 'public') {
      throw new BadRequestException("visibility must be 'private' or 'public'");
    }

    return this.githubService.createRepo({
      owner: body.owner?.trim(),
      name: body.name.trim(),
      description: body.description?.trim(),
      visibility: body.visibility
    });
  }

  @Post('/github/session/select-repo')
  async selectRepo(@Body() body: Partial<GithubSelectRepoRequest> = {}): Promise<GithubSelectRepoResponse> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('body is required');
    }
    if (typeof body.owner !== 'string' || body.owner.trim().length === 0) {
      throw new BadRequestException('owner is required');
    }
    if (typeof body.repo !== 'string' || body.repo.trim().length === 0) {
      throw new BadRequestException('repo is required');
    }

    return this.githubService.selectRepo({
      owner: body.owner.trim(),
      repo: body.repo.trim()
    });
  }

  @Post('/github/pr/comment-review-packet')
  async publishReviewPacketComment(
    @Body() body: GithubPublishReviewPacketCommentRequest
  ): Promise<GithubPublishReviewPacketCommentResponse> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('body is required');
    }
    if (!Number.isInteger(body.pullNumber) || body.pullNumber < 1) {
      throw new BadRequestException('pullNumber must be a positive integer');
    }
    if (typeof body.proofId !== 'string' || body.proofId.trim().length === 0) {
      throw new BadRequestException('proofId is required');
    }
    if (body.replayToken !== undefined && typeof body.replayToken !== 'string') {
      throw new BadRequestException('replayToken must be a string');
    }
    if (body.owner !== undefined && (typeof body.owner !== 'string' || body.owner.trim().length === 0)) {
      throw new BadRequestException('owner must be a non-empty string');
    }
    if (body.repo !== undefined && (typeof body.repo !== 'string' || body.repo.trim().length === 0)) {
      throw new BadRequestException('repo must be a non-empty string');
    }

    return this.githubService.publishReviewPacketComment({
      pullNumber: body.pullNumber,
      proofId: body.proofId.trim(),
      replayToken: body.replayToken?.trim(),
      owner: body.owner?.trim(),
      repo: body.repo?.trim()
    });
  }
}
