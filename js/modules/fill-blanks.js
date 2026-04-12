// fill-blanks.js — Quiz de gramática. Muestra 10 frases con dropdowns.

import { loadData } from '../app.js';
import { pushScore } from '../storage.js';

const TOTAL_ITEMS = 10;
let items = [];
let currentIdx = 0;
let correctCount = 0;

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function render(container) {
    container.innerHTML = `
        <div class="header-bar">
            <h1>✏️ Grammar Blanks</h1>
            <a href="#/dashboard" class="btn-ghost btn">← Inicio</a>
        </div>
        <p>Elige la palabra correcta para completar cada frase.</p>
        <div id="quiz-area"></div>
    `;
    loadData('grammar.json').then(data => {
        items = shuffle(data).slice(0, TOTAL_ITEMS);
        currentIdx = 0;
        correctCount = 0;
        renderItem(container);
    });
}

function renderItem(container) {
    const area = container.querySelector('#quiz-area');
    if (currentIdx >= items.length) {
        const acc = correctCount / items.length;
        pushScore('fillBlanks', acc);
        area.innerHTML = `
            <div class="card">
                <h2>Resultado</h2>
                <p>Acertaste <strong>${correctCount}</strong> de <strong>${items.length}</strong> (${Math.round(acc * 100)}%).</p>
                <div class="btn-row">
                    <button id="again">Otra ronda</button>
                    <a href="#/dashboard" class="btn btn-secondary">Volver al inicio</a>
                </div>
            </div>
        `;
        area.querySelector('#again').addEventListener('click', () => render(container));
        return;
    }
    const it = items[currentIdx];
    const parts = it.text.split('___');
    const opts = shuffle(it.options);
    area.innerHTML = `
        <div class="progress-bar"><div class="fill" style="width:${(currentIdx / items.length) * 100}%"></div></div>
        <div class="card">
            <h3>Pregunta ${currentIdx + 1} / ${items.length}</h3>
            <p style="color:var(--text); font-size:1.1rem;">
                ${parts[0]}<select id="ans" class="inline-input">
                    <option value="">—</option>
                    ${opts.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>${parts[1] || ''}
            </p>
            <div class="btn-row">
                <button id="check">Comprobar</button>
            </div>
            <div id="fb"></div>
        </div>
    `;
    const check = area.querySelector('#check');
    check.addEventListener('click', () => {
        const val = area.querySelector('#ans').value;
        if (!val) return;
        const right = val === it.answer;
        if (right) correctCount += 1;
        area.querySelector('#fb').innerHTML = `
            <div class="feedback ${right ? 'correct' : 'incorrect'}">
                ${right ? '✓ ¡Correcto!' : `✗ Correcto: <strong>${it.answer}</strong>`}
                <br><small>${it.explain}</small>
            </div>
            <div class="btn-row">
                <button id="next">Siguiente →</button>
            </div>
        `;
        check.disabled = true;
        area.querySelector('#ans').disabled = true;
        area.querySelector('#next').addEventListener('click', () => {
            currentIdx += 1;
            renderItem(container);
        });
    });
}
