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
