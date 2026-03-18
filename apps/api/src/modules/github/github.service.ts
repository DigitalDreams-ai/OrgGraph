import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { AskProofStoreService } from '../ask/ask-proof-store.service';
import type { AskDecisionPacket, AskProofArtifact } from '../ask/ask.types';
import type {
  GithubPublishReviewPacketCommentRequest,
  GithubPublishReviewPacketCommentResponse,
  GithubReviewPacketPayload
} from './github.types';

interface GithubIssueComment {
  id: number;
  body?: string;
  html_url?: string;
}

@Injectable()
export class GithubService {
  constructor(
    private readonly config: AppConfigService,
    private readonly proofStore: AskProofStoreService
  ) {}

  async publishReviewPacketComment(
    request: GithubPublishReviewPacketCommentRequest
  ): Promise<GithubPublishReviewPacketCommentResponse> {
    if (!this.config.githubIntegrationEnabled()) {
      throw new ServiceUnavailableException('GitHub integration is disabled');
    }

    const token = this.config.githubToken();
    if (!token) {
      throw new ServiceUnavailableException('GitHub token is not configured');
    }

    const owner = request.owner?.trim() || this.config.githubRepoOwner();
    const repo = request.repo?.trim() || this.config.githubRepoName();
    if (!owner || !repo) {
      throw new BadRequestException('owner and repo are required');
    }

    if (!Number.isInteger(request.pullNumber) || request.pullNumber < 1) {
      throw new BadRequestException('pullNumber must be a positive integer');
    }

    if (typeof request.proofId !== 'string' || request.proofId.trim().length === 0) {
      throw new BadRequestException('proofId is required');
    }

    const proof = this.proofStore.findByProofId(request.proofId.trim());
    if (!proof) {
      throw new NotFoundException(`proof not found: ${request.proofId}`);
    }

    if (request.replayToken && request.replayToken.trim() !== proof.replayToken) {
      throw new BadRequestException('replayToken does not match the stored proof');
    }

    const payload = this.parseReviewPacketPayload(proof);
    if (!payload.decisionPacket) {
      throw new BadRequestException('proof does not contain a decision packet');
    }

    const marker = this.buildCommentMarker(proof.proofId);
    const body = this.buildReviewPacketComment(marker, proof, payload);
    const existing = await this.findExistingComment(token, owner, repo, request.pullNumber, marker);

    if (existing) {
      const updated = await this.patchComment(token, owner, repo, existing.id, body);
      return {
        status: 'published',
        owner,
        repo,
        pullNumber: request.pullNumber,
        proofId: proof.proofId,
        replayToken: proof.replayToken,
        publicationMode: 'updated',
        commentId: updated.id,
        commentUrl: updated.html_url
      };
    }

    const created = await this.createComment(token, owner, repo, request.pullNumber, body);
    return {
      status: 'published',
      owner,
      repo,
      pullNumber: request.pullNumber,
      proofId: proof.proofId,
      replayToken: proof.replayToken,
      publicationMode: 'created',
      commentId: created.id,
      commentUrl: created.html_url
    };
  }

  private parseReviewPacketPayload(proof: AskProofArtifact): GithubReviewPacketPayload {
    let parsed: unknown;
    try {
      parsed = JSON.parse(proof.responseSummary.corePayloadJson);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid corePayloadJson';
      throw new BadRequestException(`stored proof payload is invalid: ${message}`);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('stored proof payload is invalid');
    }

    const payload = parsed as GithubReviewPacketPayload;
    if (typeof payload.deterministicAnswer !== 'string' || payload.deterministicAnswer.trim().length === 0) {
      throw new BadRequestException('stored proof payload is missing deterministicAnswer');
    }
    if (
      payload.trustLevel !== 'trusted' &&
      payload.trustLevel !== 'conditional' &&
      payload.trustLevel !== 'refused'
    ) {
      throw new BadRequestException('stored proof payload is missing trustLevel');
    }

    return payload;
  }

