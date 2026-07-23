// AfroPasso — on-site event submission form. Writes to Firestore `queue`
// (intake only). Lazy-loads the Firebase Web SDK from CDN on first real send.
// Public config below is safe to commit (Firebase web config is not a secret).
const firebaseConfig = {
  apiKey: "AIzaSyBX-M3QCafT1kZYs64ICHgk1-G3Vp_3VZA",
  authDomain: "afropasso.firebaseapp.com",
  projectId: "afropasso",
  storageBucket: "afropasso.firebasestorage.app",
  messagingSenderId: "729726122022",
  appId: "1:729726122022:web:c695ec4c290e9e52f64ee7",
  measurementId: "G-7Q0NTQYCCP"
};
const SDK = 'https://www.gstatic.com/firebasejs/10.12.0';
const EVENT_TYPES = new Set(['social', 'warsztaty', 'festiwal']);

let stylesLoaded = false;
let firebaseWrite = null; // cached bound writer once SDK is initialised

function q(sel, root = document) { return root.querySelector(sel); }

function esc(value) {
    return String(value).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadStyleOptions() {
    if (stylesLoaded) return;
    const container = q('#submit-styles-options');
    try {
        const res = await fetch('./data/dances.json');
        const dances = (await res.json()).dances;
        container.innerHTML = dances.map(d =>
            `<label class="submit-style-option"><input type="checkbox" name="styles" value="${esc(d.slug)}"> ${esc(d.names.pl)}</label>`
        ).join('');
        stylesLoaded = true;
    } catch (e) {
        container.innerHTML = '<p class="submit-error">Nie udało się wczytać listy stylów.</p>';
    }
}

function readForm(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const styles = Array.from(form.querySelectorAll('input[name=styles]:checked')).map(el => el.value);
    const payload = {
        kind: 'event',
        source: 'form',
        trust: 'public',
        title: (data.title || '').trim(),
        type: data.type || '',
        city: (data.city || '').trim(),
        date_start: data.date_start || '',
        styles,
        url: (data.url || '').trim(),
        contactEmail: (data.contactEmail || '').trim(),
        organizer: (data.organizer || '').trim(),
        notes: (data.notes || '').trim(),
        _hp: data._hp || ''
    };
    for (const opt of ['date_end', 'time', 'venue', 'price']) {
        const v = (data[opt] || '').trim();
        if (v) payload[opt] = v;
    }
    return payload;
}

function validate(payload) {
    const errors = [];
    if (!payload.title) errors.push('nazwę wydarzenia');
    if (!EVENT_TYPES.has(payload.type)) errors.push('typ');
    if (!payload.city) errors.push('miasto');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date_start)) errors.push('datę rozpoczęcia');
    if (payload.styles.length === 0) errors.push('przynajmniej jeden styl');
    if (!/^https?:\/\/.+/.test(payload.url)) errors.push('poprawny link (http/https)');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.contactEmail)) errors.push('poprawny e-mail');
    return errors;
}

async function sendToBackend(payload) {
    // Test seam: e2e sets this to avoid touching Firebase.
    if (typeof window.__submitOverride === 'function') {
        return window.__submitOverride(payload);
    }
    if (!firebaseWrite) {
        const { initializeApp } = await import(`${SDK}/firebase-app.js`);
        const { getFirestore, collection, addDoc, serverTimestamp } = await import(`${SDK}/firebase-firestore.js`);
        const db = getFirestore(initializeApp(firebaseConfig));
        firebaseWrite = (p) => addDoc(collection(db, 'queue'),
            { ...p, status: 'pending', submittedAt: serverTimestamp() });
    }
    return firebaseWrite(payload);
}

function openDialog() {
    const dialog = q('#event-submit-dialog');
    q('#submit-error').classList.add('hidden');
    q('#submit-success').classList.add('hidden');
    loadStyleOptions();
    dialog.showModal();
}

async function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const errorEl = q('#submit-error');
    const successEl = q('#submit-success');
    const payload = readForm(form);

    // Honeypot: pretend success, send nothing.
    if (payload._hp) { successEl.classList.remove('hidden'); return; }

    const errors = validate(payload);
    if (errors.length > 0) {
        errorEl.textContent = 'Uzupełnij: ' + errors.join(', ') + '.';
        errorEl.classList.remove('hidden');
        successEl.classList.add('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    // Keep `_hp: ''` on the payload — the Firestore rule requires the field to be
    // present and empty (`d._hp == ''`); deleting it would make every write fail.

    const sendBtn = q('#submit-send');
    sendBtn.disabled = true;
    try {
        await sendToBackend(payload);
        successEl.classList.remove('hidden');
        form.reset();
    } catch (e) {
        errorEl.textContent = 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie później.';
        errorEl.classList.remove('hidden');
    } finally {
        sendBtn.disabled = false;
    }
}

function init() {
    const dialog = q('#event-submit-dialog');
    if (!dialog) return;
    document.querySelectorAll('.submit-event-cta').forEach(btn =>
        btn.addEventListener('click', openDialog));
    dialog.querySelectorAll('[data-close]').forEach(btn =>
        btn.addEventListener('click', () => dialog.close()));
    q('#event-submit-form').addEventListener('submit', handleSubmit);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
