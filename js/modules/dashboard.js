// dashboard.js — Home con progreso, racha y navegación a módulos.
// Layout Aurora Bento: hero score, stats y tiles de ejercicios.

import { getProgress, resetProgress, latestScore, dueVocabCount } from '../storage.js';
import { estimateDetScore } from '../scoring.js';

const SECTIONS = [
    { id: 'vocabulary',     route: '#/vocabulary',     emoji: '📚', title: 'Vocabulario',     desc: 'Flashcards con repetición espaciada' },
    { id: 'readComplete',   route: '#/read-complete',  emoji: '📖', title: 'Read & Complete', desc: 'Completa las letras faltantes' },
    { id: 'readSelect',     route: '#/read-select',    emoji: '🔤', title: 'Read & Select',   desc: 'Identifica palabras reales' },
    { id: 'fillBlanks',     route: '#/fill-blanks',    emoji: '✏️', title: 'Grammar Blanks',  desc: 'Rellena huecos con la opción correcta' },
    { id: 'listenType',     route: '#/listen-type',    emoji: '🎧', title: 'Listen & Type',   desc: 'Escucha y transcribe frases' },
    { id: 'listenSelect',   route: '#/listen-select',  emoji: '👂', title: 'Listen & Select', desc: 'Identifica palabras al escuchar' },
    { id: 'writePhoto',     route: '#/write-photo',    emoji: '🖼️', title: 'Write About Photo', desc: 'Describe una imagen (1 min)' },
    { id: 'writingSample',  route: '#/writing-sample', emoji: '📝', title: 'Writing Sample',  desc: 'Ensayo cronometrado (5 min)' },
];

function formatAccuracy(acc) {
    if (acc == null) return '—';
    return Math.round(acc * 100) + '%';
}

export function render(container) {
    const state = getProgress();
    const { score, band } = estimateDetScore(state);
    const due = dueVocabCount();

    const scoreDisplay = score != null ? score : '—';
    const scoreMax = score != null ? '<span class="score-sep">/ 160</span>' : '';
    const bandDisplay = band || 'Aún sin datos — ¡empieza a practicar!';
    const streakDays = state.streakDays || 0;
    const streakLabel = streakDays === 1 ? 'día' : 'días';

    container.innerHTML = `
        <section class="bento" aria-label="Panel de progreso">
            <div class="bento-hero">
                <div class="eyebrow">DET · Estimado</div>
                <div class="score-number">${scoreDisplay}${scoreMax}</div>
                <div class="band">${bandDisplay}</div>
                <p class="hero-sub">Tu puntaje se actualiza con cada práctica. Escala oficial del Duolingo English Test: 10 a 160 puntos.</p>
            </div>

            <div class="card bento-stat">
                <div class="stat-label">🔥 Racha</div>
                <div class="stat-value">${streakDays}</div>
                <div class="stat-sub">${streakLabel} consecutivos</div>
            </div>

            <div class="card bento-stat">
                <div class="stat-label">📚 Por repasar</div>
                <div class="stat-value">${due}</div>
                <div class="stat-sub">palabras pendientes hoy</div>
            </div>
        </section>

        <h1>¡A practicar!</h1>
        <p>Elige un tipo de ejercicio. Tu progreso se guarda automáticamente en el navegador.</p>

        <section class="bento" id="sections-grid" aria-label="Ejercicios"></section>

        <div class="card" style="margin-top:var(--sp-5);">
            <h3>🏁 Simulacro</h3>
            <p>Pon a prueba todas tus habilidades en un mini-test mixto con puntaje DET estimado.</p>
            <div class="btn-row">
                <a class="btn" href="#/mock-test">Iniciar simulacro</a>
            </div>
        </div>

        <div class="btn-row" style="margin-top:var(--sp-5);">
            <button class="btn-ghost" id="reset-btn" type="button">Reiniciar progreso</button>
        </div>
    `;

    const grid = container.querySelector('#sections-grid');
    for (const s of SECTIONS) {
        const latest = latestScore(s.id);
        const tile = document.createElement('a');
        tile.className = 'card bento-tile';
        tile.href = s.route;
        tile.innerHTML = `
            <div class="tile-emoji" aria-hidden="true">${s.emoji}</div>
            <div class="tile-title">${s.title}</div>
            <div class="tile-desc">${s.desc}</div>
            <div>
                <div class="tile-stat-label">último intento</div>
                <div class="tile-stat">${formatAccuracy(latest)}</div>
            </div>
        `;
        grid.appendChild(tile);
    }

    container.querySelector('#reset-btn').addEventListener('click', () => {
        if (confirm('¿Seguro que quieres reiniciar todo tu progreso? Esto no se puede deshacer.')) {
            resetProgress();
            render(container);
        }
    });
}
