export type ToolStatusSource = 'runtime_unavailable' | 'live' | 'unknown';

export function describeToolStatusSource(source: ToolStatusSource): string {
  if (source === 'runtime_unavailable') {
    return 'runtime unavailable';
  }

  if (source === 'live') {
    return 'live status';
  }

  return 'status not loaded';
}
