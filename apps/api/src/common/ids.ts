import { createHash } from 'node:crypto';

export function stableId(prefix: string, ...parts: string[]): string {
  const hash = createHash('sha256')
    .update([prefix, ...parts].join('|'))
    .digest('hex')
    .slice(0, 24);

  return `${prefix}_${hash}`;
}
