# Publishing & Installation Guide

## Installing Locally (for development/testing)

1. `npm install`
2. `npm run build` (bundles `src/extension.ts` → `dist/extension.js` via esbuild)
3. Open the folder in VS Code
4. Press `F5` — this launches an "Extension Development Host" window with DevGuard AI active
5. Open any JS/TS/React project in that window and run the commands from the Command Palette

For a clean rebuild, run:

```bash
npm run clean
npm install
npm run build
```

## Packaging a `.vsix` File

```bash
npm install -g @vscode/vsce
npm run build
vsce package
```

This produces `devguard-ai-0.1.0.vsix`. Anyone can install it manually via:
- VS Code → Extensions panel → `...` menu → **Install from VSIX...**
- or: `code --install-extension devguard-ai-0.1.0.vsix`

## Publishing to the VS Code Marketplace

1. **Create a publisher account**
   - Go to https://marketplace.visualstudio.com/manage
   - Sign in with a Microsoft account, create a publisher ID (must match `"publisher"` in `package.json`)
   - Update the `publisher` field in [package.json](../package.json) to your real publisher ID

2. **Get a Personal Access Token (PAT)**
   - Go to https://dev.azure.com → User Settings → Personal Access Tokens
   - Scope: **Marketplace → Manage**
   - Copy the token (you won't see it again)

3. **Login with vsce**
   ```bash
   vsce login <your-publisher-name>
   # paste the PAT when prompted
   ```

4. **Update `package.json`**
   - Set `"publisher"` to your real publisher ID
   - Set `"icon"` to a real 128×128 PNG path (see Branding doc)
   - Bump `"version"` following semver

5. **Publish**
   ```bash
   npm run build
   vsce publish
   ```
   Or publish a specific version bump directly: `vsce publish minor`

6. **Verify**
   - Your extension appears at `https://marketplace.visualstudio.com/items?itemName=<publisher>.devguard-ai` within a few minutes

## Pre-publish Checklist

- [ ] `README.md` has a clear description, screenshot/GIF of the dashboard, and feature list (Marketplace renders this as your listing page)
- [ ] `CHANGELOG.md` exists and is up to date
- [ ] `LICENSE` file present
- [ ] Icon is a real PNG (Marketplace requires it — SVG only works for the activity bar icon, not the manifest `icon` field)
- [ ] No hardcoded secrets or API keys anywhere in the bundled `dist/extension.js`
- [ ] Tested `vsce package` output by installing the `.vsix` fresh in a clean VS Code profile

## Versioning & Updates

- Use semver: patch for fixes, minor for new analyzers/commands, major for breaking config changes
- `vsce publish patch|minor|major` bumps `package.json` version and publishes in one step
- Marketplace updates propagate to users automatically (VS Code checks for extension updates on startup)

## GitHub Repository Structure (suggested)

```
devguard-ai/                  (this repo)
├── .github/
│   └── workflows/
│       └── publish.yml       # CI: build + vsce publish on tag push
├── src/
├── docs/
├── media/
├── package.json
├── README.md
├── CHANGELOG.md
└── LICENSE
```

Example `.github/workflows/publish.yml`:

```yaml
name: Publish Extension
on:
  push:
    tags: ["v*"]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npm run build
      - run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
```
