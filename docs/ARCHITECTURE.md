# Architecture

ILTS is a **client-side-only single-page app** with **zero dependencies** and **no build step**. The entire runtime is ~20 KB of JS + ~15 KB of CSS + static JSON content. This document explains how the pieces fit together.

## Top-level flow

```
index.html
  ├─ <link rel="stylesheet" href="css/styles.css">
  ├─ <div class="aurora-bg"></div>      ← fixed animated background
  ├─ <header>                            ← logo, nav, theme toggle
  ├─ <main id="app"></main>              ← modules render here
  └─ <script type="module" src="js/app.js">
```

`app.js` is the only script tag. It imports every exercise module, builds a route table, and listens for `hashchange` events.

## Hash router

Located in `js/app.js`:

```js
const routes = {
  '':              dashboard,
  'dashboard':     dashboard,
  'vocabulary':    vocabulary,
  'read-complete': readComplete,
  // ...
  'mock-test':     mockTest,
};
```

- On `hashchange`, the router parses `#/<name>` from `window.location.hash`, looks up the module, calls `destroy()` on the previous one (if defined), clears `#app`, then awaits `module.render(container)`.
- Unknown routes fall back to the dashboard.
- On first load, if no hash is set, the router redirects to `#/dashboard`.
- All navigation uses plain `<a href="#/...">` — no programmatic history manipulation.

## Module contract

Every exercise module in `js/modules/` exports:

```js
export function render(container, params) {
  // Inject markup into `container`, attach listeners, start timers.
}

export function destroy() {
  // Optional. Called before another module's render().
  // Clean up: clearInterval, speechSynthesis.cancel(), abort fetches.
}
```

Modules have no shared state. Anything that needs to persist between sessions goes through `js/storage.js`.

## Storage layer

`js/storage.js` owns a single `localStorage` key: **`det_progress_v1`**.

```js
{
  streakDays: 0,
  lastStudied: '2026-04-18',
  vocabulary: {
    'abundant': { box: 3, nextReview: '2026-04-22T...', seen: 5 },
    // ...
  },
  scores: {
    readComplete: [0.8, 0.9, 0.75, ...],   // max 20 entries each
    readSelect:   [...],
    fillBlanks:   [...],
    listenType:   [...],
    listenSelect: [...],
    writePhoto:   [...],
    writingSample:[...],
  },
  mockTestHistory: [{ score: 110, breakdown: {...}, at: ISO }], // max 20
  essays: [{ type, prompt, text, wordCount, date }]              // max 50
}
```

All mutations go through `updateProgress(mutator)`:

```js
updateProgress(state => {
  state.scores.readSelect.push(0.85);
});
```

The wrapper merges missing keys from `defaultState()` on every read, so schema additions are forward-compatible without migrations. **If you change the schema in a breaking way, bump the key to `det_progress_v2` and write a migration.**

### Theme

Theme is persisted separately under `localStorage['ilts.theme']` = `'dark' | 'light'`. On boot `js/app.js` reads it, falling back to `matchMedia('(prefers-color-scheme: dark)')`. The toggle button in the header flips `[data-theme]` on `<html>` and rewrites the stored value.

## Scoring pipeline

`js/scoring.js` computes the DET estimate:

```
per-exercise accuracy (0..1)
        │
        ▼ pushScore(section, accuracy)      → storage.scores[section][]
        │
        ▼ estimateDetScore(state)
        │    for each section with data:
        │      take last 5 entries
        │      average them → sectionAvg
        │    average all sectionAvgs → overall
        │
        ▼ accuracyToDet(overall) = round(10 + clamp(overall) × 150)
        │
        ▼ detToBand(det)                     → 'A1 — …' … 'C2 — …'
```

The dashboard and mock-test result screen both call `estimateDetScore()` and render `score` + `band`.

## TTS

`js/tts.js` wraps `window.speechSynthesis`:

- `ensureVoiceLoaded()` — awaits the async voice list (`onvoiceschanged`), caches the first viable English voice by priority: Google/Samantha/Microsoft US → generic en-US → en-GB → any en*
- `speak(text, { rate, onend })` — cancels any in-flight utterance, then speaks with the cached voice
- `isTtsAvailable()` — feature detection for surfacing warnings in the listening modules
- `stop()` — called by module `destroy()` hooks to silence audio on navigation

Modules that depend on TTS (`listen-type`, `listen-select`, `mock-test`) show a warning banner via `.feedback.incorrect` when unavailable.

## Module lifecycle example

```
User clicks #/vocabulary
  │
  ▼ hashchange fires
  │
  ▼ handleRoute() in app.js:
  │    destroy() on dashboard (no-op — dashboard doesn't define destroy)
  │    container.innerHTML = ''
  │    await vocabulary.render(container)
  │         fetch('data/vocabulary.json')
  │         build queue of 15 words using Leitner boxes
  │         render first flashcard
  │
  ▼ User finishes session
  │    recordVocab(word, known) for each
  │    pushScore('vocabulary', sessionAcc)   ← feeds dashboard
  │    render summary card
```

## Design system

The Aurora Bento design system is encoded entirely in CSS custom properties on `:root` (dark, default) and `[data-theme="light"]`. Key tokens:

- **Colors:** `--primary` `#7c5cff` (violet), `--primary-2` `#22d3ee` (cyan), `--accent` `#f59e0b` (amber)
- **Surfaces:** translucent `rgba()` values so glass effects compose over the aurora background
- **Radius:** `--r-sm` 10, `--r-md` 16, `--r-lg` 20, `--r-xl` 28
- **Shadows:** multi-layer `--shadow-1` + `--shadow-2` for depth
- **Animation:** `@keyframes aurora-drift` 40s infinite on `.aurora-bg`, disabled under `prefers-reduced-motion`

All cards use `backdrop-filter: blur(20px) saturate(180%)` for the frosted-glass effect.

## What's intentionally NOT here

- ❌ No React/Vue/Svelte — plain DOM is simpler for this scope
- ❌ No bundler (Vite/webpack) — modern browsers handle `<script type="module">` fine
- ❌ No backend — everything is local
- ❌ No auth — progress is per-browser, by design
- ❌ No analytics or telemetry
- ❌ No service worker yet (on the roadmap)
