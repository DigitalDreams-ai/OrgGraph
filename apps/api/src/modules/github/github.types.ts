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
