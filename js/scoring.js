// scoring.js — Cálculo de puntaje DET estimado (10–160) a partir de accuracies.
// Mapeo lineal simple: accuracy 0 -> 10, accuracy 1 -> 160.
// Se pondera cada sección por igual. Si una sección no tiene datos se ignora.

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
    // Bandas aproximadas publicadas por Duolingo
    if (det >= 140) return 'C2 — Avanzado alto';
    if (det >= 120) return 'C1 — Avanzado';
    if (det >= 95) return 'B2 — Intermedio alto';
    if (det >= 75) return 'B1 — Intermedio';
    if (det >= 55) return 'A2 — Básico';
    return 'A1 — Principiante';
}

export function estimateDetScore(state = getProgress()) {
    const accs = [];
    const breakdown = {};
    for (const sec of SECTIONS) {
        const arr = (state.scores && state.scores[sec]) || [];
        if (!arr.length) continue;
        // Promedio de las últimas 5 entradas para que responda al progreso reciente
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
