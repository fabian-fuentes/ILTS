# Changelog

All notable changes to ILTS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `.github/workflows/pages.yml` — GitHub Actions workflow that deploys the static site to GitHub Pages on every push to `main`
- `.nojekyll` — disables Jekyll on Pages so the repo is served as-is
- README live-demo badge + URL pointing at `https://fabian-fuentes.github.io/ILTS/`
- `docs/DEPLOYMENT.md` updated to make the Actions workflow the recommended path

## [0.2.0] — 2026-04-18

### Added
- Full `README.md` with badges, features, tech stack, quickstart, project structure, scoring table, and roadmap
- `LICENSE` (MIT)
- `CONTRIBUTING.md` with workflow, code style, and how to add exercises/data
- `.gitignore` for common editor/OS cruft
- `CHANGELOG.md` (this file)
- `docs/ARCHITECTURE.md` — router, storage, scoring, TTS, module contract
- `docs/DATA-SCHEMA.md` — field tables for every JSON file
- `docs/DEPLOYMENT.md` — GitHub Pages, Netlify, Vercel, Cloudflare Pages recipes
- **Aurora Bento** redesign: violet + cyan + amber palette, glassmorphic cards, animated aurora gradient background
- Bento-grid dashboard with hero score card, stats, and exercise tiles
- Google Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (numeric)
- Light / dark theme toggle with system preference detection and `localStorage['ilts.theme']` persistence
- `:focus-visible` focus rings and `prefers-reduced-motion` support
- Fluid typography with `clamp()`
- Multi-layer shadow scale and radius scale

### Changed
- `css/styles.css` fully rewritten around the new design tokens while preserving every existing class name used by modules
- `index.html` header now contains theme toggle; new fixed aurora background layer; meta description added
- `js/app.js` initialises the theme and binds the toggle; router logic unchanged
- `js/modules/dashboard.js` renders the new bento-grid layout (hero card, stat tiles, exercise tiles) using the same data bindings

### Preserved (unchanged)
- Exercise logic for all 9 modules
- `data/*.json` content
- `localStorage['det_progress_v1']` schema — existing users' progress is not migrated or lost
- Web Speech API TTS behaviour
- DET score estimation formula

## [0.1.0] — 2026-04-17

### Added
- Initial release with 9 exercise modules, dashboard, mock test, and localStorage progress tracking
