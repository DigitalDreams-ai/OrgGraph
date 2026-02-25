export type ParserWarningCategory = 'noise' | 'ambiguous' | 'unsupported';

export interface ParserStats {
  parser: string;
  filesDiscovered: number;
  filesParsed: number;
  filesSkipped: number;
  warnings: string[];
  warningCounts: Record<ParserWarningCategory, number>;
}

export function createParserStats(parser: string): ParserStats {
  return {
    parser,
    filesDiscovered: 0,
    filesParsed: 0,
    filesSkipped: 0,
    warnings: [],
    warningCounts: {
      noise: 0,
      ambiguous: 0,
      unsupported: 0
    }
  };
}

export function recordParserWarning(
  stats: ParserStats,
  category: ParserWarningCategory,
  message: string
): void {
  stats.warningCounts[category] += 1;
  stats.warnings.push(`[${category}] ${message}`);
}
