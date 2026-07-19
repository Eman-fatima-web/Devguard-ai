import traverse from '@babel/traverse';
import { Analyzer, AnalyzerContext, DevGuardIssue } from '../types';
import { safeParse } from '../utils/astUtils';

const SECRET_PATTERNS: { test: RegExp; label: string }[] = [
  { test: /(['"])(?:sk|pk)_(live|test)_[A-Za-z0-9]{10,}\1/, label: 'Stripe API key' },
  { test: /AKIA[0-9A-Z]{16}/, label: 'AWS access key ID' },
  { test: /(['"])AIza[0-9A-Za-z\-_]{35}\1/, label: 'Google API key' },
  { test: /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/, label: 'private key' }
];

/** Flags common client-side security anti-patterns and hardcoded secrets. */
export const securityAnalyzer: Analyzer = {
  id: 'security',
  displayName: 'Security',
  supportedExtensions: ['js', 'jsx', 'ts', 'tsx'],

  analyze(filePath, content, _ctx: AnalyzerContext): DevGuardIssue[] {
    void _ctx;
    const issues: DevGuardIssue[] = [];

    // Line-based secret scanning (fast, catches strings AST checks might structure differently)
    content.split('\n').forEach((line, idx) => {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test.test(line)) {
          issues.push({
            id: `security:${filePath}:${idx}:secret`,
            category: 'security',
            severity: 'error',
            message: `Possible hardcoded ${pattern.label} found in source. Move secrets to environment variables (.env) and add them to .gitignore.`,
            filePath,
            line: idx,
            column: 0,
            ruleId: 'devguard/no-hardcoded-secret'
          });
        }
      }
    });

    const ast = safeParse(content, filePath);
    if (!ast) return issues;

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        if (callee.type === 'Identifier' && callee.name === 'eval') {
          issues.push(loc(filePath, path.node, 'Use of eval() is a major security risk (arbitrary code execution). Avoid it entirely.', 'devguard/no-eval'));
        }
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'exec' &&
          callee.object.type === 'Identifier' &&
          /child_process|exec/i.test(callee.object.name)
        ) {
          issues.push(loc(filePath, path.node, 'Executing shell commands with dynamic input can enable command injection. Validate/sanitize all inputs.', 'devguard/no-unsafe-exec'));
        }
      },
      JSXAttribute(path) {
        if (path.node.name.name === 'dangerouslySetInnerHTML') {
          issues.push(loc(filePath, path.node, 'dangerouslySetInnerHTML can expose your app to XSS if the content isn\'t sanitized. Use a sanitizer like DOMPurify.', 'devguard/no-unsafe-innerhtml'));
        }
      }
    });

    return issues;
  }
};

function loc(filePath: string, node: any, message: string, ruleId: string): DevGuardIssue {
  return {
    id: `security:${filePath}:${node.loc?.start.line}:${ruleId}`,
    category: 'security',
    severity: 'error',
    message,
    filePath,
    line: (node.loc?.start.line ?? 1) - 1,
    column: node.loc?.start.column ?? 0,
    ruleId
  };
}
