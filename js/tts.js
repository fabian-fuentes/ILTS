// tts.js — Wrapper del Web Speech API (SpeechSynthesis) para ejercicios de listening.
// Los navegadores cargan voces de forma asíncrona; manejamos ambos casos.

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
        // Timeout de seguridad: resolver sin voz explícita para que el navegador use la default
        setTimeout(() => resolve(cachedVoice || null), 1500);
    });
}

export function speak(text, { rate = 0.95, onend } = {}) {
    if (!isTtsAvailable()) {
        alert('Tu navegador no soporta síntesis de voz. Prueba con Chrome o Firefox.');
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
