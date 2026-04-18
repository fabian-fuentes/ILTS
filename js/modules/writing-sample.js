// writing-sample.js — 5-minute timed essay from a prompt.

import { loadData } from '../app.js';
import { pushScore, saveEssay } from '../storage.js';

const TIME_LIMIT = 300; // 5 min

let currentPrompt = '';
let timerInterval = null;
let remaining = TIME_LIMIT;

function countWords(s) {
    return (s.trim().match(/\S+/g) || []).length;
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function render(container) {
    container.innerHTML = `
        <div class="header-bar">
            <h1>📝 Writing Sample</h1>
            <a href="#/dashboard" class="btn-ghost btn">← Home</a>
        </div>
        <p>Write a short essay (goal: 100+ words) in 5 minutes.</p>
        <div class="header-bar">
            <div class="timer" id="timer">5:00</div>
            <button id="submit-btn">Submit</button>
        </div>
        <div id="content"></div>
    `;
    loadData('photos.json').then(data => {
        currentPrompt = data.essayPrompts[Math.floor(Math.random() * data.essayPrompts.length)];
        const content = container.querySelector('#content');
        content.innerHTML = `
            <div class="card">
                <h3>Prompt</h3>
                <p style="color:var(--text); font-size:1.05rem;">${currentPrompt}</p>
            </div>
            <textarea id="essay" style="min-height:220px;" placeholder="Write your essay here..."></textarea>
            <div class="word-count" id="wc">0 words</div>
            <div id="fb"></div>
        `;
        const ta = content.querySelector('#essay');
        const wc = content.querySelector('#wc');
        ta.addEventListener('input', () => { wc.textContent = `${countWords(ta.value)} words`; });
        ta.focus();
        container.querySelector('#submit-btn').addEventListener('click', () => submit(container));
        startTimer(container);
    });
}

function startTimer(container) {
    remaining = TIME_LIMIT;
    const el = container.querySelector('#timer');
    el.textContent = formatTime(remaining);
    timerInterval = setInterval(() => {
        remaining -= 1;
        el.textContent = formatTime(remaining);
        if (remaining <= 60) el.classList.add('warning');
        if (remaining <= 15) el.classList.add('danger');
        if (remaining <= 0) {
            clearInterval(timerInterval);
            submit(container);
        }
    }, 1000);
}

function submit(container) {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    const ta = container.querySelector('#essay');
    if (!ta) return;
    const text = ta.value.trim();
    const wc = countWords(text);
    // Scoring: 100+ words = 1.0.
    const accuracy = Math.min(1, wc / 100);
    pushScore('writingSample', accuracy);
    saveEssay('writingSample', currentPrompt, text, wc);
    ta.disabled = true;
    container.querySelector('#submit-btn').disabled = true;
    container.querySelector('#fb').innerHTML = `
        <div class="feedback ${accuracy >= 0.6 ? 'correct' : 'incorrect'}">
            ${wc} words. ${accuracy >= 0.6 ? 'Well done! Try to vary your vocabulary too.' : 'Try to write at least 100 words next time.'}
        </div>
        <div class="btn-row">
            <button id="again">Another prompt</button>
            <a href="#/dashboard" class="btn btn-secondary">Back to home</a>
        </div>
    `;
    container.querySelector('#again').addEventListener('click', () => render(container));
}

export function destroy() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
