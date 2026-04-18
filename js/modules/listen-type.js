// listen-type.js — "Listen and Type". TTS reads a sentence (up to 3 times),
// the learner transcribes it. 5 items per session.

import { loadData } from '../app.js';
import { pushScore } from '../storage.js';
import { speak, isTtsAvailable } from '../tts.js';

const TOTAL = 5;
let sentences = [];
let currentIdx = 0;
let totalAccuracy = 0;
let playsLeft = 3;

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9\s']/g, '').replace(/\s+/g, ' ').trim();
}

function wordSimilarity(expected, actual) {
    const e = normalize(expected).split(' ');
    const a = normalize(actual).split(' ');
    if (!e.length) return 0;
    // Count exact word matches (order-independent).
    let matches = 0;
    const aSet = new Set(a);
    e.forEach(w => { if (aSet.has(w)) matches += 1; });
    return matches / e.length;
}

export function render(container) {
    container.innerHTML = `
        <div class="header-bar">
            <h1>🎧 Listen & Type</h1>
            <a href="#/dashboard" class="btn-ghost btn">← Home</a>
        </div>
        <p>Listen to the sentence (up to 3 plays per question) and type it exactly as you heard it.</p>
        ${!isTtsAvailable() ? '<div class="feedback incorrect">⚠️ Your browser does not support speech synthesis. Try Chrome or Firefox.</div>' : ''}
        <div id="quiz-area"></div>
    `;
    loadData('listening.json').then(data => {
        sentences = shuffle(data.sentences).slice(0, TOTAL);
        currentIdx = 0;
        totalAccuracy = 0;
        renderItem(container);
    });
}

function renderItem(container) {
    const area = container.querySelector('#quiz-area');
    if (currentIdx >= sentences.length) {
        const acc = totalAccuracy / sentences.length;
        pushScore('listenType', acc);
        area.innerHTML = `
            <div class="card">
                <h2>Result</h2>
                <p>Average accuracy: <strong>${Math.round(acc * 100)}%</strong> across ${sentences.length} sentences.</p>
                <div class="btn-row">
                    <button id="again">Another session</button>
                    <a href="#/dashboard" class="btn btn-secondary">Back to home</a>
                </div>
            </div>
        `;
        area.querySelector('#again').addEventListener('click', () => render(container));
        return;
    }

    playsLeft = 3;
    const sentence = sentences[currentIdx];

    area.innerHTML = `
        <div class="progress-bar"><div class="fill" style="width:${(currentIdx / sentences.length) * 100}%"></div></div>
        <div class="card">
            <h3>Sentence ${currentIdx + 1} / ${sentences.length}</h3>
            <div class="play-area">
                <button id="play-btn" class="big-play">🔊 Listen</button>
                <div class="play-count" id="play-count">Plays left: ${playsLeft}</div>
            </div>
            <textarea id="answer" placeholder="Type what you hear..."></textarea>
            <div class="btn-row">
                <button id="check">Check</button>
            </div>
            <div id="fb"></div>
        </div>
    `;

    const playBtn = area.querySelector('#play-btn');
    const countEl = area.querySelector('#play-count');
    playBtn.addEventListener('click', () => {
        if (playsLeft <= 0) return;
        playsLeft -= 1;
        speak(sentence);
        countEl.textContent = `Plays left: ${playsLeft}`;
        if (playsLeft === 0) playBtn.disabled = true;
    });
    // Auto-play on load.
    setTimeout(() => playBtn.click(), 300);

    area.querySelector('#check').addEventListener('click', () => {
        const actual = area.querySelector('#answer').value;
        const score = wordSimilarity(sentence, actual);
        totalAccuracy += score;
        area.querySelector('#fb').innerHTML = `
            <div class="feedback ${score >= 0.8 ? 'correct' : 'incorrect'}">
                Match: <strong>${Math.round(score * 100)}%</strong><br>
                <small>Expected: "${sentence}"</small>
            </div>
            <div class="btn-row">
                <button id="next">Next →</button>
            </div>
        `;
        area.querySelector('#check').disabled = true;
        area.querySelector('#answer').disabled = true;
        area.querySelector('#next').addEventListener('click', () => {
            currentIdx += 1;
            renderItem(container);
        });
    });
}
