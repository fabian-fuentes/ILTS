// vocabulary.js — Adaptive flashcards with Leitner boxes (1..5).
// The deck is filtered to the learner's current CEFR level (B1..C2). At the end
// of each session the level adjusts up/down based on the session accuracy.

import { loadData } from '../app.js';
import { getProgress, recordVocab, getLevel, adjustLevel, LEVELS } from '../storage.js';
import { speak } from '../tts.js';

const SESSION_SIZE = 15;

let words = [];
let queue = [];
let currentIdx = 0;
let flipped = false;
let sessionCorrect = 0;
let sessionTotal = 0;
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
 * Pick words for this session. Start from the learner's current level; if there
 * aren't enough, spill over into adjacent levels (first lower, then higher)
 * so the session always has ${SESSION_SIZE} cards.
 */
function pickForLevel(allWords, level) {
    const levelIdx = LEVELS.indexOf(level);
    const order = [level];
    for (let step = 1; step < LEVELS.length; step++) {
        if (levelIdx - step >= 0) order.push(LEVELS[levelIdx - step]);
        if (levelIdx + step < LEVELS.length) order.push(LEVELS[levelIdx + step]);
    }
    const picked = [];
    const seen = new Set();
    for (const lvl of order) {
        for (const w of allWords) {
            if (w.level !== lvl || seen.has(w.word)) continue;
            picked.push(w);
            seen.add(w.word);
            if (picked.length >= SESSION_SIZE * 2) break;
        }
        if (picked.length >= SESSION_SIZE * 2) break;
    }
    return picked;
}

function buildQueue() {
    activeLevel = getLevel('vocabulary');
    const levelPool = pickForLevel(words, activeLevel);
    const state = getProgress();
    const now = Date.now();
    // Split the level pool into due (never seen or past nextReview) vs others.
    const due = [];
    const others = [];
    for (const w of levelPool) {
        const entry = state.vocabulary[w.word];
        if (!entry || !entry.nextReview || new Date(entry.nextReview).getTime() <= now) {
            due.push(w);
        } else {
            others.push(w);
        }
    }
    queue = shuffle(due).concat(shuffle(others)).slice(0, SESSION_SIZE);
}

export function render(container) {
    activeLevel = getLevel('vocabulary');
    container.innerHTML = `
        <div class="header-bar">
            <h1>📚 Vocabulary <span class="level-badge level-badge-lg" id="level-badge">${activeLevel}</span></h1>
            <a href="#/dashboard" class="btn-ghost btn">← Home</a>
        </div>
        <p>Session of ${SESSION_SIZE} cards at your current level. Think of the meaning, flip the card, then mark whether you knew it.</p>
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
    if (currentIdx >= queue.length) return finishSession(content, container);

    const w = queue[currentIdx];
    flipped = false;
    content.innerHTML = `
        <div class="progress-bar"><div class="fill" style="width:${(currentIdx / queue.length) * 100}%"></div></div>
        <div class="flashcard" id="flashcard">
            <div class="word">${w.word}</div>
            <div class="pos">${w.pos} · ${w.level}</div>
            <div id="back" style="display:none;">
                <div class="definition">${w.definition}</div>
                <div class="example">"${w.example}"</div>
            </div>
        </div>
        <div class="btn-row">
            <button id="speak-btn" class="btn-secondary">🔊 Listen</button>
            <button id="flip-btn">Flip card</button>
        </div>
        <div id="answer-row" class="btn-row" style="display:none;">
            <button id="unknown" class="btn-danger">Didn't know ✗</button>
            <button id="known">Knew it ✓</button>
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
    renderCard(container);
}

function finishSession(content, container) {
    const acc = sessionTotal ? sessionCorrect / sessionTotal : 0;
    const { before, after, direction } = adjustLevel('vocabulary', acc);
    activeLevel = after;

    const badge = container.querySelector('#level-badge');
    if (badge) badge.textContent = after;

    let promotionNote = '';
    if (direction === 'up') {
        promotionNote = `<div class="feedback correct">🎉 Leveled up: <strong>${before} → ${after}</strong>. Next session uses harder vocabulary.</div>`;
    } else if (direction === 'down') {
        promotionNote = `<div class="feedback incorrect">↓ Dropped to <strong>${after}</strong> to keep things doable. You'll climb back up — keep going!</div>`;
    }

    content.innerHTML = `
        <div class="card">
            <h2>Session complete 🎉</h2>
            <p>You knew <strong>${sessionCorrect}</strong> of <strong>${sessionTotal}</strong> cards (${Math.round(acc * 100)}%).</p>
            <p>Current level: <strong>${after}</strong></p>
            ${promotionNote}
            <div class="btn-row">
                <button id="again">Another session</button>
                <a href="#/dashboard" class="btn btn-secondary">Back to home</a>
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
}

export function destroy() {
    // Nothing to clean up
}
