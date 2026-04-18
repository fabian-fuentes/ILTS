# Deployment

ILTS is a static site — just `index.html`, one CSS file, a handful of JS modules, and JSON content. Any static host works, with **no build step**. The publish directory is the repo root.

This document covers four common hosts. Pick the one you already have an account with.

## Prerequisites

- A GitHub account (if you want Pages, or most one-click deployers)
- Optional: Node 18+ if you want to use `vercel`, `netlify-cli`, or `wrangler`

## GitHub Pages (recommended — already wired up)

This repo ships with a GitHub Actions workflow at [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) that deploys every push to `main` to GitHub Pages.

**One-time setup:**

1. Push to `main` (or merge a PR into it)
2. Open **Settings → Pages**
3. Under **Build and deployment**:
   - **Source:** `GitHub Actions`
4. That's it. The next push to `main` will publish to `https://<user>.github.io/<repo>/`.

The workflow:

- Triggers on `push` to `main` and on manual `workflow_dispatch`
- Has the right `pages: write` and `id-token: write` permissions
- Uploads the entire repo (no build step) and deploys via the official `actions/deploy-pages@v4`
- Uses a `pages` concurrency group so a flurry of pushes don't fight each other

A `.nojekyll` file at the repo root tells Pages to skip Jekyll processing, so files starting with `_` are served as-is and the static layout is preserved exactly.

### Alternative: deploy-from-branch (no workflow)

If you'd rather not use Actions, delete `.github/workflows/pages.yml` and instead pick **Settings → Pages → Source: Deploy from a branch → main / `/` (root)**. Same outcome, different mechanism.

## Netlify

### Drag-and-drop

1. Run `zip -r ilts.zip . -x ".git/*"`
2. Drop the zip on <https://app.netlify.com/drop>

### Git-connected

1. **New site → Import from Git → pick repo**
2. **Build command:** leave empty
3. **Publish directory:** `.`
4. Deploy

`netlify.toml` is not required, but if you want preview deploys for PRs add:

```toml
[build]
  publish = "."
  command = ""
```

## Vercel

### CLI

```bash
npm install -g vercel
vercel --prod
```

Accept the defaults. Vercel autodetects the static project.

### Git-connected

1. **Add new → Project → import repo**
2. **Framework preset:** Other
3. **Build & output:** leave defaults (no build command, output directory `.`)
4. Deploy

## Cloudflare Pages

1. Dashboard → Pages → **Create a project → Connect to Git**
2. Pick the repo
3. **Build command:** leave empty
4. **Build output directory:** `/`
5. Save and deploy

## Local test before deploying

Always serve locally once before pushing, since opening `index.html` with `file://` breaks ES module imports in some browsers:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Smoke test:

1. Dashboard loads, score banner renders
2. Navigate to each exercise route and complete one round
3. Toggle theme, refresh, confirm persistence
4. Resize to mobile (375×667), confirm bento grid collapses cleanly
5. Open the Network tab — confirm all `data/*.json` requests return 200

## Custom domain

All four hosts support custom domains via their dashboard. After adding the domain, add an `ALIAS` or `CNAME` record at your DNS provider pointing to the host-provided target. No app-side changes needed — ILTS uses relative paths for everything.

## Cache-busting on updates

Because ILTS has no build and no content hashes, deploying an update may serve stale JS/CSS from browsers' HTTP cache. Two options:

1. Add a query string to the `<link>` and `<script>` tags in `index.html` on each release: `styles.css?v=0.2.0`
2. Configure the host to send `Cache-Control: no-cache` for HTML and `Cache-Control: public, max-age=31536000, immutable` for versioned assets

For a casual study app this is usually not worth the ceremony — users can hard-refresh if something looks off.
