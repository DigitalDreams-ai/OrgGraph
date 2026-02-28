import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveProjectMemoryStorePath, resolveWorkspaceRoot } from './path';
import type {
  ProjectMemoryEvent,
  ProjectMemoryListFilters,
  ProjectMemoryLink,
  ProjectMemoryRecordBase,
  ProjectMemoryMaterializedRecord,
  ProjectMemoryNote,
  ProjectMemoryRecord,
  ProjectMemoryRecordType,
  ProjectMemorySummary,
  ProjectMemoryValidity
} from './types';

interface MaterializedState {
  records: ProjectMemoryMaterializedRecord[];
  links: ProjectMemoryLink[];
}

function stableId(prefix: string, ...parts: string[]): string {
  const hash = createHash('sha256')
    .update([prefix, ...parts].join('|'))
    .digest('hex')
    .slice(0, 24);
  return `${prefix}_${hash}`;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function sortStrings(values: string[]): string[] {
  return [...values]
    .map((value) => normalizeText(value))
    .filter((value) => value.length > 0)
    .sort((left, right) => left.localeCompare(right));
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(sortStrings(values))];
}

function dedupeSourceRefs(record: ProjectMemoryRecord): ProjectMemoryRecord {
  return {
    ...record,
    sourceRefs: record.sourceRefs
      .map((sourceRef) => ({
        ...sourceRef,
        ref: normalizeText(sourceRef.ref),
        label: sourceRef.label ? normalizeText(sourceRef.label) : undefined
      }))
      .filter((sourceRef) => sourceRef.ref.length > 0)
      .sort((left, right) => `${left.kind}:${left.ref}`.localeCompare(`${right.kind}:${right.ref}`))
  } as ProjectMemoryRecord;
}

function normalizeBaseRecord(record: ProjectMemoryRecord): ProjectMemoryRecordBase {
  return {
    id: record.id,
    recordType: record.recordType,
    title: normalizeText(record.title),
    summary: normalizeText(record.summary),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: normalizeText(record.createdBy),
    sourceRefs: dedupeSourceRefs(record).sourceRefs,
    confidence: record.confidence,
    validity: record.validity,
    scope: {
      area: normalizeText(record.scope.area),
      paths: dedupeStrings(record.scope.paths),
      tags: dedupeStrings(record.scope.tags)
    },
    tags: dedupeStrings(record.tags),
    expiresAt: record.expiresAt
  };
}

function readGitHead(workspaceRoot: string): string | undefined {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: workspaceRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .trim()
      .slice(0, 40);
  } catch {
    return undefined;
  }
}

