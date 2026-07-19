import traverse from '@babel/traverse';
import { Analyzer, AnalyzerContext, DevGuardIssue } from '../types';
import { safeParse } from '../utils/astUtils';

/** Flags common accessibility mistakes in JSX and plain HTML. */
export const accessibilityAnalyzer: Analyzer = {
  id: 'accessibility',
  displayName: 'Accessibility',
  supportedExtensions: ['jsx', 'tsx', 'html'],

  analyze(filePath, content, _ctx: AnalyzerContext): DevGuardIssue[] {
    void _ctx;
    const issues: DevGuardIssue[] = [];

    if (filePath.endsWith('.html')) {
      return analyzeHtml(filePath, content);
    }

    const ast = safeParse(content, filePath);
    if (!ast) return issues;

    traverse(ast, {
      JSXOpeningElement(path) {
        const name = path.node.name.type === 'JSXIdentifier' ? path.node.name.name : '';
        const attrs = path.node.attributes
          .filter((a) => a.type === 'JSXAttribute')
          .map((a: any) => a.name?.name);
        const line = (path.node.loc?.start.line ?? 1) - 1;
        const column = path.node.loc?.start.column ?? 0;

        if (name === 'img' && !attrs.includes('alt')) {
          issues.push(issue(filePath, line, column, '<img> is missing an "alt" attribute — screen readers cannot describe this image.', 'devguard/img-alt'));
        }
        if ((name === 'button' || name === 'a') && attrs.length === 0) {
          // heuristic: interactive elements with no attributes at all often lack accessible names
        }
        if (name === 'input' && !attrs.includes('aria-label') && !attrs.includes('id')) {
          issues.push(issue(filePath, line, column, '<input> has no "id" (for a <label>) or "aria-label" — it may be unreadable by screen readers.', 'devguard/input-label'));
        }
        if (name === 'div' && attrs.includes('onClick') && !attrs.includes('role') && !attrs.includes('tabIndex')) {
          issues.push(issue(filePath, line, column, '<div onClick> is not keyboard-accessible. Add role="button" and tabIndex={0}, or use a <button>.', 'devguard/clickable-div'));
        }
      }
    });

    return issues;
  }
};

function analyzeHtml(filePath: string, content: string): DevGuardIssue[] {
  const issues: DevGuardIssue[] = [];
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/<img(?![^>]*\balt=)[^>]*>/.test(line)) {
      issues.push(issue(filePath, idx, 0, '<img> is missing an "alt" attribute.', 'devguard/img-alt'));
    }
    if (/<input(?![^>]*\b(id|aria-label)=)[^>]*>/.test(line)) {
      issues.push(issue(filePath, idx, 0, '<input> has no associated label or aria-label.', 'devguard/input-label'));
    }
  });
  return issues;
}

function issue(filePath: string, line: number, column: number, message: string, ruleId: string): DevGuardIssue {
  return {
    id: `accessibility:${filePath}:${line}:${ruleId}`,
    category: 'accessibility',
    severity: 'warning',
    message,
    filePath,
    line,
    column,
    ruleId
  };
}
