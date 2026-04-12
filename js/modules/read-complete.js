// read-complete.js — "Read and Complete" (cloze). Ocultamos ~60% de las letras
// de aproximadamente la mitad de las palabras con más de 3 letras, y el usuario
// debe escribirlas. Tiempo: 3 minutos.

import { loadData } from '../app.js';
import { pushScore } from '../storage.js';

const TIME_LIMIT = 180; // segundos

let passage = null;
let blanks = []; // { wordIdx, charIdx, correct }
let timerInterval = null;
let remaining = TIME_LIMIT;

function buildBlanks(text) {
    const tokens = text.split(/(\s+)/); // preserva espacios
    const result = [];
    let wordIdx = 0;
    let totalWords = tokens.filter(t => /\w/.test(t)).length;
    let blankedWords = 0;
    const target = Math.floor(totalWords * 0.55);

    tokens.forEach((tok, i) => {
        if (!/\w/.test(tok)) {
            result.push({ type: 'space', text: tok });
            return;
        }
        // Decide si convertimos esta palabra en blanked: cada ~2da palabra larga
        const isLong = tok.replace(/[^A-Za-z]/g, '').length >= 4;
        const shouldBlank = isLong && blankedWords < target && (wordIdx % 2 === 1);
        if (shouldBlank) {
            // Mantenemos las primeras 1-2 letras, ocultamos el resto (máx ~60%)
            const letters = tok.split('');
            const firstKeep = Math.max(1, Math.floor(tok.replace(/[^A-Za-z]/g, '').length * 0.4));
            let lettersSeenAlpha = 0;
            const parts = letters.map(ch => {
                if (!/[A-Za-z]/.test(ch)) return { visible: ch, blank: false };
                lettersSeenAlpha += 1;
                if (lettersSeenAlpha <= firstKeep) return { visible: ch, blank: false };
                return { visible: null, blank: true, correct: ch };
            });
            result.push({ type: 'cloze', parts, wordIdx });
            blankedWords += 1;
        } else {
            result.push({ type: 'word', text: tok });
        }
        wordIdx += 1;
    });
    return result;
}

function startTimer(container) {
    remaining = TIME_LIMIT;
    const el = container.querySelector('#timer');
    el.textContent = formatTime(remaining);
    timerInterval = setInterval(() => {
        remaining -= 1;
        el.textContent = formatTime(remaining);
        if (remaining <= 30) el.classList.add('warning');
        if (remaining <= 10) el.classList.add('danger');
        if (remaining <= 0) {
            clearInterval(timerInterval);
            submit(container);
        }
    }, 1000);
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function render(container) {
    container.innerHTML = `
        <div class="header-bar">
            <h1>📖 Read & Complete</h1>
            <a href="#/dashboard" class="btn-ghost btn">← Inicio</a>
        </div>
        <p>Completa las letras que faltan. Tienes 3 minutos.</p>
        <div class="header-bar">
            <div class="timer" id="timer">3:00</div>
            <button id="submit-btn">Enviar</button>
        </div>
        <div id="cloze-area" class="cloze-text"></div>
        <div id="feedback"></div>
    `;

    loadData('reading.json').then(data => {
        passage = data.passages[Math.floor(Math.random() * data.passages.length)];
        const tokens = buildBlanks(passage.text);
        renderTokens(container, tokens);
        startTimer(container);
        container.querySelector('#submit-btn').addEventListener('click', () => submit(container));
    });
}

function renderTokens(container, tokens) {
    const area = container.querySelector('#cloze-area');
    area.innerHTML = '';
    tokens.forEach((tok, tokIdx) => {
        if (tok.type === 'space' || tok.type === 'word') {
            const span = document.createElement('span');
            span.className = 'cloze-fixed';
            span.textContent = tok.type === 'space' ? tok.text : tok.text;
            area.appendChild(span);
        } else if (tok.type === 'cloze') {
            const wrap = document.createElement('span');
            wrap.className = 'cloze-blank';
            tok.parts.forEach((p, pi) => {
                if (!p.blank) {
                    const ch = document.createElement('span');
                    ch.textContent = p.visible;
                    wrap.appendChild(ch);
                } else {
                    const inp = document.createElement('input');
                    inp.type = 'text';
                    inp.maxLength = 1;
                    inp.dataset.correct = p.correct.toLowerCase();
                    inp.dataset.tok = tokIdx;
                    inp.dataset.pi = pi;
                    inp.addEventListener('input', (e) => {
                        if (e.target.value.length === 1) {
                            // autofocus al siguiente input
                            const inputs = [...area.querySelectorAll('input')];
                            const idx = inputs.indexOf(e.target);
                            if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
                        }
                    });
                    wrap.appendChild(inp);
                }
            });
            area.appendChild(wrap);
        }
    });
    const firstInput = area.querySelector('input');
    if (firstInput) firstInput.focus();
}

function submit(container) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    const inputs = [...container.querySelectorAll('#cloze-area input')];
    if (!inputs.length) return;

    let correct = 0;
    inputs.forEach(inp => {
        const expected = inp.dataset.correct;
        const actual = (inp.value || '').trim().toLowerCase();
        if (actual === expected) {
            inp.classList.add('correct');
            correct += 1;
        } else {
            inp.classList.add('incorrect');
            inp.value = expected.toUpperCase();
        }
        inp.disabled = true;
    });
    const accuracy = correct / inputs.length;
    pushScore('readComplete', accuracy);
    const fb = container.querySelector('#feedback');
    fb.innerHTML = `<div class="feedback ${accuracy >= 0.6 ? 'correct' : 'incorrect'}">
        Acertaste ${correct} de ${inputs.length} letras (${Math.round(accuracy * 100)}%).
    </div>
    <div class="btn-row">
        <button id="again">Otro pasaje</button>
        <a href="#/dashboard" class="btn btn-secondary">Volver al inicio</a>
    </div>`;
    fb.querySelector('#again').addEventListener('click', () => render(container));
    container.querySelector('#submit-btn').disabled = true;
}

export function destroy() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
