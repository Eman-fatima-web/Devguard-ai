# DevGuard AI

**A code health & performance guardian for VS Code — offline-first, AI-optional.**

DevGuard AI scans HTML/CSS/JavaScript/TypeScript/React/Next.js/MERN projects for the problems that quietly pile up in every real codebase: unused files, broken imports, dead code, duplicated logic, React performance traps, missing accessibility attributes, basic SEO gaps, and common security mistakes — all via fast, local static analysis. AI is used only for the features that genuinely need it (explaining errors, suggesting fixes, generating docs), and only when you turn it on with your own API key.

## Why DevGuard AI

Most "AI coding assistant" extensions are chat wrappers. DevGuard AI is a **linter + dashboard first, AI second**:

- Works completely offline by default — nothing about your code is sent anywhere
- AI features are opt-in, BYO API key (Anthropic or OpenAI), and used only for the 3 commands that need judgment rather than pattern-matching
- Built for the modern web stack specifically — React re-render traps, Next.js hydration issues, JSX accessibility — not generic "any language" linting

## Features

| Category | What it catches |
|---|---|
| Unused & Dead Code | Unreferenced variables/imports/functions, unreachable code after `return`/`throw` |
| Broken Imports | Relative imports/requires pointing at files that don't exist |
| Duplicate Code | Structurally similar code blocks (6+ lines) across your whole project |
| React Performance | Inline function/object props, missing `useEffect`/`useMemo` deps, index-as-key |
| Accessibility | Missing `alt`, unlabeled inputs, non-keyboard-accessible clickable `div`s |
| SEO | Missing `<title>`, meta description, `<h1>`, Open Graph tags |
| Security | Hardcoded API keys/secrets, `eval()`, unsanitized `dangerouslySetInnerHTML` |
| AI (optional) | Plain-English error explanations, fix suggestions, auto-generated doc comments |

## Getting Started

1. Install dependencies: `npm install`
2. Build the extension: `npm run build`
3. Open the folder in VS Code and press `F5` to launch the Extension Development Host
4. Open a JS/TS/React/Next.js project in that window
5. Run **DevGuard AI: Scan Entire Project** from the Command Palette (`Cmd/Ctrl+Shift+P`)
6. Open **DevGuard AI: Open Project Health Dashboard** to see your health score

To enable AI features, open Settings and search "DevGuard AI":
- `devguard.ai.enabled`: `true`
- `devguard.ai.provider`: `anthropic` or `openai`
- `devguard.ai.apiKey`: your own key (never sent anywhere but the provider you chose)

## Local Development

- `npm install`
- `npm run build`
- `npm run lint`
- `npm run package` to create a `.vsix` bundle for manual installation

## Publishing

- Update the publisher identity in [package.json](package.json) to your Marketplace publisher
- Set a `VSCE_PAT` secret in GitHub Actions if you want automated publishing
- See [docs/PUBLISHING.md](docs/PUBLISHING.md) for the full release checklist

## Commands

- `DevGuard AI: Scan Entire Project`
- `DevGuard AI: Scan Current File`
- `DevGuard AI: Open Project Health Dashboard`
- `DevGuard AI: Explain This Error in Simple English`
- `DevGuard AI: Suggest AI Fix` *(requires AI enabled)*
- `DevGuard AI: Generate Documentation for This File` *(requires AI enabled)*
- `DevGuard AI: Find Unused CSS / JS / Images / Files`
- `DevGuard AI: Find Duplicate Code`

## Architecture

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full architecture breakdown, MVP scope, and feature roadmap.

## Contributing

Issues and PRs welcome. Run `npm install && npm run watch` to develop locally, then press `F5` to launch an Extension Development Host.

## License

MIT — see [LICENSE](LICENSE).
