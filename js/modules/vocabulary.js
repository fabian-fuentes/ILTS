// vocabulary.js — Flashcards con Leitner boxes (1..5).

import { loadData } from '../app.js';
import { getProgress, recordVocab } from '../storage.js';
import { speak } from '../tts.js';

let words = [];
let queue = [];
let currentIdx = 0;
let flipped = false;
let sessionCorrect = 0;
let sessionTotal = 0;

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildQueue() {
    const state = getProgress();
    const now = Date.now();
    // Prioridad: primero las que nunca se han visto o que ya están due; luego el resto
    const due = [];
    const others = [];
    for (const w of words) {
        const entry = state.vocabulary[w.word];
        if (!entry || !entry.nextReview || new Date(entry.nextReview).getTime() <= now) {
            due.push(w);
        } else {
            others.push(w);
        }
    }
    queue = shuffle(due).concat(shuffle(others)).slice(0, 15);
}

export function render(container) {
    container.innerHTML = `
        <div class="header-bar">
            <h1>📚 Vocabulario</h1>
            <a href="#/dashboard" class="btn-ghost btn">← Inicio</a>
        </div>
        <p>Sesión de 15 tarjetas. Piensa el significado, voltea la tarjeta y marca si la sabías.</p>
        <div id="vocab-content"></div>
    `;

    loadData('vocabulary.json').then(data => {
        words = data;
        buildQueue();
        sessionCorrect = 0;
        sessionTotal = 0;
        currentIdx = 0;
        renderCard(container);
    }).catch(err => {
        container.querySelector('#vocab-content').innerHTML = `<p>Error: ${err.message}</p>`;
    });
}

function renderCard(container) {
    const content = container.querySelector('#vocab-content');
    if (currentIdx >= queue.length) {
        const acc = sessionTotal ? sessionCorrect / sessionTotal : 0;
        content.innerHTML = `
            <div class="card">
                <h2>¡Sesión completada! 🎉</h2>
                <p>Acertaste <strong>${sessionCorrect}</strong> de <strong>${sessionTotal}</strong> tarjetas (${Math.round(acc * 100)}%).</p>
                <div class="btn-row">
                    <button id="again">Otra sesión</button>
                    <a href="#/dashboard" class="btn btn-secondary">Volver al inicio</a>
                </div>
            </div>
        `;
        content.querySelector('#again').addEventListener('click', () => {
            buildQueue();
            sessionCorrect = 0;
            sessionTotal = 0;
            currentIdx = 0;
            flipped = false;
            renderCard(container);
        });
        return;
    }

    const w = queue[currentIdx];
    flipped = false;
    content.innerHTML = `
        <div class="progress-bar"><div class="fill" style="width:${(currentIdx / queue.length) * 100}%"></div></div>
        <div class="flashcard" id="flashcard">
            <div class="word">${w.word}</div>
            <div class="pos">${w.pos}</div>
            <div id="back" style="display:none;">
                <div class="definition">${w.definition}</div>
                <div class="example">"${w.example}"</div>
            </div>
        </div>
        <div class="btn-row">
            <button id="speak-btn" class="btn-secondary">🔊 Escuchar</button>
            <button id="flip-btn">Voltear tarjeta</button>
        </div>
        <div id="answer-row" class="btn-row" style="display:none;">
            <button id="unknown" class="btn-danger">No sabía ✗</button>
            <button id="known">Sí sabía ✓</button>
        </div>
    `;

    content.querySelector('#speak-btn').addEventListener('click', () => speak(w.word + '. ' + w.example));
    content.querySelector('#flip-btn').addEventListener('click', () => {
        flipped = true;
        content.querySelector('#back').style.display = 'block';
        content.querySelector('#answer-row').style.display = 'flex';
        content.querySelector('#flip-btn').style.display = 'none';
    });
    content.querySelector('#known').addEventListener('click', () => grade(w.word, true, container));
    content.querySelector('#unknown').addEventListener('click', () => grade(w.word, false, container));
}

function grade(word, known, container) {
    recordVocab(word, known);
    sessionTotal += 1;
    if (known) sessionCorrect += 1;
    currentIdx += 1;
    if (currentIdx >= queue.length) {
        // Guardar accuracy de la sesión en la sección mockTest-like? Mejor dejarlo aparte.
        // No vamos a empujar a "scores" porque vocabulario es entrenamiento, no evaluación.
    }
    renderCard(container);
}

export function destroy() {
    // Nothing to clean up
}
