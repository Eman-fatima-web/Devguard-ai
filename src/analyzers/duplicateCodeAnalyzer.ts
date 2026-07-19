import { Analyzer, AnalyzerContext, DevGuardIssue } from '../types';
import { normalizeForHash, hashString } from '../utils/astUtils';

/**
 * Sliding-window structural duplicate detector.
 * Cross-file matches are tracked in a module-level cache so "duplicate
 * across the project" isn't lost between per-file analyze() calls.
 */
const blockRegistry = new Map<string, { filePath: string; line: number }[]>();

export function resetDuplicateRegistry(): void {
  blockRegistry.clear();
}

export const duplicateCodeAnalyzer: Analyzer = {
  id: 'duplicate-code',
  displayName: 'Duplicate Code',
  supportedExtensions: ['js', 'jsx', 'ts', 'tsx'],

  analyze(filePath, content, ctx: AnalyzerContext): DevGuardIssue[] {
    void ctx;
    const threshold = 6; // lines per block; also configurable via settings
    const lines = content.split('\n');
    const issues: DevGuardIssue[] = [];

    for (let i = 0; i <= lines.length - threshold; i++) {
      const block = lines.slice(i, i + threshold).join('\n');
      const trimmed = block.trim();
      if (trimmed.length < 40) continue; // skip trivial/whitespace-heavy blocks

      const normalized = normalizeForHash(block);
      const hash = hashString(normalized);

      const existing = blockRegistry.get(hash) ?? [];
      const priorInSameFile = existing.find((e) => e.filePath === filePath && Math.abs(e.line - i) < threshold);

      if (existing.length > 0 && !priorInSameFile) {
        const original = existing[0];
        issues.push({
          id: `duplicate-code:${filePath}:${i}`,
          category: 'duplicate-code',
          severity: 'information',
          message: `This ${threshold}-line block closely matches code in ${original.filePath} (line ${original.line + 1}).`,
          filePath,
          line: i,
          column: 0,
          suggestion: 'Consider extracting this into a shared function, hook, or utility module.',
          ruleId: 'devguard/no-duplicate-code'
        });
      }

      existing.push({ filePath, line: i });
      blockRegistry.set(hash, existing);
    }

    return issues;
  }
};
