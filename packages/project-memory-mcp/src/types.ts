export type ProjectMemoryRecordType =
  | 'work_item'
  | 'decision_note'
  | 'repo_map'
  | 'verification_result'
  | 'risk_item'
  | 'handoff_note'
  | 'runtime_observation';

export type ProjectMemoryValidity = 'advisory' | 'verified' | 'stale' | 'superseded' | 'expired';

export type ProjectMemoryConfidence = 'low' | 'medium' | 'high';

export type ProjectMemoryLinkRelation =
  | 'depends_on'
  | 'implements'
  | 'blocks'
  | 'verifies'
  | 'supersedes'
  | 'relates_to';

export type ProjectMemorySourceKind =
  | 'file'
  | 'doc'
  | 'commit'
  | 'issue'
  | 'pull_request'
  | 'proof'
  | 'snapshot'
  | 'policy'
  | 'command'
  | 'artifact'
  | 'service';

export interface ProjectMemorySourceRef {
  kind: ProjectMemorySourceKind;
  ref: string;
  label?: string;
  observedAt?: string;
}

export interface ProjectMemoryScope {
  area: string;
  paths: string[];
  tags: string[];
}

export interface ProjectMemoryNote {
  noteId: string;
  summary: string;
  createdAt: string;
  createdBy: string;
  sourceRefs: ProjectMemorySourceRef[];
}

export interface ProjectMemoryLink {
  linkId: string;
  relation: ProjectMemoryLinkRelation;
  fromRecordId: string;
  toRecordId: string;
  createdAt: string;
  createdBy: string;
}

export interface ProjectMemoryRecordBase {
  id: string;
  recordType: ProjectMemoryRecordType;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  sourceRefs: ProjectMemorySourceRef[];
  confidence: ProjectMemoryConfidence;
  validity: ProjectMemoryValidity;
  scope: ProjectMemoryScope;
  tags: string[];
  expiresAt?: string;
}

export interface WorkItemRecord extends ProjectMemoryRecordBase {
  recordType: 'work_item';
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  owner?: string;
  scopePaths: string[];
  relatedDocs: string[];
  relatedIssues: string[];
}

export interface DecisionNoteRecord extends ProjectMemoryRecordBase {
  recordType: 'decision_note';
  rationale: string;
  alternativesRejected: string[];
  commitSha?: string;
  docRefs: string[];
  supersededBy?: string;
}

export interface RepoMapRecord extends ProjectMemoryRecordBase {
  recordType: 'repo_map';
  subsystem: string;
  entryPoints: string[];
  keyPaths: string[];
  dependencies: string[];
  verificationCommands: string[];
  docRefs: string[];
}

export interface VerificationResultRecord extends ProjectMemoryRecordBase {
  recordType: 'verification_result';
  subject: string;
  command: string;
  result: 'pass' | 'warn' | 'fail';
  commitSha?: string;
  artifactRefs: string[];
  serviceRefs: string[];
}

export interface RiskItemRecord extends ProjectMemoryRecordBase {
  recordType: 'risk_item';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'mitigated' | 'accepted' | 'closed';
  trigger: string;
  mitigation: string;
}

export interface HandoffNoteRecord extends ProjectMemoryRecordBase {
  recordType: 'handoff_note';
  taskContext: string;
  currentState: string;
  nextChecks: string[];
  blockedBy: string[];
  commitSha?: string;
}

export interface RuntimeObservationRecord extends ProjectMemoryRecordBase {
  recordType: 'runtime_observation';
  service: string;
  observation: string;
  ttlSeconds: number;
}

export type ProjectMemoryRecord =
  | WorkItemRecord
  | DecisionNoteRecord
  | RepoMapRecord
  | VerificationResultRecord
  | RiskItemRecord
  | HandoffNoteRecord
  | RuntimeObservationRecord;

export type ProjectMemoryMaterializedRecord = ProjectMemoryRecord & {
  notes: ProjectMemoryNote[];
  linkedRecords: ProjectMemoryLink[];
  effectiveValidity: ProjectMemoryValidity;
  invalidationReasons: string[];
};

export type ProjectMemoryEvent =
  | {
      eventType: 'put_record';
      occurredAt: string;
      record: ProjectMemoryRecord;
    }
  | {
      eventType: 'append_note';
      occurredAt: string;
      recordId: string;
      note: ProjectMemoryNote;
    }
  | {
      eventType: 'mark_validity';
      occurredAt: string;
      recordId: string;
      validity: ProjectMemoryValidity;
      reason: string;
      createdBy: string;
    }
  | {
      eventType: 'link_records';
      occurredAt: string;
      link: ProjectMemoryLink;
    };

export interface ProjectMemoryListFilters {
  recordTypes?: ProjectMemoryRecordType[];
  validity?: ProjectMemoryValidity[];
  scopeArea?: string;
  scopePath?: string;
  tag?: string;
  text?: string;
  limit?: number;
}

export interface ProjectMemorySummary {
  scopeArea: string;
  totalRecords: number;
  byType: Record<ProjectMemoryRecordType, number>;
  byValidity: Record<ProjectMemoryValidity, number>;
  staleRecordIds: string[];
  recentRecordIds: string[];
  openRiskIds: string[];
  pendingWorkIds: string[];
}
