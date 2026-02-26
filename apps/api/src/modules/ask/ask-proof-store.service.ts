import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { resolveAskProofStorePath } from '../../common/path';
import { AppConfigService } from '../../config/app-config.service';
import type { AskProofArtifact } from './ask.types';

@Injectable()
export class AskProofStoreService {
  private readonly storePath: string;

  constructor(private readonly config: AppConfigService) {
    this.storePath = resolveAskProofStorePath(this.config.askProofStorePath());
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
  }

  append(proof: AskProofArtifact): void {
    fs.appendFileSync(this.storePath, `${JSON.stringify(proof)}\n`, 'utf8');
  }

  findByProofId(proofId: string): AskProofArtifact | undefined {
    const entries = this.readAll();
    return entries.find((entry) => entry.proofId === proofId);
  }

  findByReplayToken(replayToken: string): AskProofArtifact | undefined {
    const entries = this.readAll();
    return entries.find((entry) => entry.replayToken === replayToken);
  }

  private readAll(): AskProofArtifact[] {
    if (!fs.existsSync(this.storePath)) {
      return [];
    }

    const raw = fs.readFileSync(this.storePath, 'utf8');
    if (raw.trim().length === 0) {
      return [];
    }

    const parsed = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as AskProofArtifact);

    return parsed.reverse();
  }
}
