import { ProjectHealthSummary } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  'unused-code': 'Unused Code',
  'broken-import': 'Broken Imports',
  'dead-code': 'Dead Code',
  'duplicate-code': 'Duplicate Code',
  'react-performance': 'React Performance',
  'accessibility': 'Accessibility',
  'seo': 'SEO',
  'security': 'Security'
};

/**
 * Renders the dashboard using VS Code's built-in CSS variables
 * (--vscode-*) instead of hardcoded colors, so it automatically
 * matches the user's active Dark/Light/High-Contrast theme.
 */
export function renderDashboard(summary: ProjectHealthSummary): string {
  const rows = Object.entries(summary.issuesByCategory)
    .map(([cat, count]) => `
      <div class="row">
        <span class="label">${CATEGORY_LABELS[cat] ?? cat}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, count * 8)}%"></div></div>
        <span class="count">${count}</span>
      </div>`)
    .join('');

  const scoreColor = summary.healthScore >= 80 ? 'var(--vscode-testing-iconPassed, #3fb950)'
    : summary.healthScore >= 50 ? 'var(--vscode-editorWarning-foreground, #e2a33d)'
    : 'var(--vscode-editorError-foreground, #f14c4c)';

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  body {
    font-family: var(--vscode-font-family, sans-serif);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 24px;
  }
  h1 { font-size: 1.4em; margin-bottom: 4px; }
  .subtitle { color: var(--vscode-descriptionForeground); margin-bottom: 24px; }
  .score-card {
    display: flex; align-items: center; gap: 20px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 10px; padding: 20px; margin-bottom: 28px;
  }
  .score-number { font-size: 3em; font-weight: 700; color: ${scoreColor}; }
  .score-meta { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
  .stat-grid { display: flex; gap: 16px; margin-bottom: 28px; }
  .stat {
    flex: 1; background: var(--vscode-editorWidget-background);
    border-radius: 8px; padding: 14px; text-align: center;
    border: 1px solid var(--vscode-widget-border, transparent);
  }
  .stat .num { font-size: 1.6em; font-weight: 700; }
  .stat.error .num { color: var(--vscode-editorError-foreground, #f14c4c); }
  .stat.warning .num { color: var(--vscode-editorWarning-foreground, #e2a33d); }
  .row { display: flex; align-items: center; gap: 12px; margin: 10px 0; }
  .label { width: 150px; font-size: 0.9em; }
  .bar-track { flex: 1; height: 8px; background: var(--vscode-progressBar-background, #333); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; background: var(--vscode-button-background, #0e639c); }
  .count { width: 30px; text-align: right; font-variant-numeric: tabular-nums; }
  button {
    background: var(--vscode-button-background); color: var(--vscode-button-foreground);
    border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 20px;
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
</style>
</head>
<body>
  <h1>DevGuard AI — Project Health</h1>
  <div class="subtitle">Last scanned ${new Date(summary.lastScanTimestamp).toLocaleString()} · ${summary.totalFiles} files scanned</div>

  <div class="score-card">
    <div class="score-number">${summary.healthScore}</div>
    <div class="score-meta">Health Score out of 100<br/>Based on error/warning/info weighting across the project</div>
  </div>

  <div class="stat-grid">
    <div class="stat error"><div class="num">${summary.issuesBySeverity.error}</div><div>Errors</div></div>
    <div class="stat warning"><div class="num">${summary.issuesBySeverity.warning}</div><div>Warnings</div></div>
    <div class="stat"><div class="num">${summary.issuesBySeverity.information}</div><div>Info</div></div>
    <div class="stat"><div class="num">${summary.totalIssues}</div><div>Total Issues</div></div>
  </div>

  <h3>Issues by Category</h3>
  ${rows}

  <button onclick="rescan()">Re-scan Project</button>

  <script>
    const vscode = acquireVsCodeApi();
    function rescan() { vscode.postMessage({ command: 'rescan' }); }
  </script>
</body>
</html>`;
}
