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
  GithubArtifactSummary,
  GithubBranchSummary,
  GithubCreateRepoRequest,
  GithubCreateRepoResponse,
  GithubPublishReviewPacketCommentRequest,
  GithubPublishReviewPacketCommentResponse,
  GithubWorkflowCatalogResponse,
  GithubWorkflowDispatchRequest,
  GithubWorkflowDispatchResponse,
  GithubWorkflowArtifactsResponse,
  GithubWorkflowArtifactRunSummary,
  GithubWorkflowInputDefinition,
  GithubProductRepoSummary,
  GithubWorkflowRunsResponse,
  GithubWorkflowRunSummary,
  GithubWorkflowSummary,
  GithubRepoBindingStatusResponse,
  GithubPullRequestFileScopeResponse,
  GithubPullRequestFileSummary,
  GithubPullRequestScopeSummary,
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
  changed_files?: number;
}

interface GithubApiPullRequestFile {
  filename?: string;
  status?: string;
  additions?: number;
  deletions?: number;
  changes?: number;
  previous_filename?: string;
  blob_url?: string;
  raw_url?: string;
  patch?: string;
}

interface GithubApiWorkflowRun {
  id?: number;
  run_number?: number;
  status?: string;
  conclusion?: string | null;
  event?: string;
  html_url?: string;
  head_branch?: string;
  head_sha?: string;
  display_title?: string;
  created_at?: string;
  updated_at?: string;
  actor?: {
    login?: string;
  };
}

interface GithubApiWorkflowRunsPayload {
  total_count?: number;
  workflow_runs?: GithubApiWorkflowRun[];
}

interface GithubApiArtifact {
  id?: number;
  name?: string;
  size_in_bytes?: number;
  archive_download_url?: string;
  url?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  expired?: boolean;
}

