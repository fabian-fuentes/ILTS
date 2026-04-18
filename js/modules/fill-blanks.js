// fill-blanks.js — Grammar quiz. Shows 10 sentences with dropdown choices,
// filtered by the learner's current CEFR level. After each session the level
// adjusts up or down based on session accuracy.

import { loadData } from '../app.js';
import { pushScore, getLevel, adjustLevel, LEVELS } from '../storage.js';

const TOTAL_ITEMS = 10;
let items = [];
let currentIdx = 0;
let correctCount = 0;
let activeLevel = 'B1';

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Pick items matching the current level; spill over to adjacent levels if
 * there aren't enough to fill a session.
 */
function pickForLevel(all, level, count) {
    const idx = LEVELS.indexOf(level);
    const order = [level];
    for (let step = 1; step < LEVELS.length; step++) {
        if (idx - step >= 0) order.push(LEVELS[idx - step]);
        if (idx + step < LEVELS.length) order.push(LEVELS[idx + step]);
    }
    const picked = [];
    const seen = new Set();
    for (const lvl of order) {
        for (const it of shuffle(all)) {
            if ((it.level || 'B2') !== lvl) continue;
            const key = it.text;
            if (seen.has(key)) continue;
            picked.push(it);
            seen.add(key);
            if (picked.length >= count) return picked;
        }
    }
    // Fallback: anything that isn't a dupe.
    for (const it of shuffle(all)) {
        if (!seen.has(it.text)) { picked.push(it); seen.add(it.text); }
        if (picked.length >= count) break;
    }
    return picked;
}

export function render(container) {
    activeLevel = getLevel('fillBlanks');
    container.innerHTML = `
        <div class="header-bar">
            <h1>✏️ Grammar Blanks <span class="level-badge level-badge-lg" id="level-badge">${activeLevel}</span></h1>
            <a href="#/dashboard" class="btn-ghost btn">← Home</a>
        </div>
        <p>Pick the right word to complete each sentence at your current level.</p>
        <div id="quiz-area"></div>
    `;
    loadData('grammar.json').then(data => {
        items = pickForLevel(data, activeLevel, TOTAL_ITEMS);
        currentIdx = 0;
        correctCount = 0;
        renderItem(container);
    });
}

function renderItem(container) {
    const area = container.querySelector('#quiz-area');
    if (currentIdx >= items.length) return finish(area, container);

    const it = items[currentIdx];
    const parts = it.text.split('___');
    const opts = shuffle(it.options);
    area.innerHTML = `
        <div class="progress-bar"><div class="fill" style="width:${(currentIdx / items.length) * 100}%"></div></div>
        <div class="card">
            <h3>Question ${currentIdx + 1} / ${items.length} <span class="level-badge" title="Item level">${it.level || activeLevel}</span></h3>
            <p style="color:var(--text); font-size:1.1rem;">
                ${parts[0]}<select id="ans" class="inline-input">
                    <option value="">—</option>
                    ${opts.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>${parts[1] || ''}
            </p>
            <div class="btn-row">
                <button id="check">Check</button>
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
                ${right ? '✓ Correct!' : `✗ Correct answer: <strong>${it.answer}</strong>`}
                <br><small>${it.explain}</small>
            </div>
            <div class="btn-row">
                <button id="next">Next →</button>
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

function finish(area, container) {
    const acc = correctCount / items.length;
    pushScore('fillBlanks', acc);
    const { before, after, direction } = adjustLevel('fillBlanks', acc);

    const badge = container.querySelector('#level-badge');
    if (badge) badge.textContent = after;

    let promotionNote = '';
    if (direction === 'up') {
        promotionNote = `<div class="feedback correct">🎉 Leveled up: <strong>${before} → ${after}</strong>. Next round pulls tougher items.</div>`;
    } else if (direction === 'down') {
        promotionNote = `<div class="feedback incorrect">↓ Dropped to <strong>${after}</strong> to rebuild confidence.</div>`;
    }

    area.innerHTML = `
        <div class="card">
            <h2>Result</h2>
            <p>You got <strong>${correctCount}</strong> of <strong>${items.length}</strong> right (${Math.round(acc * 100)}%).</p>
            <p>Current level: <strong>${after}</strong></p>
            ${promotionNote}
            <div class="btn-row">
                <button id="again">Another round</button>
                <a href="#/dashboard" class="btn btn-secondary">Back to home</a>
            </div>
        </div>
    `;
    area.querySelector('#again').addEventListener('click', () => render(container));
}
