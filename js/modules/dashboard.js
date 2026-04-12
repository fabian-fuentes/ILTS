// dashboard.js — Home con progreso, racha y navegación a módulos.

import { getProgress, resetProgress, latestScore, dueVocabCount } from '../storage.js';
import { estimateDetScore } from '../scoring.js';

const SECTIONS = [
    { id: 'vocabulary',     route: '#/vocabulary',     title: '📚 Vocabulario',        desc: 'Flashcards de palabras académicas con repetición espaciada' },
    { id: 'readComplete',   route: '#/read-complete',  title: '📖 Read & Complete',   desc: 'Completa las letras faltantes en un pasaje' },
    { id: 'readSelect',     route: '#/read-select',    title: '🔤 Read & Select',     desc: 'Identifica palabras reales en inglés' },
    { id: 'fillBlanks',     route: '#/fill-blanks',    title: '✏️ Grammar Blanks',    desc: 'Rellena los huecos con la opción correcta' },
    { id: 'listenType',     route: '#/listen-type',    title: '🎧 Listen & Type',     desc: 'Escucha y transcribe frases completas' },
    { id: 'listenSelect',   route: '#/listen-select',  title: '👂 Listen & Select',   desc: 'Identifica palabras reales al escuchar' },
    { id: 'writePhoto',     route: '#/write-photo',    title: '🖼️ Write About Photo', desc: 'Describe una imagen en inglés (1 min)' },
    { id: 'writingSample',  route: '#/writing-sample', title: '📝 Writing Sample',    desc: 'Ensayo cronometrado con un prompt' },
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
    const bandDisplay = band || 'Aún sin datos — ¡empieza a practicar!';

    container.innerHTML = `
        <div class="score-banner">
            <div class="score">${scoreDisplay}</div>
            <div class="label">Puntaje DET estimado (10–160)</div>
            <div class="label" style="margin-top:4px;">${bandDisplay}</div>
            <div class="streak">🔥 Racha: ${state.streakDays || 0} día${state.streakDays === 1 ? '' : 's'} · Vocab por repasar: ${due}</div>
        </div>

        <h1>¡A practicar!</h1>
        <p>Elige un tipo de ejercicio. Tu progreso se guarda automáticamente en el navegador.</p>

        <div class="grid" id="sections-grid"></div>

        <div class="card" style="margin-top:24px;">
            <h3>🏁 Simulacro</h3>
            <p>Pon a prueba todas tus habilidades en un mini-test mixto con puntaje DET estimado.</p>
            <a class="btn" href="#/mock-test">Iniciar simulacro</a>
        </div>

        <div class="btn-row" style="margin-top:24px;">
            <button class="btn-ghost" id="reset-btn">Reiniciar progreso</button>
        </div>
    `;

    const grid = container.querySelector('#sections-grid');
    for (const s of SECTIONS) {
        const latest = latestScore(s.id);
        const card = document.createElement('a');
        card.className = 'card dash-card';
        card.href = s.route;
        card.innerHTML = `
            <div class="title">${s.title}</div>
            <div class="subtitle">${s.desc}</div>
            <div class="stat">${formatAccuracy(latest)}</div>
            <div class="subtitle">último intento</div>
        `;
        grid.appendChild(card);
    }

    container.querySelector('#reset-btn').addEventListener('click', () => {
        if (confirm('¿Seguro que quieres reiniciar todo tu progreso? Esto no se puede deshacer.')) {
            resetProgress();
            render(container);
        }
    });
}
