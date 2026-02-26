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

  constructor(private readonly configService: AppConfigService) {
    this.indexPath = resolveEvidenceIndexPath(this.configService.evidenceIndexPath());
  }

  reindexFromFixtures(rootPath: string): { documentCount: number; sourcePath: string } {
    const docs: EvidenceDocument[] = [];

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
          docs.push({
            id: this.makeId(filePath, idx, chunkText),
            sourcePath: filePath,
            sourceType: target.sourceType,
            chunkText,
            entityTags: tags
          });
        });
      }
    }

    fs.mkdirSync(path.dirname(this.indexPath), { recursive: true });
    fs.writeFileSync(this.indexPath, JSON.stringify({ documents: docs }, null, 2), 'utf8');

    return { documentCount: docs.length, sourcePath: this.indexPath };
  }

  getDocumentCount(): number {
    const parsed = this.readIndex();
    return parsed.documents.length;
  }

  getIndexPath(): string {
    return this.indexPath;
  }

  search(query: string, maxResults: number): EvidenceSearchResult[] {
    const docs = this.readIndex().documents;
    const tokens = this.tokenize(query);

    const ranked = docs
      .map((doc) => ({ doc, score: this.score(tokens, doc) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id))
      .slice(0, Math.max(1, maxResults))
      .map((item) => ({ ...item.doc, score: item.score }));

    return ranked;
  }

  private readIndex(): { documents: EvidenceDocument[] } {
    if (!fs.existsSync(this.indexPath)) {
      return { documents: [] };
    }

    const raw = fs.readFileSync(this.indexPath, 'utf8');
    const parsed = JSON.parse(raw) as { documents?: EvidenceDocument[] };
    return { documents: parsed.documents ?? [] };
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
