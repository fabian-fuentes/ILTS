// scoring.js — Estimate a DET score (10–160) from section accuracies.
// Simple linear mapping: accuracy 0 → 10, accuracy 1 → 160.
// Each section with data is weighted equally; sections without data are ignored.

import { getProgress } from './storage.js';

const SECTIONS = [
    'readComplete',
    'readSelect',
    'fillBlanks',
    'listenType',
    'listenSelect',
    'writePhoto',
    'writingSample',
];

export function accuracyToDet(acc) {
    const clamped = Math.max(0, Math.min(1, acc));
    return Math.round(10 + clamped * 150);
}

export function detToBand(det) {
    // Approximate bands published by Duolingo.
    if (det >= 140) return 'C2 — Advanced high';
    if (det >= 120) return 'C1 — Advanced';
    if (det >= 95) return 'B2 — Upper intermediate';
    if (det >= 75) return 'B1 — Intermediate';
    if (det >= 55) return 'A2 — Elementary';
    return 'A1 — Beginner';
}

export function estimateDetScore(state = getProgress()) {
    const accs = [];
    const breakdown = {};
    for (const sec of SECTIONS) {
        const arr = (state.scores && state.scores[sec]) || [];
        if (!arr.length) continue;
        // Average the last 5 entries so the score tracks recent performance.
        const recent = arr.slice(-5);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        accs.push(avg);
        breakdown[sec] = avg;
    }
    if (!accs.length) {
        return { score: null, band: null, breakdown: {} };
    }
    const overall = accs.reduce((a, b) => a + b, 0) / accs.length;
    const score = accuracyToDet(overall);
    return { score, band: detToBand(score), breakdown, overallAccuracy: overall };
}
