# Contributing to ILTS

Thanks for considering a contribution! ILTS is a small, dependency-free project and we'd like to keep it that way. This doc covers the workflow, conventions, and the most common contribution types.

## Table of contents

- [Ground rules](#ground-rules)
- [Development workflow](#development-workflow)
- [Code style](#code-style)
- [Adding a new exercise module](#adding-a-new-exercise-module)
- [Adding data (vocabulary, grammar, etc.)](#adding-data)
- [UI / CSS changes](#ui--css-changes)
- [Pull request checklist](#pull-request-checklist)

## Ground rules

- **No new dependencies** without discussion in an issue first. Vanilla JS is a feature.
- **No build step.** The repo serves as-is from any static host.
- App UI strings stay in **Spanish** (audience is Latin American students). Docs and code comments are in **English**.
- Be kind in reviews and issues.

## Development workflow

```bash
git clone https://github.com/fabian-fuentes/ilts.git
cd ilts
python3 -m http.server 8000   # or: npx serve .
# open http://localhost:8000
```

Then:

1. Create a branch: `git checkout -b feat/my-change` or `fix/my-bug`
2. Make your changes
3. Manually test the touched exercise(s) end-to-end in Chrome **and** Firefox
4. Open a PR against `main` describing what changed and why

There is no test runner, no linter, no CI. Code correctness relies on careful manual testing and review. If your change affects multiple modules, test them all.

## Code style

- **Indentation:** 2 spaces (some older files use 4; match the file you're editing, new files use 2)
- **Semicolons:** yes
- **Quotes:** single quotes for JS, double quotes for HTML attrs
- **Modules:** one ES module per exercise, exporting `render(container, params?)` and optionally `destroy()`
- **No frameworks, no bundlers, no TS.** Plain ES2020+ is fine (modern browsers only)
- **DOM manipulation:** template literals + `innerHTML` for initial render, then `querySelector` / `addEventListener` for interactions
- **Comments:** minimal. Describe *why*, not *what*. Non-obvious invariants only.

## Adding a new exercise module

1. Create `js/modules/my-exercise.js` exporting:

   ```js
   export function render(container, params) {
     container.innerHTML = `...`;
     // attach listeners, start timers, etc.
   }

   export function destroy() {
     // clean up timers, TTS, intervals
   }
   ```

2. Register it in `js/app.js` in the `routes` table:

   ```js
   import * as myExercise from './modules/my-exercise.js';
   const routes = { /* ... */ 'my-exercise': myExercise };
   ```

3. Add a dashboard card in `js/modules/dashboard.js` `SECTIONS` array.
4. On completion, call `pushScore('myExercise', accuracy)` from `js/storage.js` so it shows in the dashboard and factors into the DET estimate.
5. Add the section id to the `SECTIONS` list in `js/scoring.js` if it should influence the overall DET score.
6. If the exercise needs timed behavior, use the `.timer`, `.timer.warning`, `.timer.danger` classes — they already style correctly.

## Adding data

All exercise content lives in `data/*.json`. See [`docs/DATA-SCHEMA.md`](docs/DATA-SCHEMA.md) for the shape of every file and example entries.

Keep JSON files sorted sensibly (alphabetical for vocab, by difficulty for grammar) and validate the shape before committing (`python3 -c 'import json; json.load(open("data/vocabulary.json"))'`).

## UI / CSS changes

The design system is defined in `css/styles.css` via CSS custom properties on `:root` and `[data-theme="light"]`. If you're adding a new component:

- Prefer existing tokens (`--primary`, `--surface`, `--r-md`, etc.) over hard-coded values
- Support both dark and light themes (light-mode overrides go in the `[data-theme="light"]` block)
- Respect `@media (prefers-reduced-motion: reduce)` for any animation
- Keep the glassmorphism treatment on cards: `background: var(--surface)` + `backdrop-filter: blur(20px)` + `border: 1px solid var(--border)`

## Pull request checklist

Before opening your PR, confirm:

- [ ] Tested in Chrome and Firefox (both desktop)
- [ ] Tested at mobile viewport (375px wide)
- [ ] No console errors or warnings
- [ ] No new dependencies added
- [ ] Screenshots attached for any UI change
- [ ] `localStorage` schema unchanged (or migration added in `js/storage.js`)
- [ ] Both themes (dark + light) verified if UI touched
- [ ] Keyboard navigation still works (`Tab`, `Enter`, `Esc`)
- [ ] `CHANGELOG.md` updated under `[Unreleased]`

Thanks! 🦉
