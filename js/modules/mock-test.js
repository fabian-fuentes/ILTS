// mock-test.js — ~10-minute mixed mock test. Combines 6 items of different
// types and computes an estimated DET score at the end.

import { loadData } from '../app.js';
import { pushScore, saveMockResult } from '../storage.js';
import { accuracyToDet, detToBand } from '../scoring.js';
import { speak, isTtsAvailable } from '../tts.js';

let items = [];
let currentIdx = 0;
let results = []; // { section, accuracy }

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function countWords(s) { return (s.trim().match(/\S+/g) || []).length; }

function normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9\s']/g, '').replace(/\s+/g, ' ').trim();
}

function wordSimilarity(expected, actual) {
    const e = normalize(expected).split(' ');
    const a = normalize(actual).split(' ');
    if (!e.length) return 0;
    let matches = 0;
    const aSet = new Set(a);
    e.forEach(w => { if (aSet.has(w)) matches += 1; });
    return matches / e.length;
}

export function render(container) {
    container.innerHTML = `
        <div class="header-bar">
            <h1>🏁 DET Mock Test</h1>
            <a href="#/dashboard" class="btn-ghost btn">← Home</a>
        </div>
        <p>6 mixed questions (Reading, Listening, Grammar, Writing). Your estimated score appears at the end.</p>
        <div id="mock-area"><div class="loader">Preparing questions...</div></div>
    `;
    Promise.all([
        loadData('reading.json'),
        loadData('grammar.json'),
        loadData('listening.json'),
        loadData('photos.json'),
    ]).then(([reading, grammar, listening, photos]) => {
        buildItems(reading, grammar, listening, photos);
        currentIdx = 0;
        results = [];
        renderItem(container);
    });
}

function buildItems(reading, grammar, listening, photos) {
    const grammarItems = shuffle(grammar).slice(0, 2);
    const rs = reading.readAndSelect[Math.floor(Math.random() * reading.readAndSelect.length)];
    const sentence = listening.sentences[Math.floor(Math.random() * listening.sentences.length)];
    const wl = listening.wordLists[Math.floor(Math.random() * listening.wordLists.length)];
    const photo = photos.photos[Math.floor(Math.random() * photos.photos.length)];

    items = [
        { type: 'grammar', data: grammarItems[0], section: 'fillBlanks' },
        { type: 'read-select', data: rs, section: 'readSelect' },
        { type: 'listen-type', data: sentence, section: 'listenType' },
        { type: 'grammar', data: grammarItems[1], section: 'fillBlanks' },
        { type: 'listen-select', data: wl, section: 'listenSelect' },
        { type: 'write-photo', data: photo, section: 'writePhoto' },
    ];
}

function renderItem(container) {
    const area = container.querySelector('#mock-area');
    if (currentIdx >= items.length) {
        finish(container);
        return;
    }
    const it = items[currentIdx];
    area.innerHTML = `<div class="progress-bar"><div class="fill" style="width:${(currentIdx / items.length) * 100}%"></div></div>
        <div class="subtitle">Question ${currentIdx + 1} / ${items.length}</div>
        <div id="item-area"></div>`;

    const itemArea = area.querySelector('#item-area');
    switch (it.type) {
        case 'grammar': return renderGrammar(itemArea, it, container);
        case 'read-select': return renderReadSelect(itemArea, it, container);
        case 'listen-type': return renderListenType(itemArea, it, container);
        case 'listen-select': return renderListenSelect(itemArea, it, container);
        case 'write-photo': return renderWritePhoto(itemArea, it, container);
    }
}

function advance(container, section, accuracy) {
    results.push({ section, accuracy });
    pushScore(section, accuracy);
    currentIdx += 1;
    setTimeout(() => renderItem(container), 1200);
}

