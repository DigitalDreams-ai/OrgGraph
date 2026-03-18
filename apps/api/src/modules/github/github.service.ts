import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AppConfigService } from '../../config/app-config.service';
import { RuntimePathsService } from '../../config/runtime-paths.service';
import { AskProofStoreService } from '../ask/ask-proof-store.service';
import type { AskDecisionPacket, AskProofArtifact } from '../ask/ask.types';
import { GithubToolAdapterService } from './github-tool-adapter.service';
import type {
  GithubBranchSummary,
  GithubCreateRepoRequest,
  GithubCreateRepoResponse,
  GithubPublishReviewPacketCommentRequest,
  GithubPublishReviewPacketCommentResponse,
  GithubPullRequestSummary,
  GithubRepoContextResponse,
  GithubRepoListResponse,
  GithubRepoSummary,
  GithubReviewPacketPayload,
  GithubSelectedRepoState,
  GithubSelectRepoRequest,
  GithubSelectRepoResponse,
  GithubSessionIssue,
  GithubSessionStatusResponse,
  GithubViewerSummary
} from './github.types';

interface GithubIssueComment {
  id: number;
  body?: string;
  html_url?: string;
}

interface GithubApiRepo {
  name?: string;
  full_name?: string;
  private?: boolean;
  visibility?: 'public' | 'private' | 'internal';
  html_url?: string;
  clone_url?: string;
  description?: string | null;
  default_branch?: string;
  owner?: {
    login?: string;
  };
}

interface GithubApiBranch {
  name?: string;
  protected?: boolean;
  commit?: {
    sha?: string;
    url?: string;
  };
}

interface GithubApiPullRequest {
  number?: number;
  title?: string;
  state?: string;
  html_url?: string;
  user?: {
    login?: string;
  };
  draft?: boolean;
  head?: {
    ref?: string;
  };
  base?: {
    ref?: string;
  };
  created_at?: string;
  updated_at?: string;
}

interface GithubViewerApiPayload {
  login?: string;
  name?: string | null;
  html_url?: string;
}

type ResolvedGithubAuth = {
  token: string;
  authSource: 'env_token' | 'gh_cli';
  cliInstalled: boolean;
};

@Injectable()
export class GithubService {
  private static readonly HOSTNAME = 'github.com';

  constructor(
    private readonly config: AppConfigService,
    private readonly runtimePaths: RuntimePathsService,
    private readonly proofStore: AskProofStoreService,
    private readonly githubToolAdapter: GithubToolAdapterService
  ) {}

  async sessionStatus(): Promise<GithubSessionStatusResponse> {
    const cwd = this.runtimePaths.workspaceRoot();
    const cliProbe = await this.githubToolAdapter.probeGh(cwd);
    const cliInstalled = cliProbe.exitCode === 0;
    const issues: GithubSessionIssue[] = [];
    const selectedRepo = this.readSelectedRepoState();

    try {
      const auth = await this.resolveGithubAuth();
      const viewer = await this.loadViewer(auth.token);
      return {
        status: 'authenticated',
        hostname: GithubService.HOSTNAME,
        cliInstalled: auth.cliInstalled,
        authSource: auth.authSource,
        viewer,
        selectedRepo,
        issues
      };
    } catch {
      if (!cliInstalled && !this.config.githubToken()) {
        issues.push({
          code: 'GH_CLI_MISSING',
          severity: 'error',
          message: 'GitHub CLI is not available in the local runtime.',
          remediation: 'Install gh locally or configure GITHUB_TOKEN for explicit API access.'
        });
      } else {
        issues.push({
          code: 'GITHUB_NOT_AUTHENTICATED',
          severity: 'warning',
          message: 'No authenticated GitHub session is available for Orgumented.',
          remediation: 'Use Authorize GitHub to sign in with gh, or configure GITHUB_TOKEN explicitly.'
        });
      }

      return {
        status: 'unauthenticated',
        hostname: GithubService.HOSTNAME,
        cliInstalled,
        authSource: 'none',
        selectedRepo,
        issues
      };
    }
  }

