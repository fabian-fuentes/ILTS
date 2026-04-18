// write-photo.js — "Write About the Photo". Shows an image + a textarea.
// Time limit: 1 minute. Scoring by word count (>= 30 → full marks).

import { loadData } from '../app.js';
import { pushScore, saveEssay } from '../storage.js';

const TIME_LIMIT = 60;

let currentPhoto = null;
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
            <h1>🖼️ Write About the Photo</h1>
            <a href="#/dashboard" class="btn-ghost btn">← Home</a>
        </div>
        <p>Describe the photo in English with at least 1–2 sentences. You have 1 minute.</p>
        <div class="header-bar">
            <div class="timer" id="timer">1:00</div>
            <button id="submit-btn">Submit</button>
        </div>
        <div id="content"></div>
    `;
    loadData('photos.json').then(data => {
        currentPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
        const content = container.querySelector('#content');
        content.innerHTML = `
            <div class="photo-frame">
                <img src="${currentPhoto.url}" alt="${currentPhoto.alt}" onerror="this.style.opacity=0.3; this.alt='(Image failed to load)';">
            </div>
            <textarea id="essay" placeholder="Describe what you see in the photo..."></textarea>
            <div class="word-count" id="wc">0 words</div>
            <div id="fb"></div>
        `;
        const ta = content.querySelector('#essay');
        const wc = content.querySelector('#wc');
        ta.addEventListener('input', () => {
            wc.textContent = `${countWords(ta.value)} words`;
        });
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
        if (remaining <= 15) el.classList.add('warning');
        if (remaining <= 5) el.classList.add('danger');
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
    // Volume scoring: 30+ words = 1.0, 15 = 0.5, 5 ≈ 0.17.
    const accuracy = Math.min(1, wc / 30);
    pushScore('writePhoto', accuracy);
    saveEssay('writePhoto', currentPhoto.alt, text, wc);
    ta.disabled = true;
    container.querySelector('#submit-btn').disabled = true;
    container.querySelector('#fb').innerHTML = `
        <div class="feedback ${accuracy >= 0.6 ? 'correct' : 'incorrect'}">
            ${wc} words written. ${accuracy >= 0.6 ? 'Nice work!' : 'Aim for at least 30 words next time.'}
        </div>
        <div class="btn-row">
            <button id="again">Another photo</button>
            <a href="#/dashboard" class="btn btn-secondary">Back to home</a>
        </div>
    `;
    container.querySelector('#again').addEventListener('click', () => render(container));
}

export function destroy() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
