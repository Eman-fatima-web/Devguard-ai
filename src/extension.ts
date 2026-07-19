import * as vscode from 'vscode';
import { Analyzer, AnalyzerContext, DevGuardIssue } from './types';
import { findProjectFiles, readFileText } from './utils/fileScanner';
import { DiagnosticManager } from './diagnostics/diagnosticManager';
import { DashboardPanel } from './dashboard/dashboardPanel';
import { unusedCodeAnalyzer } from './analyzers/unusedCodeAnalyzer';
import { brokenImportsAnalyzer } from './analyzers/brokenImportsAnalyzer';
import { duplicateCodeAnalyzer, resetDuplicateRegistry } from './analyzers/duplicateCodeAnalyzer';
import { accessibilityAnalyzer } from './analyzers/accessibilityAnalyzer';
import { seoAnalyzer } from './analyzers/seoAnalyzer';
import { securityAnalyzer } from './analyzers/securityAnalyzer';
import { reactPerfAnalyzer } from './analyzers/reactPerfAnalyzer';
import { explainError } from './ai/errorExplainer';
import { askAI, isAIEnabled } from './ai/aiProvider';

const ALL_ANALYZERS: Analyzer[] = [
  unusedCodeAnalyzer,
  brokenImportsAnalyzer,
  duplicateCodeAnalyzer,
  accessibilityAnalyzer,
  seoAnalyzer,
  securityAnalyzer,
  reactPerfAnalyzer
];

let diagnosticManager: DiagnosticManager;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  diagnosticManager = new DiagnosticManager();
  outputChannel = vscode.window.createOutputChannel('DevGuard AI');
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'devguard.openDashboard';
  statusBarItem.text = '$(shield) DevGuard AI';
  statusBarItem.tooltip = 'Open DevGuard AI Project Health Dashboard';
  statusBarItem.show();

  context.subscriptions.push(
    diagnosticManager,
    statusBarItem,
    outputChannel,
    vscode.commands.registerCommand('devguard.scanProject', () => scanProject()),
    vscode.commands.registerCommand('devguard.scanCurrentFile', () => scanCurrentFile()),
    vscode.commands.registerCommand('devguard.openDashboard', () => openDashboard(context)),
    vscode.commands.registerCommand('devguard.explainError', () => explainSelectedError()),
    vscode.commands.registerCommand('devguard.suggestFix', () => suggestFixForSelection()),
    vscode.commands.registerCommand('devguard.generateDocs', () => generateDocsForFile()),
    vscode.commands.registerCommand('devguard.findUnusedFiles', () => scanProject(['unused-code'])),
    vscode.commands.registerCommand('devguard.findDuplicateCode', () => scanProject(['duplicate-code'])),
    vscode.workspace.onDidSaveTextDocument((doc) => scanSingleDocument(doc))
  );

  outputChannel.appendLine('DevGuard AI activated. Offline static analysis is ready.');
}

export function deactivate(): void {
  diagnosticManager?.dispose();
}

function getIgnorePatterns(): string[] {
  return vscode.workspace.getConfiguration('devguard').get<string[]>('analysis.ignorePatterns', ['node_modules', 'dist', 'build', '.next']);
}

async function scanProject(onlyCategories?: string[]): Promise<void> {
  const ignorePatterns = getIgnorePatterns();
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  const ctx: AnalyzerContext = { ignorePatterns, workspaceRoot };

  resetDuplicateRegistry();
  diagnosticManager.clearAll();

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'DevGuard AI: Scanning project...', cancellable: false },
    async (progress) => {
      const files = await findProjectFiles(ignorePatterns);
      let processed = 0;

      for (const fileUri of files) {
        const content = await readFileText(fileUri);
        const issues = runAnalyzers(fileUri.fsPath, content, ctx, onlyCategories);
        if (issues.length > 0) {
          diagnosticManager.setIssuesForFile(fileUri.fsPath, issues);
        }
        processed++;
        if (processed % 25 === 0) {
          progress.report({ message: `${processed}/${files.length} files`, increment: (25 / files.length) * 100 });
        }
      }

      vscode.window.showInformationMessage(
        `DevGuard AI: Scanned ${files.length} files, found ${diagnosticManager.getSummary().totalIssues} issues.`
      );
    }
  );
}

async function scanCurrentFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('DevGuard AI: No active file to scan.');
    return;
  }
  await scanSingleDocument(editor.document);
  vscode.window.showInformationMessage('DevGuard AI: Current file scanned.');
}

async function scanSingleDocument(doc: vscode.TextDocument): Promise<void> {
  const supportedExt = ['js', 'jsx', 'ts', 'tsx', 'css', 'html'];
  const ext = doc.fileName.split('.').pop() ?? '';
  if (!supportedExt.includes(ext)) return;

  const ctx: AnalyzerContext = { ignorePatterns: getIgnorePatterns(), workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '' };
  const issues = runAnalyzers(doc.fileName, doc.getText(), ctx);
  diagnosticManager.setIssuesForFile(doc.fileName, issues);
}

function runAnalyzers(filePath: string, content: string, ctx: AnalyzerContext, onlyCategories?: string[]): DevGuardIssue[] {
  const ext = filePath.split('.').pop() ?? '';
  const issues: DevGuardIssue[] = [];

  for (const analyzer of ALL_ANALYZERS) {
    if (onlyCategories && !onlyCategories.includes(analyzer.id)) continue;
    if (!analyzer.supportedExtensions.includes(ext)) continue;
    try {
      issues.push(...analyzer.analyze(filePath, content, ctx));
    } catch (err) {
      outputChannel.appendLine(`Analyzer "${analyzer.id}" failed on ${filePath}: ${err}`);
    }
  }
  return issues;
}

function openDashboard(context: vscode.ExtensionContext): void {
  DashboardPanel.show(context, diagnosticManager, () => scanProject());
}

async function explainSelectedError(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const selectedText = editor?.document.getText(editor.selection);
  const errorText = selectedText || (await vscode.window.showInputBox({ prompt: 'Paste the error message you want explained' }));
  if (!errorText) return;

  const result = await explainError(errorText);
  outputChannel.appendLine(`\n--- Error Explanation (${result.source}) ---\n${result.explanation}`);
  outputChannel.show(true);
  vscode.window.showInformationMessage(result.explanation.slice(0, 140) + (result.explanation.length > 140 ? '…' : ''));
}

async function suggestFixForSelection(): Promise<void> {
  if (!isAIEnabled()) {
    vscode.window.showWarningMessage('DevGuard AI: Enable AI features in Settings (devguard.ai.enabled + API key) to use AI fix suggestions.');
    return;
  }
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('DevGuard AI: Select the code you want a fix suggestion for.');
    return;
  }

  const code = editor.document.getText(editor.selection);
  const prompt = `Suggest a concrete fix for this code. Return only the corrected code block plus a one-line explanation.\n\n${code}`;
  const suggestion = await askAI(prompt);
  outputChannel.appendLine(`\n--- AI Fix Suggestion ---\n${suggestion}`);
  outputChannel.show(true);
}

async function generateDocsForFile(): Promise<void> {
  if (!isAIEnabled()) {
    vscode.window.showWarningMessage('DevGuard AI: Enable AI features in Settings to use auto-documentation generation.');
    return;
  }
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const code = editor.document.getText();
  const prompt = `Generate concise JSDoc/TSDoc-style documentation comments for the exported functions/components in this file. Return only the documented code.\n\n${code}`;
  const documented = await askAI(prompt);
  outputChannel.appendLine(`\n--- Generated Documentation ---\n${documented}`);
  outputChannel.show(true);
}