interface GithubApiArtifactsPayload {
  total_count?: number;
  artifacts?: GithubApiArtifact[];
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

type GithubAllowlistedWorkflow = {
  key: string;
  workflowFile: string;
  name: string;
  description: string;
  inputs: GithubWorkflowInputDefinition[];
};

const GITHUB_ACTIONS_WORKFLOW_ALLOWLIST: Record<string, GithubAllowlistedWorkflow> = {
  ci_validate: {
    key: 'ci_validate',
    workflowFile: 'ci.yml',
    name: 'CI Validate',
    description: 'Dispatch the repo CI validation workflow and read back recent workflow_dispatch runs.',
    inputs: []
  },
  runtime_nightly: {
    key: 'runtime_nightly',
    workflowFile: 'runtime-nightly.yml',
    name: 'Runtime Nightly',
    description: 'Dispatch the packaged desktop build-and-smoke workflow and read back recent workflow_dispatch runs.',
    inputs: []
  },
  scripts_lint: {
    key: 'scripts_lint',
    workflowFile: 'scripts-lint.yml',
    name: 'Scripts Lint',
    description: 'Dispatch the repo-local scripts lint workflow and read back recent workflow_dispatch runs.',
    inputs: []
  },
  workflow_lint: {
    key: 'workflow_lint',
    workflowFile: 'workflow-lint.yml',
    name: 'Workflow Lint',
    description: 'Dispatch the GitHub workflow lint checks and read back recent workflow_dispatch runs.',
    inputs: []
  }
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

  async repoBindingStatus(): Promise<GithubRepoBindingStatusResponse> {
    const selectedRepo = this.readSelectedRepoState();
    const productRepo = await this.resolveProductRepoIdentity();
    const issues: GithubSessionIssue[] = [];

    if (!selectedRepo) {
      issues.push({
        code: 'GITHUB_SELECTED_REPO_MISSING',
        severity: 'error',
        message: 'No explicit GitHub repo binding is selected for commit-capable metadata workflows.',
        remediation: 'Select or create a non-product GitHub repository in Connect before enabling metadata publication flows.'
      });
    }

    if (!productRepo) {
      issues.push({
        code: 'PRODUCT_REPO_IDENTITY_UNAVAILABLE',
        severity: 'error',
        message: 'Orgumented could not determine the product repository identity for fail-closed metadata publication.',
        remediation: 'Set GITHUB_REPO_OWNER and GITHUB_REPO_NAME or ensure the local origin remote points at the product repository.'
      });
    } else if (selectedRepo && this.repoMatches(selectedRepo, productRepo)) {
      issues.push({
        code: 'PRODUCT_REPO_SELECTED',
        severity: 'error',
        message: 'The selected GitHub repo is the Orgumented product repository, which is blocked for user metadata publication.',
        remediation: 'Bind a dedicated user-owned repository before enabling commit-capable metadata workflows.'
      });
    }

    return {
      status: issues.length === 0 ? 'ready' : 'blocked',
      hostname: GithubService.HOSTNAME,
      selectedRepo,
      productRepo,
      metadataCommitEligible: issues.length === 0,
      issues
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

  async pullRequestFiles(
    ownerRaw: string | undefined,
    repoRaw: string | undefined,
    pullNumber: number,
    limitRaw?: number
  ): Promise<GithubPullRequestFileScopeResponse> {
    const limit = this.normalizePullRequestFileLimit(limitRaw);
    const auth = await this.resolveGithubAuth();
    const viewer = await this.loadViewer(auth.token);
    const targetRepo = this.resolveTargetRepo(ownerRaw, repoRaw);
    if (!targetRepo) {
      throw new BadRequestException('owner and repo are required or a selected GitHub repo must be bound first');
    }

    const [repoResponse, pullResponse, filesResponse] = await Promise.all([
      this.githubRequest(auth.token, `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}`, {
        method: 'GET'
      }),
      this.githubRequest(
        auth.token,
        `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}/pulls/${pullNumber}`,
        {
          method: 'GET'
        }
      ),
      this.githubRequest(
        auth.token,
        `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}/pulls/${pullNumber}/files?per_page=${limit}`,
        {
          method: 'GET'
        }
      )
    ]);

    const repo = this.mapRepo((await repoResponse.json()) as GithubApiRepo);
    if (!repo) {
      throw new BadGatewayException('GitHub pull request file scope response was missing repository details');
    }

    const pullRequestPayload = (await pullResponse.json()) as GithubApiPullRequest;
    const pullRequest = this.mapPullRequestScope(pullRequestPayload);
    if (!pullRequest) {
      throw new BadGatewayException('GitHub pull request response was missing pull request details');
    }

    const files = ((await filesResponse.json()) as GithubApiPullRequestFile[])
      .map((file) => this.mapPullRequestFile(file))
      .filter((file): file is GithubPullRequestFileSummary => file !== undefined);
    const totalCount = pullRequest.changedFileCount ?? files.length;

    return {
      status: 'loaded',
      hostname: GithubService.HOSTNAME,
      viewer,
      selectedRepo: this.readSelectedRepoState(),
      repo,
      pullRequest,
      files,
      totalCount,
      truncated: totalCount > files.length
    };
  }

  async workflowCatalog(ownerRaw?: string, repoRaw?: string): Promise<GithubWorkflowCatalogResponse> {
    const auth = await this.resolveGithubAuth();
    const viewer = await this.loadViewer(auth.token);
    const targetRepo = this.resolveTargetRepo(ownerRaw, repoRaw);
    if (!targetRepo) {
      throw new BadRequestException('owner and repo are required or a selected GitHub repo must be bound first');
    }

    const repoResponse = await this.githubRequest(
      auth.token,
      `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}`,
      { method: 'GET' }
    );
    const repo = this.mapRepo((await repoResponse.json()) as GithubApiRepo);
    if (!repo) {
      throw new BadGatewayException('GitHub workflow catalog response was missing repository details');
    }

    return {
      status: 'loaded',
      hostname: GithubService.HOSTNAME,
      viewer,
      selectedRepo: this.readSelectedRepoState(),
      repo,
      workflows: this.listAllowlistedWorkflows()
    };
  }

  async workflowRuns(
    workflowKeyRaw: string,
    ownerRaw?: string,
    repoRaw?: string,
    limitRaw?: number
  ): Promise<GithubWorkflowRunsResponse> {
    const workflow = this.resolveAllowlistedWorkflow(workflowKeyRaw);
    const limit = this.normalizeWorkflowRunsLimit(limitRaw);
    const auth = await this.resolveGithubAuth();
    const viewer = await this.loadViewer(auth.token);
    const targetRepo = this.resolveTargetRepo(ownerRaw, repoRaw);
    if (!targetRepo) {
      throw new BadRequestException('owner and repo are required or a selected GitHub repo must be bound first');
    }

    const [repoResponse, runsResponse] = await Promise.all([
      this.githubRequest(auth.token, `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}`, {
        method: 'GET'
      }),
      this.githubRequest(
        auth.token,
        `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}/actions/workflows/${encodeURIComponent(workflow.workflowFile)}/runs?per_page=${limit}&event=workflow_dispatch`,
        { method: 'GET' }
      )
    ]);

    const repo = this.mapRepo((await repoResponse.json()) as GithubApiRepo);
    if (!repo) {
      throw new BadGatewayException('GitHub workflow runs response was missing repository details');
    }

    const runsPayload = (await runsResponse.json()) as GithubApiWorkflowRunsPayload;
    const runs = (runsPayload.workflow_runs ?? [])
      .map((run) => this.mapWorkflowRun(run))
      .filter((run): run is GithubWorkflowRunSummary => run !== undefined);
    const totalCount =
      typeof runsPayload.total_count === 'number' && runsPayload.total_count >= 0 ? runsPayload.total_count : runs.length;

    return {
      status: 'loaded',
      hostname: GithubService.HOSTNAME,
      viewer,
      selectedRepo: this.readSelectedRepoState(),
      repo,
      workflow: this.mapAllowlistedWorkflow(workflow),
      runs,
      totalCount,
      truncated: totalCount > runs.length
    };
  }

  async workflowArtifacts(
    workflowKeyRaw: string,
    ownerRaw?: string,
    repoRaw?: string,
    limitRaw?: number,
    artifactLimitRaw?: number
  ): Promise<GithubWorkflowArtifactsResponse> {
    const workflow = this.resolveAllowlistedWorkflow(workflowKeyRaw);
    const limit = this.normalizeWorkflowRunsLimit(limitRaw);
    const artifactLimit = this.normalizeWorkflowArtifactLimit(artifactLimitRaw);
    const auth = await this.resolveGithubAuth();
    const viewer = await this.loadViewer(auth.token);
    const targetRepo = this.resolveTargetRepo(ownerRaw, repoRaw);
    if (!targetRepo) {
      throw new BadRequestException('owner and repo are required or a selected GitHub repo must be bound first');
    }

    const [repoResponse, runsResponse] = await Promise.all([
      this.githubRequest(auth.token, `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}`, {
        method: 'GET'
      }),
      this.githubRequest(
        auth.token,
        `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}/actions/workflows/${encodeURIComponent(workflow.workflowFile)}/runs?per_page=${limit}&event=workflow_dispatch`,
        { method: 'GET' }
      )
    ]);

    const repo = this.mapRepo((await repoResponse.json()) as GithubApiRepo);
    if (!repo) {
      throw new BadGatewayException('GitHub workflow artifacts response was missing repository details');
    }

    const runsPayload = (await runsResponse.json()) as GithubApiWorkflowRunsPayload;
    const runs = (runsPayload.workflow_runs ?? [])
      .map((run) => this.mapWorkflowRun(run))
      .filter((run): run is GithubWorkflowRunSummary => run !== undefined);
    const totalCount =
      typeof runsPayload.total_count === 'number' && runsPayload.total_count >= 0 ? runsPayload.total_count : runs.length;

    const artifactRuns = await Promise.all(
      runs.map(async (run): Promise<GithubWorkflowArtifactRunSummary> => {
        const artifactsResponse = await this.githubRequest(
          auth.token,
          `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}/actions/runs/${run.runId}/artifacts?per_page=${artifactLimit}`,
          { method: 'GET' }
        );
        const artifactsPayload = (await artifactsResponse.json()) as GithubApiArtifactsPayload;
        const artifacts = (artifactsPayload.artifacts ?? [])
          .map((artifact) => this.mapArtifact(artifact))
          .filter((artifact): artifact is GithubArtifactSummary => artifact !== undefined);
        const artifactCount =
          typeof artifactsPayload.total_count === 'number' && artifactsPayload.total_count >= 0
            ? artifactsPayload.total_count
            : artifacts.length;

        return {
          ...run,
          artifactCount,
          artifacts,
          artifactsTruncated: artifactCount > artifacts.length
        };
      })
    );

    return {
      status: 'loaded',
      hostname: GithubService.HOSTNAME,
      viewer,
      selectedRepo: this.readSelectedRepoState(),
      repo,
      workflow: this.mapAllowlistedWorkflow(workflow),
      runs: artifactRuns,
      totalCount,
      truncated: totalCount > artifactRuns.length
    };
  }

  async dispatchWorkflow(request: GithubWorkflowDispatchRequest): Promise<GithubWorkflowDispatchResponse> {
    const workflow = this.resolveAllowlistedWorkflow(request.workflowKey);
    const ref = request.ref?.trim();
    if (!ref) {
      throw new BadRequestException('ref is required');
    }

    const auth = await this.resolveGithubAuth();
    const targetRepo = this.resolveTargetRepo(request.owner, request.repo);
    if (!targetRepo) {
      throw new BadRequestException('owner and repo are required or a selected GitHub repo must be bound first');
    }

    const inputs = this.normalizeWorkflowInputs(workflow, request.inputs);
    await this.githubRequest(
      auth.token,
      `/repos/${encodeURIComponent(targetRepo.owner)}/${encodeURIComponent(targetRepo.repo)}/actions/workflows/${encodeURIComponent(workflow.workflowFile)}/dispatches`,
      {
        method: 'POST',
        body: JSON.stringify({
          ref,
          ...(Object.keys(inputs).length > 0 ? { inputs } : {})
        })
      }
    );

    return {
      status: 'dispatched',
      owner: targetRepo.owner,
      repo: targetRepo.repo,
      workflow: this.mapAllowlistedWorkflow(workflow),
      ref,
      inputs
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

  private normalizePullRequestFileLimit(limitRaw?: number): number {
    if (limitRaw === undefined) {
      return 100;
    }
    if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 300) {
      throw new BadRequestException('pull request file limit must be an integer between 1 and 300');
    }
    return limitRaw;
  }

  private normalizeWorkflowRunsLimit(limitRaw?: number): number {
    if (limitRaw === undefined) {
      return 10;
    }
    if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 25) {
      throw new BadRequestException('workflow run limit must be an integer between 1 and 25');
    }
    return limitRaw;
  }

  private normalizeWorkflowArtifactLimit(limitRaw?: number): number {
    if (limitRaw === undefined) {
      return 10;
    }
    if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 25) {
      throw new BadRequestException('workflow artifact limit must be an integer between 1 and 25');
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

  private mapPullRequestScope(pullRequest: GithubApiPullRequest): GithubPullRequestScopeSummary | undefined {
    const number = pullRequest.number;
    if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) {
      return undefined;
    }
    const title = typeof pullRequest.title === 'string' ? pullRequest.title.trim() : '';
    const state = pullRequest.state === 'open' || pullRequest.state === 'closed' ? pullRequest.state : undefined;
    if (!title || !state) {
      return undefined;
    }

    return {
      number,
      title,
      state,
      url: typeof pullRequest.html_url === 'string' ? pullRequest.html_url.trim() || undefined : undefined,
      author: typeof pullRequest.user?.login === 'string' ? pullRequest.user.login.trim() || undefined : undefined,
      draft: Boolean(pullRequest.draft),
      headRef: typeof pullRequest.head?.ref === 'string' ? pullRequest.head.ref.trim() || undefined : undefined,
      baseRef: typeof pullRequest.base?.ref === 'string' ? pullRequest.base.ref.trim() || undefined : undefined,
      createdAt: typeof pullRequest.created_at === 'string' ? pullRequest.created_at.trim() || undefined : undefined,
      updatedAt: typeof pullRequest.updated_at === 'string' ? pullRequest.updated_at.trim() || undefined : undefined,
      changedFileCount:
        typeof pullRequest.changed_files === 'number' && Number.isInteger(pullRequest.changed_files) && pullRequest.changed_files >= 0
          ? pullRequest.changed_files
          : undefined
    };
  }

  private mapPullRequestFile(file: GithubApiPullRequestFile): GithubPullRequestFileSummary | undefined {
    const filename = typeof file.filename === 'string' ? file.filename.trim() : '';
    if (!filename) {
      return undefined;
    }

    const status =
      file.status === 'added' ||
      file.status === 'modified' ||
      file.status === 'removed' ||
      file.status === 'renamed' ||
      file.status === 'copied' ||
      file.status === 'changed'
        ? file.status
        : 'changed';

    return {
      filename,
      status,
      additions: typeof file.additions === 'number' && file.additions >= 0 ? file.additions : 0,
      deletions: typeof file.deletions === 'number' && file.deletions >= 0 ? file.deletions : 0,
      changes: typeof file.changes === 'number' && file.changes >= 0 ? file.changes : 0,
      previousFilename:
        typeof file.previous_filename === 'string' ? file.previous_filename.trim() || undefined : undefined,
      blobUrl: typeof file.blob_url === 'string' ? file.blob_url.trim() || undefined : undefined,
      rawUrl: typeof file.raw_url === 'string' ? file.raw_url.trim() || undefined : undefined,
      patchTruncated: typeof file.patch !== 'string'
    };
  }

  private listAllowlistedWorkflows(): GithubWorkflowSummary[] {
    return Object.values(GITHUB_ACTIONS_WORKFLOW_ALLOWLIST).map((workflow) => this.mapAllowlistedWorkflow(workflow));
  }

  private resolveAllowlistedWorkflow(workflowKeyRaw: string): GithubAllowlistedWorkflow {
    const workflowKey = workflowKeyRaw?.trim();
    if (!workflowKey) {
      throw new BadRequestException('workflowKey is required');
    }

    const workflow = GITHUB_ACTIONS_WORKFLOW_ALLOWLIST[workflowKey];
    if (!workflow) {
      throw new BadRequestException(`workflowKey is not allowlisted: ${workflowKey}`);
    }

    return workflow;
  }

  private mapAllowlistedWorkflow(workflow: GithubAllowlistedWorkflow): GithubWorkflowSummary {
    return {
      key: workflow.key,
      workflowFile: workflow.workflowFile,
      name: workflow.name,
      description: workflow.description,
      dispatchEnabled: true,
      inputs: workflow.inputs
    };
  }

  private normalizeWorkflowInputs(
    workflow: GithubAllowlistedWorkflow,
    inputsRaw?: Record<string, string>
  ): Record<string, string> {
    const normalizedSource =
      inputsRaw && typeof inputsRaw === 'object' && !Array.isArray(inputsRaw) ? inputsRaw : {};
    const normalized: Record<string, string> = {};

    for (const input of workflow.inputs) {
      const rawValue = normalizedSource[input.key];
      const candidate = typeof rawValue === 'string' ? rawValue.trim() : '';
      if (candidate.length > 0) {
        normalized[input.key] = candidate;
        continue;
      }
      if (input.defaultValue !== undefined) {
        normalized[input.key] = input.defaultValue;
        continue;
      }
      if (input.required) {
        throw new BadRequestException(`workflow input is required: ${input.key}`);
      }
    }

    const unexpectedKeys = Object.keys(normalizedSource).filter((key) => !workflow.inputs.some((input) => input.key === key));
    if (unexpectedKeys.length > 0) {
      throw new BadRequestException(`workflow inputs are not allowlisted: ${unexpectedKeys.join(', ')}`);
    }

    return normalized;
  }

  private mapWorkflowRun(run: GithubApiWorkflowRun): GithubWorkflowRunSummary | undefined {
    const runId = run.id;
    if (typeof runId !== 'number' || !Number.isInteger(runId) || runId < 1) {
      return undefined;
    }

    const status = typeof run.status === 'string' ? run.status.trim() : '';
    if (!status) {
      return undefined;
    }

    return {
      runId,
      runNumber: typeof run.run_number === 'number' && Number.isInteger(run.run_number) && run.run_number > 0 ? run.run_number : undefined,
      status,
      conclusion: typeof run.conclusion === 'string' ? run.conclusion.trim() || undefined : undefined,
      event: typeof run.event === 'string' ? run.event.trim() || undefined : undefined,
      url: typeof run.html_url === 'string' ? run.html_url.trim() || undefined : undefined,
      branch: typeof run.head_branch === 'string' ? run.head_branch.trim() || undefined : undefined,
      sha: typeof run.head_sha === 'string' ? run.head_sha.trim() || undefined : undefined,
      actor: typeof run.actor?.login === 'string' ? run.actor.login.trim() || undefined : undefined,
      title: typeof run.display_title === 'string' ? run.display_title.trim() || undefined : undefined,
      createdAt: typeof run.created_at === 'string' ? run.created_at.trim() || undefined : undefined,
      updatedAt: typeof run.updated_at === 'string' ? run.updated_at.trim() || undefined : undefined
    };
  }

  private mapArtifact(artifact: GithubApiArtifact): GithubArtifactSummary | undefined {
    const artifactId = artifact.id;
    if (typeof artifactId !== 'number' || !Number.isInteger(artifactId) || artifactId < 1) {
      return undefined;
    }

    const name = typeof artifact.name === 'string' ? artifact.name.trim() : '';
    if (!name) {
      return undefined;
    }

    return {
      artifactId,
      name,
      sizeInBytes:
        typeof artifact.size_in_bytes === 'number' && Number.isFinite(artifact.size_in_bytes) && artifact.size_in_bytes >= 0
          ? artifact.size_in_bytes
          : 0,
      downloadUrl:
        typeof artifact.archive_download_url === 'string' ? artifact.archive_download_url.trim() || undefined : undefined,
      url: typeof artifact.url === 'string' ? artifact.url.trim() || undefined : undefined,
      createdAt: typeof artifact.created_at === 'string' ? artifact.created_at.trim() || undefined : undefined,
      updatedAt: typeof artifact.updated_at === 'string' ? artifact.updated_at.trim() || undefined : undefined,
      expiresAt: typeof artifact.expires_at === 'string' ? artifact.expires_at.trim() || undefined : undefined,
      expired: artifact.expired === true
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

  private async resolveProductRepoIdentity(): Promise<GithubProductRepoSummary | undefined> {
    const configuredOwner = this.config.githubRepoOwner();
    const configuredRepo = this.config.githubRepoName();
    if (configuredOwner && configuredRepo) {
      return {
        owner: configuredOwner,
        repo: configuredRepo,
        fullName: `${configuredOwner}/${configuredRepo}`,
        source: 'env_config'
      };
    }

    const cwd = this.runtimePaths.workspaceRoot();
    const remoteResult = await this.githubToolAdapter.gitRemoteGetUrl(cwd, 'origin');
    if (remoteResult.exitCode !== 0) {
      return undefined;
    }

    return this.parseGithubRemoteUrl(remoteResult.stdout.trim());
  }

  private parseGithubRemoteUrl(remoteUrlRaw: string): GithubProductRepoSummary | undefined {
    const remoteUrl = remoteUrlRaw.trim();
    if (!remoteUrl) {
      return undefined;
    }

    const httpsMatch = remoteUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
    if (httpsMatch) {
      const owner = httpsMatch[1].trim();
      const repo = httpsMatch[2].trim();
      if (owner && repo) {
        return {
          owner,
          repo,
          fullName: `${owner}/${repo}`,
          source: 'git_origin',
          remoteUrl
        };
      }
    }

    const sshMatch = remoteUrl.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
    if (sshMatch) {
      const owner = sshMatch[1].trim();
      const repo = sshMatch[2].trim();
      if (owner && repo) {
        return {
          owner,
          repo,
          fullName: `${owner}/${repo}`,
          source: 'git_origin',
          remoteUrl
        };
      }
    }

    return undefined;
  }

  private repoMatches(
    left: { owner: string; repo: string },
    right: { owner: string; repo: string }
  ): boolean {
    return left.owner.toLowerCase() === right.owner.toLowerCase() && left.repo.toLowerCase() === right.repo.toLowerCase();
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
