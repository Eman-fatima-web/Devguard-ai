import traverse from '@babel/traverse';
import { Analyzer, AnalyzerContext, DevGuardIssue } from '../types';
import { safeParse } from '../utils/astUtils';

/**
 * Detects:
 *  - declared-but-never-referenced variables, functions, and imports (unused code)
 *  - unreachable code after return/throw/break/continue (dead code)
 */
export const unusedCodeAnalyzer: Analyzer = {
  id: 'unused-code',
  displayName: 'Unused & Dead Code',
  supportedExtensions: ['js', 'jsx', 'ts', 'tsx'],

  analyze(filePath, content, _ctx: AnalyzerContext): DevGuardIssue[] {
    void _ctx;
    const ast = safeParse(content, filePath);
    if (!ast) return [];

    const issues: DevGuardIssue[] = [];
    const declared = new Map<string, { line: number; column: number }>();
    const used = new Set<string>();

    traverse(ast, {
      ImportSpecifier(path) {
        declared.set(path.node.local.name, loc(path.node));
      },
      ImportDefaultSpecifier(path) {
        declared.set(path.node.local.name, loc(path.node));
      },
      VariableDeclarator(path) {
        if (path.node.id.type === 'Identifier') {
          declared.set(path.node.id.name, loc(path.node));
        }
      },
      FunctionDeclaration(path) {
        if (path.node.id) declared.set(path.node.id.name, loc(path.node));
      },
      Identifier(path) {
        // Referencing usage, excluding the declaration site itself
        if (!path.parentPath.isVariableDeclarator({ id: path.node }) &&
            !path.parentPath.isImportSpecifier() &&
            !path.parentPath.isImportDefaultSpecifier() &&
            !path.parentPath.isFunctionDeclaration({ id: path.node })) {
          used.add(path.node.name);
        }
      },
      // Unreachable / dead code: anything after a terminating statement in the same block
      BlockStatement(path) {
        const body = path.node.body;
        for (let i = 0; i < body.length; i++) {
          const stmt = body[i];
          const isTerminator =
            stmt.type === 'ReturnStatement' ||
            stmt.type === 'ThrowStatement' ||
            stmt.type === 'BreakStatement' ||
            stmt.type === 'ContinueStatement';
          if (isTerminator && i < body.length - 1) {
            const next = body[i + 1];
            issues.push({
              id: `dead-code:${filePath}:${next.loc?.start.line}`,
              category: 'dead-code',
              severity: 'warning',
              message: 'Unreachable code detected after a return/throw/break/continue statement.',
              filePath,
              line: (next.loc?.start.line ?? 1) - 1,
              column: next.loc?.start.column ?? 0,
              ruleId: 'devguard/no-unreachable'
            });
            break; // only flag once per block
          }
        }
      }
    });

    for (const [name, position] of declared) {
      // A name used more than 0 times beyond its own declaration counts as used.
      // Since `used` includes every identifier occurrence, a declared name that
      // never shows up anywhere else in the file is genuinely unused.
      const occurrences = (content.match(new RegExp(`\\b${escapeRegex(name)}\\b`, 'g')) || []).length;
      if (occurrences <= 1 && !name.startsWith('_')) {
        issues.push({
          id: `unused-code:${filePath}:${name}`,
          category: 'unused-code',
          severity: 'warning',
          message: `'${name}' is declared but never used.`,
          filePath,
          line: position.line - 1,
          column: position.column,
          suggestion: `Remove the unused declaration, or prefix it with an underscore ('_${name}') if it's intentionally unused.`,
          ruleId: 'devguard/no-unused-declaration'
        });
      }
    }

    return issues;
  }
};

function loc(node: any): { line: number; column: number } {
  return { line: node.loc?.start.line ?? 1, column: node.loc?.start.column ?? 0 };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