  private buildCommentMarker(proofId: string): string {
    return `<!-- orgumented:review-packet:${proofId} -->`;
  }

  private buildReviewPacketComment(
    marker: string,
    proof: AskProofArtifact,
    payload: GithubReviewPacketPayload
  ): string {
    const decisionPacket = payload.decisionPacket as AskDecisionPacket;
    const evidenceGaps = decisionPacket.evidenceGaps.length
      ? decisionPacket.evidenceGaps.map((gap) => `- ${gap}`).join('\n')
      : '- none';
    const nextActions = decisionPacket.nextActions.length
      ? decisionPacket.nextActions
          .slice(0, 4)
          .map((action) => `- **${action.label}**: ${action.rationale}`)
          .join('\n')
      : '- none';
    const topRiskDrivers = decisionPacket.topRiskDrivers.length
      ? decisionPacket.topRiskDrivers.map((driver) => `- ${driver}`).join('\n')
      : '- none';
    const citationSources = (decisionPacket.topCitationSources ?? []).length
      ? (decisionPacket.topCitationSources ?? []).slice(0, 5).map((source) => `- ${source}`).join('\n')
      : '- none';

    return [
      marker,
      '## Orgumented Decision Packet',
      '',
      `Query: \`${proof.request.query}\``,
      `Target: \`${decisionPacket.targetLabel}\``,
      `Trust: \`${payload.trustLevel}\``,
      `Recommendation: \`${decisionPacket.recommendation.verdict}\``,
      `Risk: \`${decisionPacket.riskLevel}\` (${decisionPacket.riskScore})`,
      `Evidence gaps: \`${decisionPacket.evidenceGaps.length}\``,
      '',
      `Summary: ${decisionPacket.recommendation.summary}`,
      '',
      '### Top Risk Drivers',
      topRiskDrivers,
      '',
      '### Evidence Gaps',
      evidenceGaps,
      '',
      '### Next Actions',
      nextActions,
      '',
      '### Citation Sources',
      citationSources,
      '',
      '### Proof Binding',
      `- proofId: \`${proof.proofId}\``,
      `- replayToken: \`${proof.replayToken}\``,
      `- snapshotId: \`${proof.snapshotId}\``,
      `- policyId: \`${proof.policyId}\``,
      '',
      '> Generated by Orgumented from the local deterministic proof artifact. Semantic truth remains local; this PR comment is a published projection.'
    ].join('\n');
  }

  private async findExistingComment(
    token: string,
    owner: string,
    repo: string,
    pullNumber: number,
    marker: string
  ): Promise<GithubIssueComment | undefined> {
    const response = await this.githubRequest(
      token,
      `/repos/${owner}/${repo}/issues/${pullNumber}/comments?per_page=100`,
      {
        method: 'GET'
      }
    );
    const comments = (await response.json()) as GithubIssueComment[];
    return comments.find((comment) => typeof comment.body === 'string' && comment.body.includes(marker));
  }

  private async createComment(
    token: string,
    owner: string,
    repo: string,
    pullNumber: number,
    body: string
  ): Promise<GithubIssueComment> {
    const response = await this.githubRequest(token, `/repos/${owner}/${repo}/issues/${pullNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    return (await response.json()) as GithubIssueComment;
  }

  private async patchComment(
    token: string,
    owner: string,
    repo: string,
    commentId: number,
    body: string
  ): Promise<GithubIssueComment> {
    const response = await this.githubRequest(token, `/repos/${owner}/${repo}/issues/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ body })
    });
    return (await response.json()) as GithubIssueComment;
  }

  private async githubRequest(token: string, relativePath: string, init: RequestInit): Promise<Response> {
    const apiUrl = this.config.githubApiUrl().replace(/\/+$/, '');
    const response = await fetch(`${apiUrl}${relativePath}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Orgumented',
        ...(init.headers ?? {})
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(
        `GitHub API request failed (${response.status} ${response.statusText}): ${body || 'no response body'}`
      );
    }

    return response;
  }
}
