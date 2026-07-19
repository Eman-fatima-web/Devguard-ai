import * as vscode from 'vscode';
import { DevGuardIssue, IssueSeverity, ProjectHealthSummary, IssueCategory } from '../types';

const SEVERITY_MAP: Record<IssueSeverity, vscode.DiagnosticSeverity> = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  information: vscode.DiagnosticSeverity.Information,
  hint: vscode.DiagnosticSeverity.Hint
};

const EMPTY_CATEGORY_MAP: Record<IssueCategory, number> = {
  'unused-code': 0, 'broken-import': 0, 'dead-code': 0, 'duplicate-code': 0,
  'react-performance': 0, 'accessibility': 0, 'seo': 0, 'security': 0
};

export class DiagnosticManager {
  private collection: vscode.DiagnosticCollection;
  private issuesByFile = new Map<string, DevGuardIssue[]>();

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('devguard-ai');
  }

  setIssuesForFile(filePath: string, issues: DevGuardIssue[]): void {
    this.issuesByFile.set(filePath, issues);
    const uri = vscode.Uri.file(filePath);
    const diagnostics = issues.map((issue) => this.toDiagnostic(issue));
    this.collection.set(uri, diagnostics);
  }

  clearFile(filePath: string): void {
    this.issuesByFile.delete(filePath);
    this.collection.delete(vscode.Uri.file(filePath));
  }

  clearAll(): void {
    this.issuesByFile.clear();
    this.collection.clear();
  }

  getSummary(): ProjectHealthSummary {
    const bySeverity: Record<IssueSeverity, number> = { error: 0, warning: 0, information: 0, hint: 0 };
    const byCategory: Record<IssueCategory, number> = { ...EMPTY_CATEGORY_MAP };
    let total = 0;

    for (const issues of this.issuesByFile.values()) {
      for (const issue of issues) {
        bySeverity[issue.severity]++;
        byCategory[issue.category]++;
        total++;
      }
    }

    // Simple weighted score: errors hurt more than warnings, which hurt more than info.
    const penalty = bySeverity.error * 5 + bySeverity.warning * 2 + bySeverity.information * 0.5;
    const healthScore = Math.max(0, Math.round(100 - penalty));

    return {
      totalFiles: this.issuesByFile.size,
      totalIssues: total,
      issuesByCategory: byCategory,
      issuesBySeverity: bySeverity,
      healthScore,
      lastScanTimestamp: Date.now()
    };
  }

  getAllIssues(): DevGuardIssue[] {
    return [...this.issuesByFile.values()].flat();
  }

  dispose(): void {
    this.collection.dispose();
  }

  private toDiagnostic(issue: DevGuardIssue): vscode.Diagnostic {
    const range = new vscode.Range(
      new vscode.Position(Math.max(0, issue.line), Math.max(0, issue.column)),
      new vscode.Position(Math.max(0, issue.endLine ?? issue.line), Math.max(0, issue.endColumn ?? issue.column + 1))
    );
    const diagnostic = new vscode.Diagnostic(range, issue.message, SEVERITY_MAP[issue.severity]);
    diagnostic.source = `DevGuard AI (${issue.category})`;
    diagnostic.code = issue.ruleId;
    return diagnostic;
  }
}