function toEpoch(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export class ProjectMemoryStore {
  private readonly storePath: string;
  private readonly workspaceRoot: string;

  constructor(storePath = resolveProjectMemoryStorePath(), workspaceRoot = resolveWorkspaceRoot()) {
    this.storePath = storePath;
    this.workspaceRoot = workspaceRoot;
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
  }

  createRecordId(recordType: ProjectMemoryRecordType, title: string, createdAt: string): string {
    return stableId('pmem', recordType, title, createdAt);
  }

  createNoteId(recordId: string, summary: string, createdAt: string): string {
    return stableId('pnote', recordId, summary, createdAt);
  }

  createLinkId(fromRecordId: string, toRecordId: string, relation: string, createdAt: string): string {
    return stableId('plink', fromRecordId, toRecordId, relation, createdAt);
  }

  appendEvent(event: ProjectMemoryEvent): void {
    fs.appendFileSync(this.storePath, `${JSON.stringify(event)}\n`, 'utf8');
  }

  putRecord(record: ProjectMemoryRecord): ProjectMemoryMaterializedRecord {
    const normalized = this.normalizeRecord(record);
    this.appendEvent({
      eventType: 'put_record',
      occurredAt: normalized.updatedAt,
      record: normalized
    });
    return this.getRecord(normalized.id) as ProjectMemoryMaterializedRecord;
  }

  appendNote(recordId: string, note: ProjectMemoryNote): ProjectMemoryMaterializedRecord | undefined {
    this.appendEvent({
      eventType: 'append_note',
      occurredAt: note.createdAt,
      recordId,
      note: {
        ...note,
        summary: normalizeText(note.summary)
      }
    });
    return this.getRecord(recordId);
  }

  markValidity(
    recordId: string,
    validity: ProjectMemoryValidity,
    reason: string,
    createdBy: string,
    occurredAt: string
  ): ProjectMemoryMaterializedRecord | undefined {
    this.appendEvent({
      eventType: 'mark_validity',
      occurredAt,
      recordId,
      validity,
      reason: normalizeText(reason),
      createdBy: normalizeText(createdBy)
    });
    return this.getRecord(recordId);
  }

  linkRecords(link: ProjectMemoryLink): MaterializedState {
    this.appendEvent({
      eventType: 'link_records',
      occurredAt: link.createdAt,
      link
    });
    return this.materialize();
  }

  getRecord(recordId: string): ProjectMemoryMaterializedRecord | undefined {
    return this.materialize().records.find((record) => record.id === recordId);
  }

  listRecords(filters: ProjectMemoryListFilters = {}): ProjectMemoryMaterializedRecord[] {
    const limit = Math.max(1, Math.min(filters.limit ?? 20, 200));
    const loweredText = filters.text ? filters.text.trim().toLowerCase() : undefined;

    return this.materialize().records
      .filter((record) => {
        if (filters.recordTypes && filters.recordTypes.length > 0 && !filters.recordTypes.includes(record.recordType)) {
          return false;
        }
        if (filters.validity && filters.validity.length > 0 && !filters.validity.includes(record.effectiveValidity)) {
          return false;
        }
        if (filters.scopeArea && record.scope.area !== filters.scopeArea) {
          return false;
        }
        if (filters.scopePath && !record.scope.paths.includes(filters.scopePath)) {
          return false;
        }
        if (filters.tag && !record.tags.includes(filters.tag)) {
          return false;
        }
        if (!loweredText) {
          return true;
        }

        const haystack = [
          record.id,
          record.title,
          record.summary,
          ...record.tags,
          ...record.scope.paths,
          ...record.scope.tags,
          ...record.sourceRefs.map((sourceRef) => sourceRef.ref),
          ...record.notes.map((note) => note.summary)
        ]
          .join('\n')
          .toLowerCase();
        return haystack.includes(loweredText);
      })
      .slice(0, limit);
  }

  summarizeScope(scopeArea: string, limit = 10): ProjectMemorySummary {
    const scoped = this.listRecords({ scopeArea, limit: 500 });
    const byType = {
      work_item: 0,
      decision_note: 0,
      repo_map: 0,
      verification_result: 0,
      risk_item: 0,
      handoff_note: 0,
      runtime_observation: 0
    };
    const byValidity = {
      advisory: 0,
      verified: 0,
      stale: 0,
      superseded: 0,
      expired: 0
    };

    for (const record of scoped) {
      byType[record.recordType] += 1;
      byValidity[record.effectiveValidity] += 1;
    }

    return {
      scopeArea,
      totalRecords: scoped.length,
      byType,
      byValidity,
      staleRecordIds: scoped
        .filter((record) => record.effectiveValidity === 'stale')
        .slice(0, limit)
        .map((record) => record.id),
      recentRecordIds: scoped.slice(0, limit).map((record) => record.id),
      openRiskIds: scoped
        .filter((record) => record.recordType === 'risk_item' && record.status === 'open')
        .slice(0, limit)
        .map((record) => record.id),
      pendingWorkIds: scoped
        .filter(
          (record) =>
            record.recordType === 'work_item' &&
            (record.status === 'todo' || record.status === 'in_progress' || record.status === 'blocked')
        )
        .slice(0, limit)
        .map((record) => record.id)
    };
  }

  pruneExpired(now = new Date().toISOString(), createdBy = 'system'): ProjectMemoryMaterializedRecord[] {
    const expired: ProjectMemoryMaterializedRecord[] = [];
    for (const record of this.materialize().records) {
      if (record.effectiveValidity === 'expired' && record.validity !== 'expired') {
        const updated = this.markValidity(record.id, 'expired', 'expired_by_ttl', createdBy, now);
        if (updated) {
          expired.push(updated);
        }
      }
    }
    return expired;
  }

  private materialize(): MaterializedState {
    const records = new Map<string, ProjectMemoryRecord>();
    const notes = new Map<string, ProjectMemoryNote[]>();
    const links = new Map<string, ProjectMemoryLink>();
    const invalidationReasons = new Map<string, string[]>();

    for (const event of this.readEvents()) {
      if (event.eventType === 'put_record') {
        records.set(event.record.id, event.record);
      }
      if (event.eventType === 'append_note') {
        const bucket = notes.get(event.recordId) ?? [];
        bucket.unshift(event.note);
        notes.set(event.recordId, bucket);
      }
      if (event.eventType === 'mark_validity') {
        const existing = records.get(event.recordId);
        if (!existing) {
          continue;
        }
        records.set(event.recordId, {
          ...existing,
          validity: event.validity,
          updatedAt: event.occurredAt
        });
        const reasons = invalidationReasons.get(event.recordId) ?? [];
        reasons.unshift(event.reason);
        invalidationReasons.set(event.recordId, reasons);
      }
      if (event.eventType === 'link_records') {
        links.set(event.link.linkId, event.link);
      }
    }

    const linkList = [...links.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const gitHead = readGitHead(this.workspaceRoot);
    const materialized = [...records.values()]
      .map((record) => {
        const derived = this.deriveValidity(record, invalidationReasons.get(record.id) ?? [], gitHead);
        return {
          ...record,
          notes: notes.get(record.id) ?? [],
          linkedRecords: linkList.filter(
            (link) => link.fromRecordId === record.id || link.toRecordId === record.id
          ),
          effectiveValidity: derived.validity,
          invalidationReasons: derived.reasons
        } satisfies ProjectMemoryMaterializedRecord;
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return {
      records: materialized,
      links: linkList
    };
  }

  private deriveValidity(
    record: ProjectMemoryRecord,
    explicitReasons: string[],
    gitHead?: string
  ): { validity: ProjectMemoryValidity; reasons: string[] } {
    const reasons = [...explicitReasons];
    if (record.validity === 'superseded' || record.validity === 'expired') {
      return { validity: record.validity, reasons };
    }

    const nowEpoch = Date.now();
    const expiresAtEpoch = toEpoch(record.expiresAt);
    if (expiresAtEpoch !== undefined && expiresAtEpoch <= nowEpoch) {
      reasons.unshift('expired_by_ttl');
      return { validity: 'expired', reasons };
    }

    if (record.recordType === 'runtime_observation') {
      const createdAtEpoch = toEpoch(record.createdAt) ?? 0;
      if (createdAtEpoch + record.ttlSeconds * 1000 <= nowEpoch) {
        reasons.unshift('expired_runtime_observation');
        return { validity: 'expired', reasons };
      }
    }

    const updatedAtEpoch = toEpoch(record.updatedAt) ?? 0;
    for (const sourceRef of record.sourceRefs) {
      if (
        (sourceRef.kind === 'file' || sourceRef.kind === 'doc' || sourceRef.kind === 'artifact') &&
        sourceRef.ref.length > 0
      ) {
        const targetPath = path.isAbsolute(sourceRef.ref)
          ? sourceRef.ref
          : path.resolve(this.workspaceRoot, sourceRef.ref);
        if (!fs.existsSync(targetPath)) {
          reasons.unshift(`source_missing:${sourceRef.ref}`);
          return { validity: 'stale', reasons };
        }
        const stat = fs.statSync(targetPath);
        if (stat.mtimeMs > updatedAtEpoch) {
          reasons.unshift(`source_modified:${sourceRef.ref}`);
          return { validity: 'stale', reasons };
        }
      }
    }

    if (
      gitHead &&
      (record.recordType === 'verification_result' || record.recordType === 'handoff_note') &&
      record.commitSha &&
      record.commitSha !== gitHead
    ) {
      reasons.unshift(`commit_advanced:${gitHead}`);
      return { validity: 'stale', reasons };
    }

    return { validity: record.validity, reasons };
  }

  private readEvents(): ProjectMemoryEvent[] {
    if (!fs.existsSync(this.storePath)) {
      return [];
    }
    const raw = fs.readFileSync(this.storePath, 'utf8').trim();
    if (raw.length === 0) {
      return [];
    }
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as ProjectMemoryEvent);
  }

  private normalizeRecord(record: ProjectMemoryRecord): ProjectMemoryRecord {
    const normalizedBase = normalizeBaseRecord(record);

    switch (record.recordType) {
      case 'work_item':
        return {
          ...normalizedBase,
          recordType: 'work_item',
          status: record.status,
          owner: record.owner ? normalizeText(record.owner) : undefined,
          scopePaths: dedupeStrings(record.scopePaths),
          relatedDocs: dedupeStrings(record.relatedDocs),
          relatedIssues: dedupeStrings(record.relatedIssues)
        };
      case 'decision_note':
        return {
          ...normalizedBase,
          recordType: 'decision_note',
          rationale: normalizeText(record.rationale),
          alternativesRejected: dedupeStrings(record.alternativesRejected),
          commitSha: record.commitSha,
          docRefs: dedupeStrings(record.docRefs)
        };
      case 'repo_map':
        return {
          ...normalizedBase,
          recordType: 'repo_map',
          subsystem: normalizeText(record.subsystem),
          entryPoints: dedupeStrings(record.entryPoints),
          keyPaths: dedupeStrings(record.keyPaths),
          dependencies: dedupeStrings(record.dependencies),
          verificationCommands: dedupeStrings(record.verificationCommands),
          docRefs: dedupeStrings(record.docRefs)
        };
      case 'verification_result':
        return {
          ...normalizedBase,
          recordType: 'verification_result',
          subject: normalizeText(record.subject),
          command: normalizeText(record.command),
          result: record.result,
          commitSha: record.commitSha,
          artifactRefs: dedupeStrings(record.artifactRefs),
          serviceRefs: dedupeStrings(record.serviceRefs)
        };
      case 'risk_item':
        return {
          ...normalizedBase,
          recordType: 'risk_item',
          severity: record.severity,
          status: record.status,
          trigger: normalizeText(record.trigger),
          mitigation: normalizeText(record.mitigation)
        };
      case 'handoff_note':
        return {
          ...normalizedBase,
          recordType: 'handoff_note',
          taskContext: normalizeText(record.taskContext),
          currentState: normalizeText(record.currentState),
          nextChecks: dedupeStrings(record.nextChecks),
          blockedBy: dedupeStrings(record.blockedBy),
          commitSha: record.commitSha
        };
      case 'runtime_observation':
        return {
          ...normalizedBase,
          recordType: 'runtime_observation',
          service: normalizeText(record.service),
          observation: normalizeText(record.observation),
          ttlSeconds: record.ttlSeconds
        };
      default:
        return record;
    }
  }
}
