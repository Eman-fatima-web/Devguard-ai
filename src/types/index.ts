export type IssueCategory =
  | 'unused-code'
  | 'broken-import'
  | 'dead-code'
  | 'duplicate-code'
  | 'react-performance'
  | 'accessibility'
  | 'seo'
  | 'security';

export type IssueSeverity = 'error' | 'warning' | 'information' | 'hint';

export interface DevGuardIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  filePath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  suggestion?: string;
  ruleId: string;
}

export interface FileScanResult {
  filePath: string;
  issues: DevGuardIssue[];
}

export interface ProjectHealthSummary {
  totalFiles: number;
  totalIssues: number;
  issuesByCategory: Record<IssueCategory, number>;
  issuesBySeverity: Record<IssueSeverity, number>;
  healthScore: number; // 0-100
  lastScanTimestamp: number;
}

export interface AnalyzerContext {
  ignorePatterns: string[];
  workspaceRoot: string;
}

export interface Analyzer {
  id: IssueCategory;
  displayName: string;
  supportedExtensions: string[];
  analyze(filePath: string, content: string, ctx: AnalyzerContext): DevGuardIssue[];
}
