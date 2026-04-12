// storage.js — Wrapper de localStorage para persistir el progreso del estudiante.
// Estructura:
// {
//   streakDays, lastStudied,
//   vocabulary: { [word]: { box: 1..5, nextReview: ISO, seen: n } },
//   scores: { readComplete: [0.8,...], readSelect: [...], fillBlanks: [...],
//             listenType: [...], listenSelect: [...], writePhoto: [...], writingSample: [...],
//             mockTest: [{ score: 110, at: ISO }] },
//   essays: [{ type, prompt, text, wordCount, date }]
// }

const KEY = 'det_progress_v1';

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
    mockTestHistory: [],
    essays: [],
});

export function getProgress() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        // Merge con defaults para tolerar versiones anteriores
        return { ...defaultState(), ...parsed, scores: { ...defaultState().scores, ...(parsed.scores || {}) } };
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
        // Mantener máximo 20 entradas por sección
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
        // Intervalos en días según la caja (Leitner simplificado)
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