function renderGrammar(area, it, container) {
    const parts = it.data.text.split('___');
    const opts = shuffle(it.data.options);
    area.innerHTML = `
        <div class="card">
            <h3>Grammar</h3>
            <p style="color:var(--text); font-size:1.1rem;">
                ${parts[0]}<select id="ans" class="inline-input">
                    <option value="">—</option>
                    ${opts.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>${parts[1] || ''}
            </p>
            <div class="btn-row"><button id="check">Check</button></div>
            <div id="fb"></div>
        </div>
    `;
    area.querySelector('#check').addEventListener('click', () => {
        const val = area.querySelector('#ans').value;
        if (!val) return;
        const right = val === it.data.answer;
        area.querySelector('#fb').innerHTML = `<div class="feedback ${right ? 'correct' : 'incorrect'}">
            ${right ? '✓ Correct' : `✗ Correct answer: ${it.data.answer}`}
        </div>`;
        area.querySelector('#check').disabled = true;
        area.querySelector('#ans').disabled = true;
        advance(container, it.section, right ? 1 : 0);
    });
}

function renderReadSelect(area, it, container) {
    const words = shuffle([
        ...it.data.real.map(w => ({ text: w, real: true })),
        ...it.data.fake.map(w => ({ text: w, real: false })),
    ]);
    const selected = new Set();
    area.innerHTML = `
        <div class="card">
            <h3>Read & Select</h3>
            <p>Tap only the real English words.</p>
            <div class="word-grid" id="wg"></div>
            <div class="btn-row"><button id="check">Check</button></div>
            <div id="fb"></div>
        </div>
    `;
    const grid = area.querySelector('#wg');
    words.forEach((w, i) => {
        const chip = document.createElement('div');
        chip.className = 'word-chip';
        chip.textContent = w.text;
        chip.addEventListener('click', () => {
            if (chip.classList.contains('locked')) return;
            if (selected.has(i)) { selected.delete(i); chip.classList.remove('selected'); }
            else { selected.add(i); chip.classList.add('selected'); }
        });
        grid.appendChild(chip);
    });
    area.querySelector('#check').addEventListener('click', () => {
        const chips = [...grid.querySelectorAll('.word-chip')];
        let ok = 0;
        chips.forEach((chip, i) => {
            chip.classList.add('locked');
            const correct = (words[i].real === selected.has(i));
            chip.classList.add(correct ? 'correct' : 'incorrect');
            if (correct) ok += 1;
        });
        const acc = ok / chips.length;
        area.querySelector('#fb').innerHTML = `<div class="feedback ${acc >= 0.7 ? 'correct' : 'incorrect'}">${ok}/${chips.length}</div>`;
        area.querySelector('#check').disabled = true;
        advance(container, it.section, acc);
    });
}

function renderListenType(area, it, container) {
    area.innerHTML = `
        <div class="card">
            <h3>Listen & Type</h3>
            ${!isTtsAvailable() ? '<div class="feedback incorrect">⚠️ TTS not available</div>' : ''}
            <div class="play-area">
                <button id="play" class="big-play">🔊 Listen</button>
            </div>
            <textarea id="ans" placeholder="Type what you hear..."></textarea>
            <div class="btn-row"><button id="check">Check</button></div>
            <div id="fb"></div>
        </div>
    `;
    let plays = 3;
    const playBtn = area.querySelector('#play');
    playBtn.addEventListener('click', () => {
        if (plays <= 0) return;
        plays -= 1;
        speak(it.data);
        playBtn.textContent = `🔊 Listen (${plays} left)`;
        if (plays <= 0) playBtn.disabled = true;
    });
    setTimeout(() => playBtn.click(), 400);
    area.querySelector('#check').addEventListener('click', () => {
        const actual = area.querySelector('#ans').value;
        const score = wordSimilarity(it.data, actual);
        area.querySelector('#fb').innerHTML = `<div class="feedback ${score >= 0.7 ? 'correct' : 'incorrect'}">
            ${Math.round(score * 100)}% — "${it.data}"
        </div>`;
        area.querySelector('#check').disabled = true;
        area.querySelector('#ans').disabled = true;
        advance(container, it.section, score);
    });
}

