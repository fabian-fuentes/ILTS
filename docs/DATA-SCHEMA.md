# Data schema

Every exercise module reads from a JSON file in `data/`. This document describes the shape of each file, with field tables and examples. All files are plain JSON — no comments, no trailing commas.

## Files at a glance

| File                  | Shape           | Used by                                    |
|-----------------------|-----------------|--------------------------------------------|
| `vocabulary.json`     | Array of words  | `vocabulary.js`                            |
| `grammar.json`        | Array of items  | `fill-blanks.js`, `mock-test.js`           |
| `reading.json`        | Object          | `read-complete.js`, `read-select.js`       |
| `listening.json`      | Object          | `listen-type.js`, `listen-select.js`, `mock-test.js` |
| `photos.json`         | Object          | `write-photo.js`, `writing-sample.js`, `mock-test.js` |

---

## `data/vocabulary.json`

An array of vocabulary entries. Feeds the flashcard module.

```json
[
  {
    "word": "abundant",
    "pos": "adj",
    "definition": "existing in large quantities; plentiful",
    "example": "The region has abundant natural resources.",
    "level": "B2"
  }
]
```

| Field        | Type   | Required | Description                                          |
|--------------|--------|----------|------------------------------------------------------|
| `word`       | string | yes      | The headword (unique across the file)                |
| `pos`        | string | yes      | Part of speech: `noun` \| `verb` \| `adj` \| `adv` \| `phrase` |
| `definition` | string | yes      | Short English gloss                                  |
| `example`    | string | yes      | One-sentence usage example                           |
| `level`      | string | yes      | CEFR level: `B1` \| `B2` \| `C1` \| `C2`             |

**How to add:** append a new object to the array. Keep words sorted alphabetically. Avoid duplicates (`word` is used as the Leitner-box key in `localStorage`, so duplicates would collide).

---

## `data/grammar.json`

An array of multiple-choice fill-in-the-blank items.

```json
[
  {
    "level": "B2",
    "text": "If I ___ more time, I would travel the world.",
    "options": ["have", "had", "will have", "having"],
    "answer": "had",
    "explain": "Second conditional uses 'had' in the if-clause."
  }
]
```

| Field     | Type              | Required | Description                                                                 |
|-----------|-------------------|----------|-----------------------------------------------------------------------------|
| `level`   | string            | yes      | CEFR level: `B1` \| `B2` \| `C1` \| `C2`. Used by the adaptive filter       |
| `text`    | string            | yes      | Sentence with `___` marking the blank (exactly one per item)                |
| `options` | array of strings  | yes      | 3–4 choices; must include the correct answer                                |
| `answer`  | string            | yes      | Must match one of `options` exactly (case-sensitive)                        |
| `explain` | string            | yes      | Short explanation shown as feedback after answering                         |

**How to add:** append an object with the appropriate `level`. Keep at least 10 items per level so a full session can be built without spillover. Shuffling happens at render time.

---

## `data/reading.json`

Two sections in one object:

```json
{
  "passages": [
    {
      "id": "p1",
      "topic": "Renewable energy",
      "text": "Solar panels convert sunlight into electricity. ..."
    }
  ],
  "readAndSelect": [
    {
      "real": ["abundant", "diligent", "pragmatic"],
      "fake": ["florbant", "digilent", "pracmatic"]
    }
  ]
}
```

### `passages[]` — used by `read-complete.js`

| Field   | Type   | Required | Description                                   |
|---------|--------|----------|-----------------------------------------------|
| `id`    | string | yes      | Unique id for the passage                     |
| `topic` | string | yes      | Short category label (shown to user)          |
| `text`  | string | yes      | 80–150 words. Plain prose, no HTML            |

### `readAndSelect[]` — used by `read-select.js`

| Field  | Type             | Required | Description                                       |
|--------|------------------|----------|---------------------------------------------------|
| `real` | array of strings | yes      | Actual English words the user must select        |
| `fake` | array of strings | yes      | Plausible-looking non-words the user must skip   |

Keep each set balanced (similar count of real and fake) and visually similar in length.

---

## `data/listening.json`

Two sections in one object:

```json
{
  "sentences": [
    "The museum will open at ten tomorrow.",
    "She is studying biology at the university."
  ],
  "wordLists": [
    {
      "real": ["mountain", "river", "ocean"],
      "fake": ["mountane", "rever", "oshun"]
    }
  ]
}
```

### `sentences[]` — used by `listen-type.js`

Plain array of strings. Each sentence is read via TTS and the user types what they hear. 6–15 words is the sweet spot.

### `wordLists[]` — used by `listen-select.js` and `mock-test.js`

Same shape as `reading.readAndSelect[]`. The TTS reads each word; user selects the real ones.

---

## `data/photos.json`

Two sections in one object:

```json
{
  "photos": [
    {
      "id": "ph1",
      "url": "https://images.unsplash.com/photo-...",
      "alt": "A busy city street at dusk",
      "hints": ["city", "traffic", "pedestrians"]
    }
  ],
  "essayPrompts": [
    "Should governments invest more in public transportation? Why?"
  ]
}
```

### `photos[]` — used by `write-photo.js` and `mock-test.js`

| Field   | Type              | Required | Description                                              |
|---------|-------------------|----------|----------------------------------------------------------|
| `id`    | string            | yes      | Unique id                                                |
| `url`   | string (URL)      | yes      | Direct-loadable image URL (Unsplash recommended)         |
| `alt`   | string            | yes      | Accessible description (also used if image fails)        |
| `hints` | array of strings  | no       | Optional keywords shown as a prompt below the image      |

### `essayPrompts[]` — used by `writing-sample.js`

Plain array of strings. Each is a prompt for a 5-minute essay.

---

## Validation

Before committing data changes, validate the JSON:

```bash
for f in data/*.json; do
  python3 -c "import json; json.load(open('$f'))" && echo "✓ $f" || echo "✗ $f"
done
```

CI doesn't currently run this, so it's on you. If a file fails to parse the app will show an error banner on the affected module route.
