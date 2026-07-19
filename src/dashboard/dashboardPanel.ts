import * as vscode from 'vscode';
import { DiagnosticManager } from '../diagnostics/diagnosticManager';
import { renderDashboard } from './dashboardHtml';

export class DashboardPanel {
  private static current: DashboardPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  static show(context: vscode.ExtensionContext, diagnostics: DiagnosticManager, onRescan: () => Promise<void>): void {
    if (DashboardPanel.current) {
      DashboardPanel.current.panel.reveal();
      DashboardPanel.current.refresh(diagnostics);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'devguardDashboard',
      'DevGuard AI — Project Health',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    DashboardPanel.current = new DashboardPanel(panel, diagnostics, onRescan);
  }

  private constructor(panel: vscode.WebviewPanel, diagnostics: DiagnosticManager, onRescan: () => Promise<void>) {
    this.panel = panel;
    this.refresh(diagnostics);

    this.panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'rescan') {
        await onRescan();
        this.refresh(diagnostics);
      }
    }, null, this.disposables);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  refresh(diagnostics: DiagnosticManager): void {
    this.panel.webview.html = renderDashboard(diagnostics.getSummary());
  }

  private dispose(): void {
    DashboardPanel.current = undefined;
    this.disposables.forEach((d) => d.dispose());
    this.panel.dispose();
  }
}
