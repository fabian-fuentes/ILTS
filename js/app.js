// app.js — Bootstrap + hash router.
// Cada módulo exporta render(container, params?) y opcionalmente destroy().

import { ensureVoiceLoaded } from './tts.js';
import { touchStreak } from './storage.js';

import * as dashboard from './modules/dashboard.js';
import * as vocabulary from './modules/vocabulary.js';
import * as readComplete from './modules/read-complete.js';
import * as readSelect from './modules/read-select.js';
import * as fillBlanks from './modules/fill-blanks.js';
import * as listenType from './modules/listen-type.js';
import * as listenSelect from './modules/listen-select.js';
import * as writePhoto from './modules/write-photo.js';
import * as writingSample from './modules/writing-sample.js';
import * as mockTest from './modules/mock-test.js';

const routes = {
    '': dashboard,
    'dashboard': dashboard,
    'vocabulary': vocabulary,
    'read-complete': readComplete,
    'read-select': readSelect,
    'fill-blanks': fillBlanks,
    'listen-type': listenType,
    'listen-select': listenSelect,
    'write-photo': writePhoto,
    'writing-sample': writingSample,
    'mock-test': mockTest,
};

let currentModule = null;

async function handleRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const [name] = hash.split('?');
    const module = routes[name] || dashboard;
    const container = document.getElementById('app');

    if (currentModule && currentModule.destroy) {
        try { currentModule.destroy(); } catch (e) { console.warn(e); }
    }
    container.innerHTML = '';
    currentModule = module;
    try {
        await module.render(container);
    } catch (err) {
        console.error('Render error:', err);
        container.innerHTML = `<div class="card"><h2>Error</h2><p>${err.message}</p><a class="btn" href="#/dashboard">Volver al inicio</a></div>`;
    }
    window.scrollTo(0, 0);
}

function init() {
    touchStreak();
    ensureVoiceLoaded();
    window.addEventListener('hashchange', handleRoute);
    if (!window.location.hash) {
        window.location.hash = '#/dashboard';
    } else {
        handleRoute();
    }
}

// Helper global para cargar JSON (usado por los módulos)
export async function loadData(file) {
    const res = await fetch(`data/${file}`);
    if (!res.ok) throw new Error(`No se pudo cargar data/${file}`);
    return res.json();
}

init();