  async loginSession(): Promise<GithubSessionStatusResponse> {
    if (this.config.githubToken()) {
      return this.sessionStatus();
    }

    const cwd = this.runtimePaths.workspaceRoot();
    const cliProbe = await this.githubToolAdapter.probeGh(cwd);
    if (cliProbe.exitCode !== 0) {
      throw new ServiceUnavailableException('GitHub CLI is not available in the local runtime');
    }

    const login = await this.githubToolAdapter.authLogin(cwd, GithubService.HOSTNAME);
    if (login.exitCode !== 0) {
      throw new BadGatewayException(login.stderr || login.stdout || 'GitHub login failed');
    }

    return this.sessionStatus();
  }

  async listRepos(limitRaw?: number): Promise<GithubRepoListResponse> {
    const limit = this.normalizeRepoLimit(limitRaw);
    const auth = await this.resolveGithubAuth();
    const viewer = await this.loadViewer(auth.token);
    const response = await this.githubRequest(
      auth.token,
      `/user/repos?sort=updated&per_page=${limit}&affiliation=owner,collaborator,organization_member`,
      { method: 'GET' }
    );
    const repos = ((await response.json()) as GithubApiRepo[])
      .map((repo) => this.mapRepo(repo, this.readSelectedRepoState()))
      .filter((repo): repo is GithubRepoSummary => repo !== undefined)
      .sort((left, right) => left.fullName.localeCompare(right.fullName));

    return {
      status: 'loaded',
      hostname: GithubService.HOSTNAME,
      viewer,
      selectedRepo: this.readSelectedRepoState(),
      repos
    };
  }

  async repoContext(
    ownerRaw?: string,
    repoRaw?: string,
    branchLimitRaw?: number,
    pullLimitRaw?: number
  ): Promise<GithubRepoContextResponse> {
    const branchLimit = this.normalizeContextLimit(branchLimitRaw);
    const pullLimit = this.normalizeContextLimit(pullLimitRaw);
    const auth = await this.resolveGithubAuth();
    const viewer = await this.loadViewer(auth.token);
    const targetRepo = this.resolveTargetRepo(ownerRaw, repoRaw);
    if (!targetRepo) {
      throw new BadRequestException('owner and repo are required or a selected GitHub repo must be bound first');
    }

    const [repoResponse, branchesResponse, pullsResponse] = await Promise.all([
      this.githubRequest(auth.token, `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}`, {
        method: 'GET'
      }),
      this.githubRequest(
        auth.token,
        `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}/branches?per_page=${branchLimit}`,
        {
          method: 'GET'
        }
      ),
      this.githubRequest(
        auth.token,
        `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}/pulls?state=open&per_page=${pullLimit}`,
        {
          method: 'GET'
        }
      )
    ]);

    const repo = this.mapRepo((await repoResponse.json()) as GithubApiRepo);
    if (!repo) {
      throw new BadGatewayException('GitHub repo context response was missing repository details');
    }

    const branches = ((await branchesResponse.json()) as GithubApiBranch[])
      .map((branch) => this.mapBranch(branch))
      .filter((branch): branch is GithubBranchSummary => branch !== undefined);
    const pullRequests = ((await pullsResponse.json()) as GithubApiPullRequest[])
      .map((pullRequest) => this.mapPullRequest(pullRequest))
      .filter((pullRequest): pullRequest is GithubPullRequestSummary => pullRequest !== undefined);

    return {
      status: 'loaded',
      hostname: GithubService.HOSTNAME,
      viewer,
      selectedRepo: this.readSelectedRepoState(),
      repo,
      branches,
      pullRequests
    };
  }

