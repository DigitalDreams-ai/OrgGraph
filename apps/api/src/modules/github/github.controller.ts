import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GithubService } from './github.service';
import type {
  GithubCreateRepoRequest,
  GithubCreateRepoResponse,
  GithubPublishReviewPacketCommentRequest,
  GithubPublishReviewPacketCommentResponse,
  GithubWorkflowCatalogResponse,
  GithubWorkflowDispatchRequest,
  GithubWorkflowDispatchResponse,
  GithubWorkflowRunsResponse,
  GithubPullRequestFileScopeResponse,
  GithubRepoContextResponse,
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

  @Get('/github/repo/context')
  async repoContext(
    @Query('owner') ownerRaw?: string,
    @Query('repo') repoRaw?: string,
    @Query('branchLimit') branchLimitRaw?: string,
    @Query('pullLimit') pullLimitRaw?: string
  ): Promise<GithubRepoContextResponse> {
    const branchLimit = branchLimitRaw === undefined ? undefined : Number(branchLimitRaw);
    const pullLimit = pullLimitRaw === undefined ? undefined : Number(pullLimitRaw);
    if (
      branchLimitRaw !== undefined &&
      (!Number.isInteger(branchLimit) || (branchLimit as number) < 1 || (branchLimit as number) > 25)
    ) {
      throw new BadRequestException('branchLimit must be an integer between 1 and 25');
    }
    if (
      pullLimitRaw !== undefined &&
      (!Number.isInteger(pullLimit) || (pullLimit as number) < 1 || (pullLimit as number) > 25)
    ) {
      throw new BadRequestException('pullLimit must be an integer between 1 and 25');
    }
    if (ownerRaw !== undefined && ownerRaw.trim().length === 0) {
      throw new BadRequestException('owner must be a non-empty string when provided');
    }
    if (repoRaw !== undefined && repoRaw.trim().length === 0) {
      throw new BadRequestException('repo must be a non-empty string when provided');
    }

    return this.githubService.repoContext(ownerRaw?.trim(), repoRaw?.trim(), branchLimit, pullLimit);
  }

  @Get('/github/pr/files')
  async pullRequestFiles(
    @Query('pullNumber') pullNumberRaw?: string,
    @Query('owner') ownerRaw?: string,
    @Query('repo') repoRaw?: string,
    @Query('limit') limitRaw?: string
  ): Promise<GithubPullRequestFileScopeResponse> {
    const parsedPullNumber = pullNumberRaw === undefined ? undefined : Number(pullNumberRaw);
    const limit = limitRaw === undefined ? undefined : Number(limitRaw);
    if (pullNumberRaw === undefined || !Number.isInteger(parsedPullNumber) || (parsedPullNumber as number) < 1) {
      throw new BadRequestException('pullNumber must be a positive integer');
    }
    if (limitRaw !== undefined && (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 300)) {
      throw new BadRequestException('limit must be an integer between 1 and 300');
    }
    if (ownerRaw !== undefined && ownerRaw.trim().length === 0) {
      throw new BadRequestException('owner must be a non-empty string when provided');
    }
    if (repoRaw !== undefined && repoRaw.trim().length === 0) {
      throw new BadRequestException('repo must be a non-empty string when provided');
    }

    return this.githubService.pullRequestFiles(ownerRaw?.trim(), repoRaw?.trim(), parsedPullNumber as number, limit);
  }

  @Get('/github/actions/workflows')
  async workflowCatalog(
    @Query('owner') ownerRaw?: string,
    @Query('repo') repoRaw?: string
  ): Promise<GithubWorkflowCatalogResponse> {
    if (ownerRaw !== undefined && ownerRaw.trim().length === 0) {
      throw new BadRequestException('owner must be a non-empty string when provided');
    }
    if (repoRaw !== undefined && repoRaw.trim().length === 0) {
      throw new BadRequestException('repo must be a non-empty string when provided');
    }

    return this.githubService.workflowCatalog(ownerRaw?.trim(), repoRaw?.trim());
  }

  @Get('/github/actions/runs')
  async workflowRuns(
    @Query('workflowKey') workflowKeyRaw?: string,
    @Query('owner') ownerRaw?: string,
    @Query('repo') repoRaw?: string,
    @Query('limit') limitRaw?: string
  ): Promise<GithubWorkflowRunsResponse> {
    const limit = limitRaw === undefined ? undefined : Number(limitRaw);
    if (typeof workflowKeyRaw !== 'string' || workflowKeyRaw.trim().length === 0) {
      throw new BadRequestException('workflowKey is required');
    }
    if (limitRaw !== undefined && (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 25)) {
      throw new BadRequestException('limit must be an integer between 1 and 25');
    }
    if (ownerRaw !== undefined && ownerRaw.trim().length === 0) {
      throw new BadRequestException('owner must be a non-empty string when provided');
    }
    if (repoRaw !== undefined && repoRaw.trim().length === 0) {
      throw new BadRequestException('repo must be a non-empty string when provided');
    }

    return this.githubService.workflowRuns(workflowKeyRaw.trim(), ownerRaw?.trim(), repoRaw?.trim(), limit);
  }

  @Post('/github/actions/dispatch')
  async dispatchWorkflow(
    @Body() body: Partial<GithubWorkflowDispatchRequest> = {}
  ): Promise<GithubWorkflowDispatchResponse> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('body is required');
    }
    if (typeof body.workflowKey !== 'string' || body.workflowKey.trim().length === 0) {
      throw new BadRequestException('workflowKey is required');
    }
    if (typeof body.ref !== 'string' || body.ref.trim().length === 0) {
      throw new BadRequestException('ref is required');
    }
    if (body.owner !== undefined && (typeof body.owner !== 'string' || body.owner.trim().length === 0)) {
      throw new BadRequestException('owner must be a non-empty string when provided');
    }
    if (body.repo !== undefined && (typeof body.repo !== 'string' || body.repo.trim().length === 0)) {
      throw new BadRequestException('repo must be a non-empty string when provided');
    }
    if (
      body.inputs !== undefined &&
      (!body.inputs ||
        typeof body.inputs !== 'object' ||
        Array.isArray(body.inputs) ||
        Object.values(body.inputs).some((value) => typeof value !== 'string'))
    ) {
      throw new BadRequestException('inputs must be an object with string values when provided');
    }

    return this.githubService.dispatchWorkflow({
      workflowKey: body.workflowKey.trim(),
      ref: body.ref.trim(),
      owner: body.owner?.trim(),
      repo: body.repo?.trim(),
      inputs: body.inputs as Record<string, string> | undefined
    });
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
