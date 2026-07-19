import * as vscode from 'vscode';

const CODE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'html'];

/**
 * Finds all relevant project files, honoring the user's configured
 * ignore patterns (node_modules, dist, .next, etc.) in addition to
 * .gitignore-style excludes VS Code already applies to findFiles.
 */
export async function findProjectFiles(ignorePatterns: string[]): Promise<vscode.Uri[]> {
  const includeGlob = `**/*.{${CODE_EXTENSIONS.join(',')}}`;
  const excludeGlob = `{${ignorePatterns.map((p) => `**/${p}/**`).join(',')}}`;
  return vscode.workspace.findFiles(includeGlob, excludeGlob, 5000);
}

export async function readFileText(uri: vscode.Uri): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(bytes).toString('utf-8');
}

/** Collects every asset reference (url(...), src=, href=, import) across the project for unused-file detection. */
export function extractAssetReferences(content: string): string[] {
  const refs: string[] = [];
  const patterns = [
    /url\((['"]?)([^'")]+)\1\)/g,        // CSS url()
    /(?:src|href)=["']([^"']+)["']/g,     // HTML/JSX src, href
    /import\s+(?:.+\s+from\s+)?["']([^"']+)["']/g, // JS/TS imports
    /require\(["']([^"']+)["']\)/g        // CommonJS require
  ];
  for (const re of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      refs.push(match[2] ?? match[1]);
    }
  }
  return refs;
}
