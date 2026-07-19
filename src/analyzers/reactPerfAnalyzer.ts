import traverse from '@babel/traverse';
import { Analyzer, AnalyzerContext, DevGuardIssue } from '../types';
import { safeParse } from '../utils/astUtils';

/**
 * Flags common React/Next.js render-performance footguns:
 *  - inline arrow/anonymous functions passed as JSX props (breaks memoization)
 *  - inline object/array literals passed as JSX props (new reference every render)
 *  - missing dependency arrays on useEffect/useMemo/useCallback
 *  - array index used as a list `key`
 */
export const reactPerfAnalyzer: Analyzer = {
  id: 'react-performance',
  displayName: 'React Performance',
  supportedExtensions: ['jsx', 'tsx'],

  analyze(filePath, content, _ctx: AnalyzerContext): DevGuardIssue[] {
    void _ctx;
    const ast = safeParse(content, filePath);
    if (!ast) return [];
    const issues: DevGuardIssue[] = [];

    traverse(ast, {
      JSXAttribute(path) {
        const value = path.node.value;
        if (value?.type === 'JSXExpressionContainer') {
          const expr = value.expression;
          const name = path.node.name.name;
          if (name === 'key' && expr.type === 'Identifier' && /^(i|idx|index)$/i.test(expr.name)) {
            issues.push(perf(filePath, path.node, 'Using the array index as a "key" can cause subtle bugs and wasted re-renders when the list reorders. Prefer a stable unique id.', 'devguard/no-index-key'));
          } else if ((expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') && typeof name === 'string' && name.startsWith('on')) {
            issues.push(perf(filePath, path.node, `Inline function passed to "${name}" creates a new reference every render, which can defeat React.memo on this component. Consider useCallback.`, 'devguard/no-inline-function-prop'));
          } else if (expr.type === 'ObjectExpression' || expr.type === 'ArrayExpression') {
            issues.push(perf(filePath, path.node, `Inline object/array literal passed as a prop creates a new reference every render. Consider useMemo or hoisting it outside the component.`, 'devguard/no-inline-object-prop'));
          }
        }
      },
      CallExpression(path) {
        const callee = path.node.callee;
        if (callee.type === 'Identifier' && ['useEffect', 'useMemo', 'useCallback'].includes(callee.name)) {
          if (path.node.arguments.length < 2) {
            issues.push(perf(filePath, path.node, `${callee.name}() is missing a dependency array — it will run on every render.`, 'devguard/missing-deps-array'));
          }
        }
      }
    });

    return issues;
  }
};

function perf(filePath: string, node: any, message: string, ruleId: string): DevGuardIssue {
  return {
    id: `react-performance:${filePath}:${node.loc?.start.line}:${ruleId}`,
    category: 'react-performance',
    severity: 'warning',
    message,
    filePath,
    line: (node.loc?.start.line ?? 1) - 1,
    column: node.loc?.start.column ?? 0,
    ruleId
  };
}