function renderListenSelect(area, it, container) {
    const words = shuffle([
        ...it.data.real.map(w => ({ text: w, real: true })),
        ...it.data.fake.map(w => ({ text: w, real: false })),
    ]);
    const selected = new Set();
    area.innerHTML = `
        <div class="card">
            <h3>Listen & Select</h3>
            ${!isTtsAvailable() ? '<div class="feedback incorrect">⚠️ TTS not available</div>' : ''}
            <div class="play-area">
                <button id="play" class="big-play">🔊 Play</button>
            </div>
            <p>Tick only the real English words.</p>
            <div class="word-grid" id="wg"></div>
            <div class="btn-row"><button id="check">Check</button></div>
            <div id="fb"></div>
        </div>
    `;
    const playBtn = area.querySelector('#play');
    let plays = 2;
    playBtn.addEventListener('click', () => {
        if (plays <= 0) return;
        plays -= 1;
        speak(words.map(w => w.text).join(', '));
        playBtn.textContent = `🔊 Play (${plays} left)`;
        if (plays <= 0) playBtn.disabled = true;
    });
    setTimeout(() => playBtn.click(), 400);
    const grid = area.querySelector('#wg');
    words.forEach((w, i) => {
        const chip = document.createElement('div');
        chip.className = 'word-chip';
        chip.textContent = w.text;
        chip.addEventListener('click', () => {
            if (chip.classList.contains('locked')) return;
            if (selected.has(i)) { selected.delete(i); chip.classList.remove('selected'); }
            else { selected.add(i); chip.classList.add('selected'); }
        });
        grid.appendChild(chip);
    });
    area.querySelector('#check').addEventListener('click', () => {
        const chips = [...grid.querySelectorAll('.word-chip')];
        let ok = 0;
        chips.forEach((chip, i) => {
            chip.classList.add('locked');
            const correct = (words[i].real === selected.has(i));
            chip.classList.add(correct ? 'correct' : 'incorrect');
            if (correct) ok += 1;
        });
        const acc = ok / chips.length;
        area.querySelector('#fb').innerHTML = `<div class="feedback ${acc >= 0.7 ? 'correct' : 'incorrect'}">${ok}/${chips.length}</div>`;
        area.querySelector('#check').disabled = true;
        advance(container, it.section, acc);
    });
}

function renderWritePhoto(area, it, container) {
    area.innerHTML = `
        <div class="card">
            <h3>Write About the Photo</h3>
            <div class="photo-frame">
                <img src="${it.data.url}" alt="${it.data.alt}" onerror="this.style.opacity=0.3;">
            </div>
            <textarea id="ans" placeholder="Describe what you see..."></textarea>
            <div class="word-count" id="wc">0 words</div>
            <div class="btn-row"><button id="check">Submit</button></div>
            <div id="fb"></div>
        </div>
    `;
    const ta = area.querySelector('#ans');
    const wc = area.querySelector('#wc');
    ta.addEventListener('input', () => { wc.textContent = `${countWords(ta.value)} words`; });
    area.querySelector('#check').addEventListener('click', () => {
        const n = countWords(ta.value);
        const acc = Math.min(1, n / 30);
        area.querySelector('#fb').innerHTML = `<div class="feedback ${acc >= 0.6 ? 'correct' : 'incorrect'}">${n} words</div>`;
        area.querySelector('#check').disabled = true;
        ta.disabled = true;
        advance(container, it.section, acc);
    });
}

function finish(container) {
    const area = container.querySelector('#mock-area');
    const overall = results.reduce((a, r) => a + r.accuracy, 0) / results.length;
    const score = accuracyToDet(overall);
    const band = detToBand(score);
    saveMockResult(score, results.map(r => ({ section: r.section, acc: +r.accuracy.toFixed(2) })));
    area.innerHTML = `
        <div class="score-banner">
            <div class="score">${score}</div>
            <div class="label">Estimated DET score</div>
            <div class="label" style="margin-top:4px;">${band}</div>
        </div>
        <div class="card">
            <h3>Breakdown</h3>
            <ul style="list-style:none; padding:0;">
                ${results.map(r => `<li style="margin:6px 0; color:var(--text-dim);">${r.section}: <strong style="color:var(--text)">${Math.round(r.accuracy * 100)}%</strong></li>`).join('')}
            </ul>
        </div>
        <div class="btn-row">
            <button id="again">Another mock test</button>
            <a href="#/dashboard" class="btn btn-secondary">Back to home</a>
        </div>
    `;
    area.querySelector('#again').addEventListener('click', () => render(container));
}
