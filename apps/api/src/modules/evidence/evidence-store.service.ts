import fs from 'node:fs';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service';
import { resolveEvidenceIndexPath } from '../../common/path';
import type { EvidenceDocument, EvidenceSearchResult, EvidenceStore } from './evidence.types';

@Injectable()
export class EvidenceStoreService implements EvidenceStore {
  private readonly indexPath: string;
  private readonly indexMetaPath: string;

  constructor(private readonly configService: AppConfigService) {
    this.indexPath = resolveEvidenceIndexPath(this.configService.evidenceIndexPath());
    this.indexMetaPath = `${this.indexPath}.meta.json`;
  }

  reindexFromFixtures(rootPath: string): { documentCount: number; sourcePath: string } {
    let documentCount = 0;

    const targets: Array<{ dir: string; sourceType: string; exts: string[] }> = [
      { dir: path.join(rootPath, 'apex-triggers'), sourceType: 'apex-trigger', exts: ['.trigger'] },
      { dir: path.join(rootPath, 'apex-classes'), sourceType: 'apex-class', exts: ['.cls'] },
      { dir: path.join(rootPath, 'flows'), sourceType: 'flow', exts: ['.xml'] },
      { dir: path.join(rootPath, 'profiles'), sourceType: 'profile', exts: ['.xml'] },
      {
        dir: path.join(rootPath, 'permission-sets'),
        sourceType: 'permission-set',
        exts: ['.xml']
      }
    ];

    fs.mkdirSync(path.dirname(this.indexPath), { recursive: true });
    const tempPath = `${this.indexPath}.tmp`;
    const fd = fs.openSync(tempPath, 'w');

    try {
      for (const target of targets) {
        if (!fs.existsSync(target.dir)) {
          continue;
        }
        const files = fs.readdirSync(target.dir);

        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (!target.exts.includes(ext)) {
            continue;
          }

          const filePath = path.join(target.dir, file);
          const raw = fs.readFileSync(filePath, 'utf8');
          const chunks = this.chunkText(raw, 700);
          const tags = this.extractTags(raw);

          chunks.forEach((chunkText, idx) => {
            const document: EvidenceDocument = {
              id: this.makeId(filePath, idx, chunkText),
              sourcePath: filePath,
              sourceType: target.sourceType,
              chunkText,
              entityTags: tags
            };
            fs.writeSync(fd, `${JSON.stringify(document)}\n`, undefined, 'utf8');
            documentCount += 1;
          });
        }
      }
    } finally {
      fs.closeSync(fd);
    }

    fs.renameSync(tempPath, this.indexPath);
    this.writeIndexMetadata(documentCount);

