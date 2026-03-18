import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { GithubService } from './github.service';
import type {
  GithubPublishReviewPacketCommentRequest,
  GithubPublishReviewPacketCommentResponse
} from './github.types';

@Controller()
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

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
