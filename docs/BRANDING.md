# Branding

## Name
**DevGuard AI** — "Guard" signals protection/prevention (fits dead code, security, broken imports), "AI" signals the optional smart layer without over-promising a chatbot.

## Tagline options
- "Catch what your linter misses."
- "Your code's health, at a glance."
- "Offline-first. AI when you need it."

## Logo direction
A shield shape (matches the `$(shield)` VS Code codicon already used in the status bar) with a subtle circuit/checkmark motif inside:

- **Concept A:** Shield outline with a checkmark cut out of the center — communicates "verified/protected" cleanly at 16px (activity bar size)
- **Concept B:** Shield with a small `</>` code bracket motif instead of a checkmark — ties more explicitly to "code health"
- **Concept C:** Hexagonal badge (like a security/quality badge) with a minimal "DG" monogram — scales better as a favicon/social image than a shield at very small sizes

**Recommended:** Concept A for the actual extension icon (simplest at 16–32px), Concept C for marketing/social banners where more detail can survive.

## Color palette
- Primary: deep indigo/blue (`#4C6FFF` or similar) — trust, tech, not alarmist (avoid red/orange as the *primary* brand color since the extension already uses red/orange for error/warning severities internally — don't compete with your own UI)
- Accent: teal/green for the "health score" positive state
- Background for banners: near-black (`#0F1115`) for a professional, editor-native feel

## Required assets for Marketplace
- `media/icon.png` — 128×128 minimum, PNG, square, transparent or solid background
- `media/icon.svg` — used for the Activity Bar sidebar icon (VS Code recolors SVG icons automatically to match the theme, so keep it single-color/monochrome)
- Optional: a banner/GIF for the README showing the dashboard in action — this has an outsized effect on Marketplace install conversion
