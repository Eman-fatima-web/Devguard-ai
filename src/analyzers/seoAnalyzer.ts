import { Analyzer, AnalyzerContext, DevGuardIssue } from '../types';

/**
 * Static SEO checks for HTML files and Next.js page/head content.
 * Deliberately simple regex checks — SEO tags are structural markup,
 * not logic, so a full AST isn't needed here.
 */
export const seoAnalyzer: Analyzer = {
  id: 'seo',
  displayName: 'SEO',
  supportedExtensions: ['html', 'jsx', 'tsx'],

  analyze(filePath, content, _ctx: AnalyzerContext): DevGuardIssue[] {
    void _ctx;
    const issues: DevGuardIssue[] = [];
    const isLikelyPage = filePath.endsWith('.html') || /\/(page|pages)\//.test(filePath) || /<Head>/.test(content);

    if (!isLikelyPage) return issues;

    const checks: { test: RegExp; message: string; ruleId: string }[] = [
      { test: /<title>[\s\S]*?<\/title>|<title[^>]*\/>/, message: 'Missing <title> tag — every page needs a unique, descriptive title for search engines.', ruleId: 'devguard/seo-title' },
      { test: /name=["']description["']/, message: 'Missing meta description — this affects how your page appears in search results.', ruleId: 'devguard/seo-meta-description' },
      { test: /<h1[\s>]/, message: 'Missing <h1> tag — pages should have exactly one top-level heading for SEO and accessibility.', ruleId: 'devguard/seo-h1' },
      { test: /property=["']og:/, message: 'Missing Open Graph tags (og:title, og:image, etc.) — links will look plain when shared on social media.', ruleId: 'devguard/seo-og' }
    ];

    for (const check of checks) {
      if (!check.test.test(content)) {
        issues.push({
          id: `seo:${filePath}:${check.ruleId}`,
          category: 'seo',
          severity: 'information',
          message: check.message,
          filePath,
          line: 0,
          column: 0,
          ruleId: check.ruleId
        });
      }
    }

    return issues;
  }
};
