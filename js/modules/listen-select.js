// listen-select.js — "Listen and Select". TTS lee una lista de palabras;
// el usuario marca las reales. 90 segundos.

import { loadData } from '../app.js';
import { pushScore } from '../storage.js';
import { speak, isTtsAvailable } from '../tts.js';

const TIME_LIMIT = 90;

let words = []; // { text, real }
let selected = new Set();
let timerInterval = null;
let remaining = TIME_LIMIT;
let playsLeft = 2;

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
            <h1>👂 Listen & Select</h1>
            <a href="#/dashboard" class="btn-ghost btn">← Inicio</a>
        </div>
        <p>Escucha las palabras y marca solo las <strong>reales en inglés</strong>.</p>
        ${!isTtsAvailable() ? '<div class="feedback incorrect">⚠️ Tu navegador no soporta síntesis de voz. Prueba con Chrome o Firefox.</div>' : ''}
        <div class="header-bar">
            <div class="timer" id="timer">1:30</div>
            <div>
                <button id="play-btn" class="btn-secondary">🔊 Reproducir</button>
            </div>
        </div>
        <div class="word-grid" id="word-grid"></div>
        <div class="btn-row">
            <button id="submit-btn">Enviar</button>
        </div>
        <div id="feedback"></div>
    `;

    loadData('listening.json').then(data => {
        const set = data.wordLists[Math.floor(Math.random() * data.wordLists.length)];
        words = shuffle([
            ...set.real.map(w => ({ text: w, real: true })),
            ...set.fake.map(w => ({ text: w, real: false })),
        ]);
        selected = new Set();
        playsLeft = 2;
        renderGrid(container);
        setupControls(container);
        startTimer(container);
        setTimeout(() => container.querySelector('#play-btn').click(), 300);
    });
}

function setupControls(container) {
    const playBtn = container.querySelector('#play-btn');
    playBtn.addEventListener('click', () => {
        if (playsLeft <= 0) return;
        playsLeft -= 1;
        // Leer las palabras una por una con pausas
        const phrase = words.map(w => w.text).join(', ');
        speak(phrase);
        playBtn.textContent = `🔊 Reproducir (${playsLeft} restante${playsLeft === 1 ? '' : 's'})`;
        if (playsLeft <= 0) playBtn.disabled = true;
    });
    container.querySelector('#submit-btn').addEventListener('click', () => submit(container));
}

function renderGrid(container) {
    const grid = container.querySelector('#word-grid');
    grid.innerHTML = '';
    words.forEach((w, i) => {
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
    let ok = 0;
    chips.forEach((chip, i) => {
        const w = words[i];
        const wasSelected = selected.has(i);
        chip.classList.add('locked');
        const correctChoice = (w.real === wasSelected);
        if (correctChoice) { chip.classList.add('correct'); ok += 1; }
        else { chip.classList.add('incorrect'); }
    });
    const acc = ok / chips.length;
    pushScore('listenSelect', acc);
    const fb = container.querySelector('#feedback');
    fb.innerHTML = `<div class="feedback ${acc >= 0.7 ? 'correct' : 'incorrect'}">
        ${ok} de ${chips.length} decisiones correctas (${Math.round(acc * 100)}%).
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
