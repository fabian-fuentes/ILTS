// read-select.js — "Read and Select". Muestra una rejilla de palabras (reales
// mezcladas con palabras inventadas). El usuario debe hacer click solo en las reales.
// Tiempo: 1 min 15 s.

import { loadData } from '../app.js';
import { pushScore } from '../storage.js';

const TIME_LIMIT = 75;

let allWords = []; // { text, real }
let selected = new Set();
let timerInterval = null;
let remaining = TIME_LIMIT;

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function render(container) {
    container.innerHTML = `
        <div class="header-bar">
            <h1>🔤 Read & Select</h1>
            <a href="#/dashboard" class="btn-ghost btn">← Inicio</a>
        </div>
        <p>Haz click en las <strong>palabras reales en inglés</strong>. Ignora las inventadas.</p>
        <div class="header-bar">
            <div class="timer" id="timer">1:15</div>
            <button id="submit-btn">Enviar</button>
        </div>
        <div class="word-grid" id="word-grid"></div>
        <div id="feedback"></div>
    `;

    loadData('reading.json').then(data => {
        const set = data.readAndSelect[Math.floor(Math.random() * data.readAndSelect.length)];
        allWords = shuffle([
            ...set.real.map(w => ({ text: w, real: true })),
            ...set.fake.map(w => ({ text: w, real: false })),
        ]);
        selected = new Set();
        renderGrid(container);
        startTimer(container);
        container.querySelector('#submit-btn').addEventListener('click', () => submit(container));
    });
}

function renderGrid(container) {
    const grid = container.querySelector('#word-grid');
    grid.innerHTML = '';
    allWords.forEach((w, i) => {
        const chip = document.createElement('div');
        chip.className = 'word-chip';
        chip.textContent = w.text;
        chip.addEventListener('click', () => {
            if (chip.classList.contains('locked')) return;
            if (selected.has(i)) {
                selected.delete(i);
                chip.classList.remove('selected');
            } else {
                selected.add(i);
                chip.classList.add('selected');
            }
        });
        grid.appendChild(chip);
    });
}

function startTimer(container) {
    remaining = TIME_LIMIT;
    const el = container.querySelector('#timer');
    el.textContent = formatTime(remaining);
    timerInterval = setInterval(() => {
        remaining -= 1;
        el.textContent = formatTime(remaining);
        if (remaining <= 20) el.classList.add('warning');
        if (remaining <= 5) el.classList.add('danger');
        if (remaining <= 0) {
            clearInterval(timerInterval);
            submit(container);
        }
    }, 1000);
}

function submit(container) {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    const chips = [...container.querySelectorAll('.word-chip')];
    let hits = 0, falseAlarms = 0, misses = 0, correctRejections = 0;
    chips.forEach((chip, i) => {
        const w = allWords[i];
        const wasSelected = selected.has(i);
        chip.classList.add('locked');
        if (w.real && wasSelected) { chip.classList.add('correct'); hits += 1; }
        else if (!w.real && wasSelected) { chip.classList.add('incorrect'); falseAlarms += 1; }
        else if (w.real && !wasSelected) { chip.classList.add('incorrect'); misses += 1; }
        else { chip.classList.add('correct'); correctRejections += 1; }
    });
    // Accuracy = (hits + correct rejections) / total
    const total = chips.length;
    const accuracy = (hits + correctRejections) / total;
    pushScore('readSelect', accuracy);
    const fb = container.querySelector('#feedback');
    fb.innerHTML = `<div class="feedback ${accuracy >= 0.7 ? 'correct' : 'incorrect'}">
        Acertaste ${hits + correctRejections} de ${total} decisiones (${Math.round(accuracy * 100)}%).
        <br>✓ ${hits} palabras reales seleccionadas · ✗ ${falseAlarms} falsas alarmas · ✗ ${misses} reales omitidas
    </div>
    <div class="btn-row">
        <button id="again">Otro set</button>
        <a href="#/dashboard" class="btn btn-secondary">Volver al inicio</a>
    </div>`;
    fb.querySelector('#again').addEventListener('click', () => render(container));
    container.querySelector('#submit-btn').disabled = true;
}

export function destroy() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