    return { documentCount, sourcePath: this.indexPath };
  }

  getDocumentCount(): number {
    const metadata = this.readIndexMetadata();
    if (metadata) {
      return metadata.documentCount;
    }
    if (this.isLegacyJsonIndex()) {
      return this.readLegacyIndex().documents.length;
    }
    return this.countNdjsonDocuments();
  }

  getIndexPath(): string {
    return this.indexPath;
  }

  search(query: string, maxResults: number): EvidenceSearchResult[] {
    const tokens = this.tokenize(query);
    if (tokens.length === 0) {
      return [];
    }

    if (this.isLegacyJsonIndex()) {
      const docs = this.readLegacyIndex().documents;
      return docs
        .map((doc) => ({ doc, score: this.score(tokens, doc) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id))
        .slice(0, Math.max(1, maxResults))
        .map((item) => ({ ...item.doc, score: item.score }));
    }

    const limit = Math.max(1, maxResults);
    const ranked: EvidenceSearchResult[] = [];
    for (const doc of this.readNdjsonDocuments()) {
      const score = this.score(tokens, doc);
      if (score <= 0) {
        continue;
      }
      ranked.push({ ...doc, score });
      ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
      if (ranked.length > limit) {
        ranked.length = limit;
      }
    }

    return ranked;
  }

  private readLegacyIndex(): { documents: EvidenceDocument[] } {
    if (!fs.existsSync(this.indexPath)) {
      return { documents: [] };
    }
    const raw = fs.readFileSync(this.indexPath, 'utf8');
    if (raw.trim().length === 0) {
      return { documents: [] };
    }
    const parsed = JSON.parse(raw) as { documents?: EvidenceDocument[] };
    return { documents: parsed.documents ?? [] };
  }

  private readIndexMetadata(): { documentCount: number } | undefined {
    if (!fs.existsSync(this.indexMetaPath)) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(this.indexMetaPath, 'utf8')) as {
        documentCount?: unknown;
      };
      if (typeof parsed.documentCount === 'number' && parsed.documentCount >= 0) {
        return { documentCount: parsed.documentCount };
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  private writeIndexMetadata(documentCount: number): void {
    fs.writeFileSync(
      this.indexMetaPath,
      JSON.stringify({ documentCount, updatedAt: new Date().toISOString() }, null, 2),
      'utf8'
    );
  }

  private isLegacyJsonIndex(): boolean {
    if (!fs.existsSync(this.indexPath)) {
      return false;
    }
    const fd = fs.openSync(this.indexPath, 'r');
    try {
      const buffer = Buffer.alloc(128);
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
      const prefix = buffer.toString('utf8', 0, bytesRead).trimStart();
      return prefix.startsWith('{') && prefix.includes('"documents"');
    } finally {
      fs.closeSync(fd);
    }
  }

  private countNdjsonDocuments(): number {
    if (!fs.existsSync(this.indexPath)) {
      return 0;
    }
    const fd = fs.openSync(this.indexPath, 'r');
    const buffer = Buffer.alloc(64 * 1024);
    let count = 0;
    let leftover = '';

    try {
      while (true) {
        const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
        if (bytesRead === 0) {
          break;
        }
        const chunk = leftover + buffer.toString('utf8', 0, bytesRead);
        const lines = chunk.split('\n');
        leftover = lines.pop() ?? '';
        count += lines.filter((line) => line.trim().length > 0).length;
      }
      if (leftover.trim().length > 0) {
        count += 1;
      }
      return count;
    } finally {
      fs.closeSync(fd);
    }
  }

  private *readNdjsonDocuments(): Generator<EvidenceDocument, void, void> {
    if (!fs.existsSync(this.indexPath)) {
      return;
    }
    const fd = fs.openSync(this.indexPath, 'r');
    const buffer = Buffer.alloc(64 * 1024);
    let leftover = '';

    try {
      while (true) {
        const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
        if (bytesRead === 0) {
          break;
        }
        const chunk = leftover + buffer.toString('utf8', 0, bytesRead);
        const lines = chunk.split('\n');
        leftover = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length === 0) {
            continue;
          }
          yield JSON.parse(trimmed) as EvidenceDocument;
        }
      }
      if (leftover.trim().length > 0) {
        yield JSON.parse(leftover.trim()) as EvidenceDocument;
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  private chunkText(text: string, maxChunkChars: number): string[] {
    const normalized = text.replace(/\r\n/g, '\n');
    if (normalized.length <= maxChunkChars) {
      return [normalized];
    }

    const chunks: string[] = [];
    for (let i = 0; i < normalized.length; i += maxChunkChars) {
      chunks.push(normalized.slice(i, i + maxChunkChars));
    }
    return chunks;
  }

  private extractTags(text: string): string[] {
    const matches = text.match(/\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b/g) ?? [];
    return [...new Set(matches)].sort((a, b) => a.localeCompare(b));
  }

  private tokenize(input: string): string[] {
    const base = input.toLowerCase().split(/[^a-z0-9_.]+/).filter((x) => x.length > 1);
    const expanded = new Set<string>();

    for (const token of base) {
      expanded.add(token);
      if (token.includes('.')) {
        for (const part of token.split('.')) {
          if (part.length > 1) {
            expanded.add(part);
          }
        }
      }
    }

    return [...expanded];
  }

  private score(tokens: string[], doc: EvidenceDocument): number {
    if (tokens.length === 0) {
      return 0;
    }

    const haystack = `${doc.chunkText.toLowerCase()} ${doc.entityTags.join(' ').toLowerCase()}`;
    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) {
        score += token.includes('.') ? 3 : 1;
      }
    }

    return score;
  }

  private makeId(filePath: string, index: number, chunkText: string): string {
    const digest = createHash('sha256').update(`${filePath}|${index}|${chunkText}`).digest('hex');
    return `ev_${digest.slice(0, 24)}`;
  }
}