  async createRepo(request: GithubCreateRepoRequest): Promise<GithubCreateRepoResponse> {
    const name = request.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }
    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
      throw new BadRequestException('name may contain only letters, numbers, dot, underscore, and dash');
    }

    const auth = await this.resolveGithubAuth();
    const viewer = await this.loadViewer(auth.token);
    const owner = request.owner?.trim() || viewer.login;
    const description = request.description?.trim() || undefined;
    const visibility = request.visibility === 'public' ? 'public' : 'private';
    const body = {
      name,
      description,
      private: visibility !== 'public'
    };

    const relativePath =
      owner.toLowerCase() === viewer.login.toLowerCase() ? '/user/repos' : `/orgs/${encodeURIComponent(owner)}/repos`;
    const response = await this.githubRequest(auth.token, relativePath, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const repo = this.mapRepo((await response.json()) as GithubApiRepo);
    if (!repo) {
      throw new BadGatewayException('GitHub create repo response was missing repository details');
    }

    const selectedRepo = this.persistSelectedRepo(repo);
    return {
      status: 'created',
      repo: {
        ...repo,
        selected: true
      },
      selectedRepo
    };
  }

  async selectRepo(request: GithubSelectRepoRequest): Promise<GithubSelectRepoResponse> {
    const owner = request.owner?.trim();
    const repo = request.repo?.trim();
    if (!owner || !repo) {
      throw new BadRequestException('owner and repo are required');
    }

    const auth = await this.resolveGithubAuth();
    const response = await this.githubRequest(auth.token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      method: 'GET'
    });
    const mappedRepo = this.mapRepo((await response.json()) as GithubApiRepo);
    if (!mappedRepo) {
      throw new BadGatewayException('GitHub repo lookup response was missing repository details');
    }

    return {
      status: 'selected',
      repo: this.persistSelectedRepo(mappedRepo)
    };
  }

  async publishReviewPacketComment(
    request: GithubPublishReviewPacketCommentRequest
  ): Promise<GithubPublishReviewPacketCommentResponse> {
    const auth = await this.resolveGithubAuth();

    if (!Number.isInteger(request.pullNumber) || request.pullNumber < 1) {
      throw new BadRequestException('pullNumber must be a positive integer');
    }

    if (typeof request.proofId !== 'string' || request.proofId.trim().length === 0) {
      throw new BadRequestException('proofId is required');
    }

    const targetRepo = this.resolveTargetRepo(request.owner, request.repo);
    if (!targetRepo) {
      throw new BadRequestException('owner and repo are required or a selected GitHub repo must be bound first');
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
    const existing = await this.findExistingComment(
      auth.token,
      targetRepo.owner,
      targetRepo.repo,
      request.pullNumber,
      marker
    );

    if (existing) {
      const updated = await this.patchComment(auth.token, targetRepo.owner, targetRepo.repo, existing.id, body);
      return {
        status: 'published',
        owner: targetRepo.owner,
        repo: targetRepo.repo,
        pullNumber: request.pullNumber,
        proofId: proof.proofId,
        replayToken: proof.replayToken,
        publicationMode: 'updated',
        commentId: updated.id,
        commentUrl: updated.html_url
      };
    }

    const created = await this.createComment(auth.token, targetRepo.owner, targetRepo.repo, request.pullNumber, body);
    return {
      status: 'published',
      owner: targetRepo.owner,
      repo: targetRepo.repo,
      pullNumber: request.pullNumber,
      proofId: proof.proofId,
      replayToken: proof.replayToken,
      publicationMode: 'created',
      commentId: created.id,
      commentUrl: created.html_url
    };
  }

  private normalizeRepoLimit(limitRaw?: number): number {
    if (limitRaw === undefined) {
      return 100;
    }
    if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 100) {
      throw new BadRequestException('limit must be an integer between 1 and 100');
    }
    return limitRaw;
  }

  private normalizeContextLimit(limitRaw?: number): number {
    if (limitRaw === undefined) {
      return 10;
    }
    if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 25) {
      throw new BadRequestException('context limits must be integers between 1 and 25');
    }
    return limitRaw;
  }

  private async resolveGithubAuth(): Promise<ResolvedGithubAuth> {
    const envToken = this.config.githubToken();
    if (envToken) {
      return {
        token: envToken,
        authSource: 'env_token',
        cliInstalled: (await this.githubToolAdapter.probeGh(this.runtimePaths.workspaceRoot())).exitCode === 0
      };
    }

    const cwd = this.runtimePaths.workspaceRoot();
    const cliProbe = await this.githubToolAdapter.probeGh(cwd);
    if (cliProbe.exitCode !== 0) {
      throw new ServiceUnavailableException('GitHub CLI is not available in the local runtime');
    }

    const tokenResult = await this.githubToolAdapter.authToken(cwd, GithubService.HOSTNAME);
    const token = tokenResult.stdout.trim();
    if (tokenResult.exitCode !== 0 || token.length === 0) {
      throw new ServiceUnavailableException('GitHub is not authenticated locally');
    }

    return {
      token,
      authSource: 'gh_cli',
      cliInstalled: true
    };
  }

  private async loadViewer(token: string): Promise<GithubViewerSummary> {
    const response = await this.githubRequest(token, '/user', { method: 'GET' });
    const viewer = (await response.json()) as GithubViewerApiPayload;
    if (!viewer.login || typeof viewer.login !== 'string') {
      throw new BadGatewayException('GitHub viewer response did not include a login');
    }
    return {
      login: viewer.login.trim(),
      name: typeof viewer.name === 'string' ? viewer.name.trim() || undefined : undefined,
      url: typeof viewer.html_url === 'string' ? viewer.html_url.trim() || undefined : undefined
    };
  }

  private mapRepo(repo: GithubApiRepo, selectedRepo = this.readSelectedRepoState()): GithubRepoSummary | undefined {
    const owner = typeof repo.owner?.login === 'string' ? repo.owner.login.trim() : '';
    const name = typeof repo.name === 'string' ? repo.name.trim() : '';
    const fullName =
      typeof repo.full_name === 'string' && repo.full_name.trim().length > 0 ? repo.full_name.trim() : owner && name ? `${owner}/${name}` : '';
    if (!owner || !name || !fullName) {
      return undefined;
    }

    const visibility =
      repo.visibility === 'private' || repo.visibility === 'internal' || repo.visibility === 'public'
        ? repo.visibility
        : repo.private
          ? 'private'
          : 'public';

    return {
      owner,
      name,
      fullName,
      description: typeof repo.description === 'string' ? repo.description.trim() || undefined : undefined,
      visibility,
      private: Boolean(repo.private),
      url: typeof repo.html_url === 'string' ? repo.html_url.trim() || undefined : undefined,
      cloneUrl: typeof repo.clone_url === 'string' ? repo.clone_url.trim() || undefined : undefined,
      defaultBranch: typeof repo.default_branch === 'string' ? repo.default_branch.trim() || undefined : undefined,
      selected: Boolean(
        selectedRepo &&
          selectedRepo.owner.toLowerCase() === owner.toLowerCase() &&
          selectedRepo.repo.toLowerCase() === name.toLowerCase()
      )
    };
  }

  private mapBranch(branch: GithubApiBranch): GithubBranchSummary | undefined {
    const name = typeof branch.name === 'string' ? branch.name.trim() : '';
    if (!name) {
      return undefined;
    }

    return {
      name,
      protected: Boolean(branch.protected),
      url: typeof branch.commit?.url === 'string' ? branch.commit.url.trim() || undefined : undefined,
      lastCommitSha: typeof branch.commit?.sha === 'string' ? branch.commit.sha.trim() || undefined : undefined,
      lastCommitUrl: typeof branch.commit?.url === 'string' ? branch.commit.url.trim() || undefined : undefined
    };
  }

  private mapPullRequest(pullRequest: GithubApiPullRequest): GithubPullRequestSummary | undefined {
    const number = pullRequest.number;
    if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) {
      return undefined;
    }
    const title = typeof pullRequest.title === 'string' ? pullRequest.title.trim() : '';
    if (!title || pullRequest.state !== 'open') {
      return undefined;
    }

    return {
      number,
      title,
      state: 'open',
      url: typeof pullRequest.html_url === 'string' ? pullRequest.html_url.trim() || undefined : undefined,
      author: typeof pullRequest.user?.login === 'string' ? pullRequest.user.login.trim() || undefined : undefined,
      draft: Boolean(pullRequest.draft),
      headRef: typeof pullRequest.head?.ref === 'string' ? pullRequest.head.ref.trim() || undefined : undefined,
      baseRef: typeof pullRequest.base?.ref === 'string' ? pullRequest.base.ref.trim() || undefined : undefined,
      createdAt: typeof pullRequest.created_at === 'string' ? pullRequest.created_at.trim() || undefined : undefined,
      updatedAt: typeof pullRequest.updated_at === 'string' ? pullRequest.updated_at.trim() || undefined : undefined
    };
  }

  private resolveTargetRepo(
    ownerRaw?: string,
    repoRaw?: string
  ): { owner: string; repo: string } | undefined {
    const owner = ownerRaw?.trim();
    const repo = repoRaw?.trim();
    if (owner && repo) {
      return { owner, repo };
    }

    const selectedRepo = this.readSelectedRepoState();
    if (selectedRepo) {
      return {
        owner: selectedRepo.owner,
        repo: selectedRepo.repo
      };
    }

    const defaultOwner = this.config.githubRepoOwner();
    const defaultRepo = this.config.githubRepoName();
    if (defaultOwner && defaultRepo) {
      return {
        owner: defaultOwner,
        repo: defaultRepo
      };
    }

    return undefined;
  }

  private persistSelectedRepo(repo: GithubRepoSummary): GithubSelectedRepoState {
    const state: GithubSelectedRepoState = {
      owner: repo.owner,
      repo: repo.name,
      fullName: repo.fullName,
      visibility: repo.visibility,
      private: repo.private,
      url: repo.url,
      cloneUrl: repo.cloneUrl,
      defaultBranch: repo.defaultBranch,
      selectedAt: new Date().toISOString()
    };

    const targetPath = this.runtimePaths.githubSelectedRepoPath();
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, JSON.stringify(state, null, 2), 'utf8');
    return state;
  }

  private readSelectedRepoState(): GithubSelectedRepoState | undefined {
    const targetPath = this.runtimePaths.githubSelectedRepoPath();
    try {
      const parsed = JSON.parse(readFileSync(targetPath, 'utf8')) as Partial<GithubSelectedRepoState>;
      if (
        typeof parsed.owner === 'string' &&
        parsed.owner.trim().length > 0 &&
        typeof parsed.repo === 'string' &&
        parsed.repo.trim().length > 0 &&
        typeof parsed.fullName === 'string' &&
        parsed.fullName.trim().length > 0 &&
        (parsed.visibility === 'public' || parsed.visibility === 'private' || parsed.visibility === 'internal') &&
        typeof parsed.private === 'boolean' &&
        typeof parsed.selectedAt === 'string' &&
        parsed.selectedAt.trim().length > 0
      ) {
        return {
          owner: parsed.owner.trim(),
          repo: parsed.repo.trim(),
          fullName: parsed.fullName.trim(),
          visibility: parsed.visibility,
          private: parsed.private,
          url: typeof parsed.url === 'string' ? parsed.url.trim() || undefined : undefined,
          cloneUrl: typeof parsed.cloneUrl === 'string' ? parsed.cloneUrl.trim() || undefined : undefined,
          defaultBranch: typeof parsed.defaultBranch === 'string' ? parsed.defaultBranch.trim() || undefined : undefined,
          selectedAt: parsed.selectedAt
        };
      }
    } catch {
      return undefined;
    }

    return undefined;
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
