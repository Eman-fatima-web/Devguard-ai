import * as parser from '@babel/parser';
import type { File } from '@babel/types';

/**
 * Parses JS/TS/JSX/TSX source into a Babel AST.
 * Returns null on syntax errors instead of throwing, so a single
 * broken file never crashes a full-project scan.
 */
export function safeParse(content: string, filePath: string): File | null {
  const isTS = /\.tsx?$/.test(filePath);
  const isJSX = /\.[jt]sx$/.test(filePath) || content.includes('React');

  try {
    return parser.parse(content, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      errorRecovery: true,
      plugins: [
        isTS ? 'typescript' : 'flow',
        isJSX ? 'jsx' : undefined,
        'classProperties',
        'decorators-legacy',
        'objectRestSpread',
        'optionalChaining',
        'nullishCoalescingOperator',
        'dynamicImport'
      ].filter(Boolean) as parser.ParserPlugin[]
    });
  } catch {
    return null;
  }
}

/** Normalizes a code snippet for structural duplicate-detection hashing. */
export function normalizeForHash(snippet: string): string {
  return snippet
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/'[^']*'|"[^"]*"|`[^`]*`/g, 'STR')
    .replace(/\b\d+(\.\d+)?\b/g, 'NUM')
    .trim();
}

/** djb2 string hash — fast, good enough for duplicate-block fingerprints. */
export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
