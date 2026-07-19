import * as path from 'path';
import * as fs from 'fs';
import traverse from '@babel/traverse';
import { Analyzer, AnalyzerContext, DevGuardIssue } from '../types';
import { safeParse } from '../utils/astUtils';

const RESOLVABLE_EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

/** Flags relative imports/requires that point to a file which does not exist on disk. */
export const brokenImportsAnalyzer: Analyzer = {
  id: 'broken-import',
  displayName: 'Broken Imports & Missing Modules',
  supportedExtensions: ['js', 'jsx', 'ts', 'tsx'],

  analyze(filePath, content, _ctx: AnalyzerContext): DevGuardIssue[] {
    void _ctx;
    const ast = safeParse(content, filePath);
    if (!ast) return [];

    const issues: DevGuardIssue[] = [];
    const dir = path.dirname(filePath);

    const checkSource = (source: string, line: number, column: number) => {
      // Only check relative imports — package imports need node_modules resolution,
      // which is handled separately (and is less actionable to flag statically).
      if (!source.startsWith('.')) return;

      const resolved = path.resolve(dir, source);
      const exists = RESOLVABLE_EXTENSIONS.some((ext) => fs.existsSync(resolved + ext));

      if (!exists) {
        issues.push({
          id: `broken-import:${filePath}:${line}:${source}`,
          category: 'broken-import',
          severity: 'error',
          message: `Cannot resolve module '${source}'. The file does not exist at the expected path.`,
          filePath,
          line: line - 1,
          column,
          suggestion: 'Check for a typo in the path, a renamed/moved file, or a missing file extension.',
          ruleId: 'devguard/no-broken-import'
        });
      }
    };

    traverse(ast, {
      ImportDeclaration(p) {
        checkSource(p.node.source.value, p.node.loc?.start.line ?? 1, p.node.loc?.start.column ?? 0);
      },
      CallExpression(p) {
        const callee = p.node.callee;
        const isRequire = callee.type === 'Identifier' && callee.name === 'require';
        const isDynamicImport = callee.type === 'Import';
        if ((isRequire || isDynamicImport) && p.node.arguments[0]?.type === 'StringLiteral') {
          checkSource(p.node.arguments[0].value, p.node.loc?.start.line ?? 1, p.node.loc?.start.column ?? 0);
        }
      }
    });

    return issues;
  }
};
