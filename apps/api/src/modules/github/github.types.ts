import type { AskDecisionPacket, AskTrustLevel } from '../ask/ask.types';

export interface GithubPublishReviewPacketCommentRequest {
  pullNumber: number;
  proofId: string;
  replayToken?: string;
  owner?: string;
  repo?: string;
}

export interface GithubPublishReviewPacketCommentResponse {
  status: 'published';
  owner: string;
  repo: string;
  pullNumber: number;
  proofId: string;
  replayToken: string;
  publicationMode: 'created' | 'updated';
  commentId: number;
  commentUrl?: string;
}

export interface GithubReviewPacketPayload {
  deterministicAnswer: string;
  trustLevel: AskTrustLevel;
  decisionPacket?: AskDecisionPacket;
}

export interface GithubSessionIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  remediation: string;
}

export interface GithubViewerSummary {
  login: string;
  name?: string;
  url?: string;
}

export interface GithubRepoSummary {
  owner: string;
  name: string;
  fullName: string;
  description?: string;
  visibility: 'public' | 'private' | 'internal';
  private: boolean;
  url?: string;
  cloneUrl?: string;
  defaultBranch?: string;
  selected?: boolean;
}

export interface GithubBranchSummary {
  name: string;
  protected: boolean;
  url?: string;
  lastCommitSha?: string;
  lastCommitUrl?: string;
}

export interface GithubPullRequestSummary {
  number: number;
  title: string;
  state: 'open';
  url?: string;
  author?: string;
  draft: boolean;
  headRef?: string;
  baseRef?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GithubPullRequestScopeSummary {
  number: number;
  title: string;
  state: 'open' | 'closed';
  url?: string;
  author?: string;
  draft: boolean;
  headRef?: string;
  baseRef?: string;
  createdAt?: string;
  updatedAt?: string;
  changedFileCount?: number;
}

export interface GithubPullRequestFileSummary {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed';
  additions: number;
  deletions: number;
  changes: number;
  previousFilename?: string;
  blobUrl?: string;
  rawUrl?: string;
  patchTruncated?: boolean;
}

export interface GithubSelectedRepoState {
  owner: string;
  repo: string;
  fullName: string;
  visibility: 'public' | 'private' | 'internal';
  private: boolean;
  url?: string;
  cloneUrl?: string;
  defaultBranch?: string;
  selectedAt: string;
}

export interface GithubProductRepoSummary {
  owner: string;
  repo: string;
  fullName: string;
  source: 'env_config' | 'git_origin';
  remoteUrl?: string;
}

export interface GithubSessionStatusResponse {
  status: 'authenticated' | 'unauthenticated';
  hostname: string;
  cliInstalled: boolean;
  authSource: 'env_token' | 'gh_cli' | 'none';
  viewer?: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepoState;
  issues: GithubSessionIssue[];
}

export interface GithubRepoListResponse {
  status: 'loaded';
  hostname: string;
  viewer: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepoState;
  repos: GithubRepoSummary[];
}

export interface GithubRepoBindingStatusResponse {
  status: 'ready' | 'blocked';
  hostname: string;
  selectedRepo?: GithubSelectedRepoState;
  productRepo?: GithubProductRepoSummary;
  metadataCommitEligible: boolean;
  issues: GithubSessionIssue[];
}

export interface GithubRepoContextResponse {
  status: 'loaded';
  hostname: string;
  viewer: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepoState;
  repo: GithubRepoSummary;
  branches: GithubBranchSummary[];
  pullRequests: GithubPullRequestSummary[];
}

export interface GithubPullRequestFileScopeResponse {
  status: 'loaded';
  hostname: string;
  viewer: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepoState;
  repo: GithubRepoSummary;
  pullRequest: GithubPullRequestScopeSummary;
  files: GithubPullRequestFileSummary[];
  totalCount: number;
  truncated: boolean;
}

export interface GithubWorkflowInputDefinition {
  key: string;
  label: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface GithubWorkflowSummary {
  key: string;
  workflowFile: string;
  name: string;
  description: string;
  dispatchEnabled: boolean;
  inputs: GithubWorkflowInputDefinition[];
}

export interface GithubWorkflowRunSummary {
  runId: number;
  runNumber?: number;
  status: string;
  conclusion?: string;
  event?: string;
  url?: string;
  branch?: string;
  sha?: string;
  actor?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GithubArtifactSummary {
  artifactId: number;
  name: string;
  sizeInBytes: number;
  downloadUrl?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  expired: boolean;
}

export interface GithubWorkflowArtifactRunSummary extends GithubWorkflowRunSummary {
  artifactCount: number;
  artifacts: GithubArtifactSummary[];
  artifactsTruncated: boolean;
}

export interface GithubWorkflowCatalogResponse {
  status: 'loaded';
  hostname: string;
  viewer: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepoState;
  repo: GithubRepoSummary;
  workflows: GithubWorkflowSummary[];
}

export interface GithubWorkflowRunsResponse {
  status: 'loaded';
  hostname: string;
  viewer: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepoState;
  repo: GithubRepoSummary;
  workflow: GithubWorkflowSummary;
  runs: GithubWorkflowRunSummary[];
  totalCount: number;
  truncated: boolean;
}

export interface GithubWorkflowArtifactsResponse {
  status: 'loaded';
  hostname: string;
  viewer: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepoState;
  repo: GithubRepoSummary;
  workflow: GithubWorkflowSummary;
  runs: GithubWorkflowArtifactRunSummary[];
  totalCount: number;
  truncated: boolean;
}

export interface GithubWorkflowDispatchRequest {
  workflowKey: string;
  ref: string;
  owner?: string;
  repo?: string;
  inputs?: Record<string, string>;
}

export interface GithubWorkflowDispatchResponse {
  status: 'dispatched';
  owner: string;
  repo: string;
  workflow: GithubWorkflowSummary;
  ref: string;
  inputs: Record<string, string>;
}

export interface GithubCreateRepoRequest {
  owner?: string;
  name: string;
  description?: string;
  visibility?: 'private' | 'public';
}

export interface GithubCreateRepoResponse {
  status: 'created';
  repo: GithubRepoSummary;
  selectedRepo: GithubSelectedRepoState;
}

export interface GithubSelectRepoRequest {
  owner: string;
  repo: string;
}

export interface GithubSelectRepoResponse {
  status: 'selected';
  repo: GithubSelectedRepoState;
}
