// tts.js — Wrapper around the Web Speech API (SpeechSynthesis) for listening exercises.
// Browsers load voices asynchronously; we handle both the sync and async cases.

let cachedVoice = null;

function pickEnglishVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const preferences = [
        v => v.lang === 'en-US' && /Google|Samantha|Microsoft/i.test(v.name),
        v => v.lang === 'en-US',
        v => v.lang === 'en-GB',
        v => v.lang.startsWith('en'),
    ];
    for (const pref of preferences) {
        const match = voices.find(pref);
        if (match) return match;
    }
    return voices[0];
}

export function isTtsAvailable() {
    return 'speechSynthesis' in window;
}

export function ensureVoiceLoaded() {
    return new Promise(resolve => {
        if (!isTtsAvailable()) return resolve(null);
        if (cachedVoice) return resolve(cachedVoice);
        const initial = pickEnglishVoice();
        if (initial) {
            cachedVoice = initial;
            return resolve(initial);
        }
        window.speechSynthesis.onvoiceschanged = () => {
            cachedVoice = pickEnglishVoice();
            resolve(cachedVoice);
        };
        // Safety timeout: resolve without a specific voice so the browser uses its default.
        setTimeout(() => resolve(cachedVoice || null), 1500);
    });
}

export function speak(text, { rate = 0.95, onend } = {}) {
    if (!isTtsAvailable()) {
        alert('Your browser does not support speech synthesis. Try Chrome or Firefox.');
        onend && onend();
        return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (cachedVoice) u.voice = cachedVoice;
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    if (onend) u.onend = onend;
    window.speechSynthesis.speak(u);
}

export function stop() {
    if (isTtsAvailable()) window.speechSynthesis.cancel();
}
