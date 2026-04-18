// storage.js — localStorage wrapper that persists learner progress.
// Schema (key: det_progress_v1):
// {
//   streakDays, lastStudied,
//   vocabulary: { [word]: { box: 1..5, nextReview: ISO, seen: n } },
//   scores: { readComplete: [0.8, ...], readSelect: [...], fillBlanks: [...],
//             listenType: [...], listenSelect: [...], writePhoto: [...], writingSample: [...],
//             mockTest: [{ score: 110, at: ISO }] },
//   levels: { vocabulary: 'B1'|'B2'|'C1'|'C2', fillBlanks: 'B1'|... },
//   essays: [{ type, prompt, text, wordCount, date }]
// }

const KEY = 'det_progress_v1';

// Adaptive levels
export const LEVELS = ['B1', 'B2', 'C1', 'C2'];
export const DEFAULT_LEVEL = 'B1';
export const LEVEL_UP_THRESHOLD = 0.8;
export const LEVEL_DOWN_THRESHOLD = 0.4;

const defaultState = () => ({
    streakDays: 0,
    lastStudied: null,
    vocabulary: {},
    scores: {
        readComplete: [],
        readSelect: [],
        fillBlanks: [],
        listenType: [],
        listenSelect: [],
        writePhoto: [],
        writingSample: [],
    },
    levels: {
        vocabulary: DEFAULT_LEVEL,
        fillBlanks: DEFAULT_LEVEL,
    },
    mockTestHistory: [],
    essays: [],
});

export function getProgress() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        // Merge with defaults to tolerate older versions (forward-compatible).
        const def = defaultState();
        return {
            ...def,
            ...parsed,
            scores: { ...def.scores, ...(parsed.scores || {}) },
            levels: { ...def.levels, ...(parsed.levels || {}) },
        };
    } catch (e) {
        console.warn('storage: parse error, resetting', e);
        return defaultState();
    }
}

export function saveProgress(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
}

export function updateProgress(mutator) {
    const state = getProgress();
    mutator(state);
    saveProgress(state);
    return state;
}

export function resetProgress() {
    localStorage.removeItem(KEY);
}

// --- Scores ---
export function pushScore(section, accuracy) {
    updateProgress(state => {
        if (!state.scores[section]) state.scores[section] = [];
        state.scores[section].push(Number(accuracy.toFixed(3)));
        // Keep at most 20 entries per section.
        if (state.scores[section].length > 20) state.scores[section].shift();
    });
}

export function latestScore(section) {
    const state = getProgress();
    const arr = state.scores[section] || [];
    return arr.length ? arr[arr.length - 1] : null;
}

export function averageScore(section) {
    const state = getProgress();
    const arr = state.scores[section] || [];
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// --- Adaptive levels ---
export function getLevel(section) {
    const state = getProgress();
    return (state.levels && state.levels[section]) || DEFAULT_LEVEL;
}

/**
 * Adjust the adaptive level of a section based on a session accuracy (0..1).
 * Returns { before, after, direction } so the UI can celebrate promotions.
 */
export function adjustLevel(section, accuracy) {
    let before = DEFAULT_LEVEL;
    let after = DEFAULT_LEVEL;
    let direction = 'stay';
    updateProgress(state => {
        if (!state.levels) state.levels = {};
        before = state.levels[section] || DEFAULT_LEVEL;
        const idx = LEVELS.indexOf(before);
        let nextIdx = idx;
        if (accuracy >= LEVEL_UP_THRESHOLD && idx < LEVELS.length - 1) {
            nextIdx = idx + 1;
            direction = 'up';
        } else if (accuracy <= LEVEL_DOWN_THRESHOLD && idx > 0) {
            nextIdx = idx - 1;
            direction = 'down';
        }
        after = LEVELS[nextIdx];
        state.levels[section] = after;
    });
    return { before, after, direction };
}

// --- Streak ---
function dateKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
}

export function touchStreak() {
    updateProgress(state => {
        const today = dateKey();
        if (state.lastStudied === today) return;

        if (state.lastStudied) {
            const last = new Date(state.lastStudied);
            const diffDays = Math.round((Date.now() - last.getTime()) / 86400000);
            if (diffDays === 1) {
                state.streakDays = (state.streakDays || 0) + 1;
            } else if (diffDays > 1) {
                state.streakDays = 1;
            }
        } else {
            state.streakDays = 1;
        }
        state.lastStudied = today;
    });
}

// --- Vocabulary (Leitner boxes 1..5) ---
export function recordVocab(word, known) {
    updateProgress(state => {
        const entry = state.vocabulary[word] || { box: 1, seen: 0, nextReview: null };
        entry.seen += 1;
        if (known) {
            entry.box = Math.min(5, entry.box + 1);
        } else {
            entry.box = 1;
        }
        // Leitner intervals in days.
        const intervals = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };
        const next = new Date();
        next.setDate(next.getDate() + intervals[entry.box]);
        entry.nextReview = next.toISOString();
        state.vocabulary[word] = entry;
    });
}

export function dueVocabCount() {
    const state = getProgress();
    const now = Date.now();
    return Object.values(state.vocabulary).filter(e => !e.nextReview || new Date(e.nextReview).getTime() <= now).length;
}

// --- Essays ---
export function saveEssay(type, prompt, text, wordCount) {
    updateProgress(state => {
        state.essays.push({ type, prompt, text, wordCount, date: new Date().toISOString() });
        if (state.essays.length > 50) state.essays.shift();
    });
}

// --- Mock test history ---
export function saveMockResult(score, breakdown) {
    updateProgress(state => {
        state.mockTestHistory.push({ score, breakdown, at: new Date().toISOString() });
        if (state.mockTestHistory.length > 20) state.mockTestHistory.shift();
    });
}
