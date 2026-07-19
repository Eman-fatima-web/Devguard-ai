# DevGuard AI — Architecture, MVP Plan & Roadmap

## 1. Architecture Overview

```
                     ┌─────────────────────┐
                     │   extension.ts       │  activation, commands, status bar
                     └──────────┬───────────┘
                                │
         ┌──────────────────────┼───────────────────────┐
         ▼                      ▼                        ▼
 ┌───────────────┐     ┌────────────────┐        ┌───────────────┐
 │  Analyzers      │     │ DiagnosticMgr   │        │ Dashboard Panel│
 │  (offline, AST) │────▶│ (VS Code API)   │        │ (Webview UI)   │
 └───────────────┘     └────────────────┘        └───────────────┘
         │
         ▼
 ┌───────────────┐
 │  AI Provider    │  (only called by explain/suggest/generateDocs commands)
 │  (Anthropic/    │
 │   OpenAI, BYO   │
 │   key)          │
 └───────────────┘
```

**Design principle:** analyzers never call the network. Only the three explicitly-AI commands (`explainError`, `suggestFix`, `generateDocs`) touch `aiProvider.ts`, and only when the user has opted in. This keeps the core product fast, free, and privacy-respecting, and makes the AI layer feel like a deliberate upgrade rather than a dependency.

## 2. Folder Structure

```
devguard-ai/
├── src/
│   ├── extension.ts              # entry point: activation, command wiring
│   ├── types/index.ts            # shared interfaces (Issue, Analyzer, Summary)
│   ├── analyzers/                # one file per detection category, all pure functions
│   ├── ai/                       # aiProvider.ts (network), errorExplainer.ts (offline table + AI fallback)
│   ├── diagnostics/              # wraps VS Code's Diagnostics API + health scoring
│   ├── dashboard/                # Webview HTML + panel controller
│   └── utils/                    # AST parsing helpers, file scanning
├── media/                        # icons, dashboard assets
├── docs/                         # this roadmap, publishing guide, branding
├── package.json                  # extension manifest (commands, config, activation)
└── tsconfig.json / esbuild build
```

## 3. MVP Plan (v0.1 — what's in this scaffold)

- [x] Project scaffold, manifest, build pipeline (esbuild)
- [x] 7 offline analyzers: unused/dead code, broken imports, duplicate code, accessibility, SEO, security, React performance
- [x] Diagnostics rendered as native VS Code squiggles + Problems panel
- [x] Project Health Dashboard webview with theme-aware styling
- [x] AI layer: error explanation (offline pattern table + optional AI fallback), fix suggestion, doc generation — all BYO-key, opt-in
- [x] Status bar entry point
- [x] Configurable ignore patterns and severities

**Definition of done for MVP:** a developer can install the extension, run one command, and get accurate, actionable diagnostics on a real React/Next.js project without ever touching an API key.

## 4. Feature Roadmap (post-MVP)

**v0.2 — Accuracy & coverage**
- Real cross-file "unused file" detection (currently per-file symbol usage; extend to whole-project asset graph using `extractAssetReferences`)
- CSS-specific analyzer: unused selectors (cross-reference against JSX/HTML class usage)
- Respect `.gitignore` automatically in addition to configured ignore patterns
- Quick Fix (Code Action) providers so several rules can be auto-fixed with one click

**v0.3 — Deeper React/Next.js support**
- Server Component vs Client Component boundary checks (Next.js App Router)
- Bundle-size-aware import warnings (e.g., importing all of `lodash` instead of `lodash/debounce`)
- `next/image` vs raw `<img>` suggestions

**v0.4 — Team features**
- Shareable `devguard.config.json` so teams enforce the same severity levels
- CI mode: `devguard-ai --ci` for a GitHub Actions check that fails a PR above an issue threshold
- Historical health-score tracking (trend chart in the dashboard)

**v1.0 — Polish & marketplace growth**
- Sidebar tree view of issues grouped by file/category (currently dashboard-only)
- Inline "Explain with AI" CodeLens on diagnostics
- Multi-language support beyond the JS/TS/web stack (stretch goal)

## 5. UI/UX Notes

- All dashboard colors use VS Code's `--vscode-*` CSS variables — zero hardcoded hex values — so Dark, Light, and High Contrast themes are supported automatically with no extra work.
- Health score uses a simple, explainable weighting (errors ×5, warnings ×2, info ×0.5) rather than a black-box formula, so users can trust and reason about the number.
- AI-powered commands are visually and functionally separated (they show a clear warning if AI isn't enabled) so the product never feels like it silently "phones home."
