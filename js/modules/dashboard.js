// dashboard.js — Home with progress, streak, adaptive level badges, and navigation.
// Aurora Bento layout: hero score, stat tiles, and per-exercise tiles.

import { getProgress, resetProgress, latestScore, dueVocabCount, getLevel } from '../storage.js';
import { estimateDetScore } from '../scoring.js';

// Sections with `adaptive: true` show a live level badge on their tile.
const SECTIONS = [
    { id: 'vocabulary',    route: '#/vocabulary',    emoji: '📚', title: 'Vocabulary',       desc: 'Flashcards with spaced repetition',    adaptive: true },
    { id: 'readComplete',  route: '#/read-complete', emoji: '📖', title: 'Read & Complete',  desc: 'Fill in the missing letters' },
    { id: 'readSelect',    route: '#/read-select',   emoji: '🔤', title: 'Read & Select',    desc: 'Spot the real English words' },
    { id: 'fillBlanks',    route: '#/fill-blanks',   emoji: '✏️', title: 'Grammar Blanks',   desc: 'Fill each gap with the correct option', adaptive: true },
    { id: 'listenType',    route: '#/listen-type',   emoji: '🎧', title: 'Listen & Type',    desc: 'Transcribe what you hear' },
    { id: 'listenSelect',  route: '#/listen-select', emoji: '👂', title: 'Listen & Select',  desc: 'Pick real words from audio' },
    { id: 'writePhoto',    route: '#/write-photo',   emoji: '🖼️', title: 'Write About Photo', desc: 'Describe an image (1 min)' },
    { id: 'writingSample', route: '#/writing-sample', emoji: '📝', title: 'Writing Sample',  desc: 'Timed essay (5 min)' },
];

function formatAccuracy(acc) {
    if (acc == null) return '—';
    return Math.round(acc * 100) + '%';
}

export function render(container) {
    const state = getProgress();
    const { score, band } = estimateDetScore(state);
    const due = dueVocabCount();

    const scoreDisplay = score != null ? score : '—';
    const scoreMax = score != null ? '<span class="score-sep">/ 160</span>' : '';
    const bandDisplay = band || 'No data yet — start practicing!';
    const streakDays = state.streakDays || 0;
    const streakLabel = streakDays === 1 ? 'day' : 'days';

    container.innerHTML = `
        <section class="bento" aria-label="Progress panel">
            <div class="bento-hero">
                <div class="eyebrow">DET · Estimated</div>
                <div class="score-number">${scoreDisplay}${scoreMax}</div>
                <div class="band">${bandDisplay}</div>
                <p class="hero-sub">Your score updates with every practice. Official DET scale: 10 to 160 points.</p>
            </div>

            <div class="card bento-stat">
                <div class="stat-label">🔥 Streak</div>
                <div class="stat-value">${streakDays}</div>
                <div class="stat-sub">${streakLabel} in a row</div>
            </div>

            <div class="card bento-stat">
                <div class="stat-label">📚 Due today</div>
                <div class="stat-value">${due}</div>
                <div class="stat-sub">words to review</div>
            </div>
        </section>

        <h1>Let's practice!</h1>
        <p>Pick an exercise. Adaptive modules auto-adjust difficulty as you go. Your progress is saved in your browser.</p>

        <section class="bento" id="sections-grid" aria-label="Exercises"></section>

        <div class="card" style="margin-top:var(--sp-5);">
            <h3>🏁 Mock test</h3>
            <p>Put every skill to the test in a mixed mini-exam with an estimated DET score.</p>
            <div class="btn-row">
                <a class="btn" href="#/mock-test">Start mock test</a>
            </div>
        </div>

        <div class="btn-row" style="margin-top:var(--sp-5);">
            <button class="btn-ghost" id="reset-btn" type="button">Reset progress</button>
        </div>
    `;

    const grid = container.querySelector('#sections-grid');
    for (const s of SECTIONS) {
        const latest = latestScore(s.id);
        const tile = document.createElement('a');
        tile.className = 'card bento-tile';
        tile.href = s.route;
        const levelBadge = s.adaptive
            ? `<span class="level-badge" title="Current adaptive level">${getLevel(s.id)}</span>`
            : '';
        tile.innerHTML = `
            <div class="tile-head">
                <div class="tile-emoji" aria-hidden="true">${s.emoji}</div>
                ${levelBadge}
            </div>
            <div class="tile-title">${s.title}</div>
            <div class="tile-desc">${s.desc}</div>
            <div>
                <div class="tile-stat-label">last attempt</div>
                <div class="tile-stat">${formatAccuracy(latest)}</div>
            </div>
        `;
        grid.appendChild(tile);
    }

    container.querySelector('#reset-btn').addEventListener('click', () => {
        if (confirm('Reset all your progress? This cannot be undone.')) {
            resetProgress();
            render(container);
        }
    });
}
