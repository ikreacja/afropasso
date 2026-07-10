# Firebase Event Submissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an on-site "Zgłoś wydarzenie" form on `#/events` that writes submissions to a Firebase Firestore `submissions` collection (intake-only), plus a curator CLI to review and publish approved submissions into the static `data/events.json`.

**Architecture:** Firebase is only the inbox — the public list stays `data/events.json`, rendered unchanged. A standalone browser ES module (`event-submit.js`) renders a `<dialog>` form and lazy-loads the Firebase Web SDK from CDN to write submissions. A Node admin CLI (`tools/pull-submissions.js`, `firebase-admin` + service-account key) lists/approves/rejects submissions, reusing pure functions. Nothing reaches the live site without `git push`.

**Tech Stack:** Static HTML/CSS/JS (no build step), Firebase Web SDK v10.12.0 via CDN ES modules, `firebase-admin` (Node, in `tools/` only), Playwright e2e with a `window.__submitOverride` test seam, `node --test` for pure functions, `firebase-tools` CLI for deploying rules.

**Spec:** `docs/superpowers/specs/2026-07-10-firebase-event-submissions-design.md`

**Working-tree note:** `.gitignore`, `AGENTS.md`, `data/events.json` may already have uncommitted or committed local changes; edit forward, use targeted `git add`, never `git checkout`.

**Owner-only prerequisites (NOT part of these tasks — the human does them in the Firebase console):** create a Spark project, enable Firestore, register a Web App and paste its `firebaseConfig` into `event-submit.js`, `firebase deploy --only firestore:rules`, generate a service-account key to `tools/service-account.json`, and `cd tools && npm install`. Every task below works and is testable WITHOUT these (tests use the seam / pure functions).

---

### Task 1: Scaffolding — gitignore, tools package, Firestore rules

**Files:**
- Modify: `.gitignore`
- Create: `tools/package.json`, `firestore.rules`, `firebase.json`

- [ ] **Step 1: Append to `.gitignore`** (add these two lines at the end; do not remove existing content):

```
tools/node_modules/
tools/service-account.json
```

- [ ] **Step 2: Create `tools/package.json`**:

```json
{
    "name": "afropasso-tools",
    "private": true,
    "version": "1.0.0",
    "description": "Curator tooling for AfroPasso (not part of the served static site).",
    "dependencies": {
        "firebase-admin": "^12.7.0"
    }
}
```

- [ ] **Step 3: Create `firestore.rules`**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /submissions/{id} {
      allow create: if isValidSubmission(request.resource.data);
      allow read, update, delete: if false;
    }
    function isValidSubmission(d) {
      return d.status == 'pending'
        && d._hp == ''
        && d.title is string && d.title.size() > 0 && d.title.size() <= 200
        && d.type in ['social', 'warsztaty', 'festiwal']
        && d.city is string && d.city.size() > 0 && d.city.size() <= 100
        && d.date_start is string && d.date_start.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}')
        && d.url is string && d.url.size() > 0 && d.url.size() <= 500
        && d.contactEmail is string && d.contactEmail.size() > 0 && d.contactEmail.size() <= 200
        && d.styles is list && d.styles.size() > 0 && d.styles.size() <= 12
        && d.submittedAt == request.time;
    }
  }
}
```

- [ ] **Step 4: Create `firebase.json`**:

```json
{
    "firestore": {
        "rules": "firestore.rules"
    }
}
```

- [ ] **Step 5: Verify** — `node -e "JSON.parse(require('fs').readFileSync('tools/package.json')); JSON.parse(require('fs').readFileSync('firebase.json')); console.log('json ok')"` → prints `json ok`. Confirm `.gitignore` contains the two new lines: `grep -c "service-account.json" .gitignore` → `1`.

- [ ] **Step 6: Commit**

```bash
git add .gitignore tools/package.json firestore.rules firebase.json
git commit -m "Scaffold Firebase submissions: gitignore, tools package, Firestore rules"
```

### Task 2: Pure functions `tools/submission-core.js` (TDD)

**Files:**
- Create: `tools/submission-core.js`, `tools/submission-core.test.js`

- [ ] **Step 1: Write the failing tests** — `tools/submission-core.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { validateSubmission, mapSubmissionToEvent } = require('./submission-core.js');

const KNOWN = ['kizomba', 'semba', 'tarraxo'];
const VALID = {
    title: 'Kizomba Social', type: 'social', city: 'Warszawa',
    date_start: '2030-09-12', styles: ['kizomba'], url: 'https://fb.com/e/1',
    contactEmail: 'ktos@example.com', organizer: 'Studio X',
    notes: 'zaproszenie', _hp: '', status: 'pending'
};

test('validateSubmission accepts a complete valid submission', () => {
    assert.deepEqual(validateSubmission(VALID, KNOWN), []);
});

test('validateSubmission rejects missing title, bad type, bad date, unknown style, empty styles, bad email', () => {
    const errs = validateSubmission(
        { title: '', type: 'koncert', city: 'X', date_start: '12.09.2030',
          styles: [], url: 'https://x', contactEmail: 'nope' }, KNOWN);
    assert.ok(errs.some(e => e.includes('title')));
    assert.ok(errs.some(e => e.includes('type')));
    assert.ok(errs.some(e => e.includes('date_start')));
    assert.ok(errs.some(e => e.toLowerCase().includes('styl')));
    assert.ok(errs.some(e => e.toLowerCase().includes('e-mail')));
});

test('validateSubmission rejects an unknown style slug', () => {
    const errs = validateSubmission({ ...VALID, styles: ['tango'] }, KNOWN);
    assert.ok(errs.some(e => e.includes('tango')));
});

test('mapSubmissionToEvent strips private fields and sets source/featured/id', () => {
    const ev = mapSubmissionToEvent(VALID);
    assert.equal(ev.source, 'zgloszenie');
    assert.equal(ev.featured, false);
    assert.equal(ev.id, 'kizomba-social-warszawa-2030-09-12');
    assert.equal(ev.contactEmail, undefined);
    assert.equal(ev.notes, undefined);
    assert.equal(ev._hp, undefined);
    assert.equal(ev.status, undefined);
    assert.equal(ev.organizer, 'Studio X');
});

test('mapSubmissionToEvent keeps optional fields only when present', () => {
    const ev = mapSubmissionToEvent({ ...VALID, date_end: '2030-09-14', time: '21:00', venue: 'Klub', price: '30 zł' });
    assert.equal(ev.date_end, '2030-09-14');
    assert.equal(ev.time, '21:00');
    assert.equal(ev.venue, 'Klub');
    assert.equal(ev.price, '30 zł');
    const bare = mapSubmissionToEvent(VALID);
    assert.equal('date_end' in bare, false);
    assert.equal('time' in bare, false);
});
```

- [ ] **Step 2: Run to verify FAIL** — `node --test tools/submission-core.test.js` → fails with `Cannot find module './submission-core.js'`.

- [ ] **Step 3: Implement `tools/submission-core.js`**:

```js
'use strict';
const { validateEvent, slugifyEvent } = require('./add-event.js');

function mapSubmissionToEvent(sub) {
    const event = {
        id: slugifyEvent(sub.title || '', sub.city || '', sub.date_start || ''),
        title: sub.title,
        type: sub.type,
        styles: Array.isArray(sub.styles) ? sub.styles : [],
        city: sub.city,
        date_start: sub.date_start,
        url: sub.url,
        featured: false,
        organizer: sub.organizer || '',
        source: 'zgloszenie'
    };
    if (sub.date_end) event.date_end = sub.date_end;
    if (sub.time) event.time = sub.time;
    if (sub.venue) event.venue = sub.venue;
    if (sub.price) event.price = sub.price;
    return event;
}

function validateSubmission(sub, knownStyleSlugs) {
    // Reuse event-level checks (title/city/url required, type enum, date format, known style slugs).
    const errors = validateEvent(mapSubmissionToEvent(sub), knownStyleSlugs, []);
    if (!Array.isArray(sub.styles) || sub.styles.length === 0) {
        errors.push('Wybierz przynajmniej jeden styl tańca');
    }
    if (!sub.contactEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sub.contactEmail)) {
        errors.push('Podaj poprawny e-mail kontaktowy');
    }
    return errors;
}

module.exports = { validateSubmission, mapSubmissionToEvent };
```

- [ ] **Step 4: Run to verify PASS** — `node --test tools/submission-core.test.js` → `pass 5 / fail 0`.

- [ ] **Step 5: Commit**

```bash
git add tools/submission-core.js tools/submission-core.test.js
git commit -m "Add submission-core: validate + map submission to event (TDD)"
```

### Task 3: Modal markup, button + wiring changes

**Files:**
- Modify: `index.html` (events view: the two `.submit-event-cta` anchors → buttons; add `<dialog>`; add module `<script>`), `app.js` (remove dead submit-link wiring)

- [ ] **Step 1: Convert the two submit CTAs to buttons** in `index.html`. Find inside `#events-view`:

```html
<a class="btn-primary submit-event-cta" href="#" target="_blank" rel="noopener">Zgłoś wydarzenie</a>
```
(inside `#events-empty`) and
```html
<a id="submit-event-link" class="btn-secondary submit-event-cta" href="#" target="_blank" rel="noopener">Zgłoś wydarzenie</a>
```
(inside `.events-submit`). Replace them respectively with:

```html
<button type="button" class="btn-primary submit-event-cta">Zgłoś wydarzenie</button>
```
and
```html
<button type="button" class="btn-secondary submit-event-cta">Zgłoś wydarzenie</button>
```

- [ ] **Step 2: Add the dialog markup** just before the closing `</div>` of `#events-view` (after the `.schools-section`):

```html
<dialog id="event-submit-dialog" class="submit-dialog" aria-labelledby="submit-dialog-title">
    <form id="event-submit-form" method="dialog" class="submit-form" novalidate>
        <div class="submit-dialog-head">
            <h2 id="submit-dialog-title">Zgłoś wydarzenie</h2>
            <button type="button" class="submit-dialog-close" data-close aria-label="Zamknij">&times;</button>
        </div>
        <p class="submit-intro">Dodamy je po weryfikacji. Pola z gwiazdką są wymagane.</p>

        <label>Nazwa wydarzenia *<input type="text" name="title" maxlength="200" required></label>
        <label>Typ *
            <select name="type" required>
                <option value="">— wybierz —</option>
                <option value="social">Potańcówka / social</option>
                <option value="warsztaty">Warsztaty</option>
                <option value="festiwal">Festiwal</option>
            </select>
        </label>
        <label>Miasto *<input type="text" name="city" maxlength="100" required></label>
        <div class="submit-row">
            <label>Data od *<input type="date" name="date_start" required></label>
            <label>Data do<input type="date" name="date_end"></label>
        </div>
        <div class="submit-row">
            <label>Godzina<input type="text" name="time" placeholder="np. 21:00" maxlength="20"></label>
            <label>Cena<input type="text" name="price" placeholder="np. 30 zł" maxlength="40"></label>
        </div>
        <label>Miejsce<input type="text" name="venue" maxlength="120"></label>
        <fieldset class="submit-styles">
            <legend>Style tańca *</legend>
            <div id="submit-styles-options" class="submit-styles-options"></div>
        </fieldset>
        <label>Link do wydarzenia *<input type="url" name="url" maxlength="500" placeholder="https://..." required></label>
        <label>Organizator<input type="text" name="organizer" maxlength="120"></label>
        <label>Twój e-mail (kontakt, nie publikujemy) *<input type="email" name="contactEmail" maxlength="200" required></label>
        <label>Dodatkowe informacje<textarea name="notes" rows="3" maxlength="1000"></textarea></label>

        <input type="text" name="_hp" class="submit-hp" tabindex="-1" autocomplete="off" aria-hidden="true">

        <p id="submit-error" class="submit-error hidden" role="alert"></p>
        <p id="submit-success" class="submit-success hidden" role="status">Dziękujemy! Zgłoszenie czeka na weryfikację.</p>

        <div class="submit-actions">
            <button type="button" class="btn-tertiary" data-close>Anuluj</button>
            <button type="submit" class="btn-primary" id="submit-send">Wyślij zgłoszenie</button>
        </div>
    </form>
</dialog>
```

- [ ] **Step 3: Load the module.** In `index.html`, immediately after the existing `<script src="app.js"></script>` line, add:

```html
<script type="module" src="event-submit.js"></script>
```

- [ ] **Step 4: Remove dead submit-link wiring in `app.js`.** Delete the constant near the globals:

```js
const EVENT_SUBMIT_FORM_URL = 'https://forms.gle/REPLACE-WITH-REAL-FORM';
```

In the `elements.events` object literal, delete the line:

```js
        submitLinks: null,
```

In `initializeElements`, delete:

```js
    elements.events.submitLinks = document.querySelectorAll('.submit-event-cta');
```

In `setupEventListeners`, delete:

```js
    elements.events.submitLinks.forEach(link => { link.href = EVENT_SUBMIT_FORM_URL; });
```

- [ ] **Step 5: Verify** — `node --check app.js` → clean. Serve is running at `http://localhost:8123`; reload `#/events` — the page still renders, the two "Zgłoś wydarzenie" are now buttons (clicking does nothing yet — handler arrives in Task 5), no console errors.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js
git commit -m "Add submission dialog markup; drop dead Google Form wiring"
```

### Task 4: Failing e2e for the submission form

**Files:**
- Create: `/tmp/afropasso-submit.test.js` (throwaway; not committed)

- [ ] **Step 1: Ensure server is running** (started by the controller): `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8123/index.html` → `200`.

- [ ] **Step 2: Write the suite** — `/tmp/afropasso-submit.test.js`:

```js
const { chromium } = require('playwright');
const TARGET_URL = 'http://localhost:8123';
let failures = 0;
function assert(cond, label) { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + label); if (!cond) failures++; }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(TARGET_URL + '#/events', { waitUntil: 'networkidle' });
  // Install the test seam so no real Firebase is hit.
  await page.evaluate(() => {
    window.__submitCalls = [];
    window.__submitOverride = (payload) => { window.__submitCalls.push(payload); return Promise.resolve(); };
  });

  // Open dialog from the always-present ".events-submit" button (the last submit CTA).
  await page.locator('.submit-event-cta').last().click();
  await page.waitForTimeout(150);
  assert(await page.locator('#event-submit-dialog').evaluate(d => d.open), 'dialog opens on CTA click');
  assert(await page.locator('#submit-styles-options input[type=checkbox]').count() >= 8, 'style checkboxes populated from dances.json');

  // Submit empty → validation error, no backend call.
  await page.locator('#submit-send').click();
  await page.waitForTimeout(100);
  assert(!(await page.locator('#submit-error').evaluate(el => el.classList.contains('hidden'))), 'empty submit shows error');
  assert(await page.evaluate(() => window.__submitCalls.length) === 0, 'empty submit does not call backend');

  // Fill a valid submission.
  await page.fill('input[name=title]', 'Testowa Potańcówka');
  await page.selectOption('select[name=type]', 'social');
  await page.fill('input[name=city]', 'Wrocław');
  await page.fill('input[name=date_start]', '2030-10-05');
  await page.fill('input[name=url]', 'https://www.facebook.com/events/999');
  await page.fill('input[name=contactEmail]', 'ja@example.com');
  await page.locator('#submit-styles-options input[value=kizomba]').check();
  await page.locator('#submit-send').click();
  await page.waitForTimeout(150);
  const calls = await page.evaluate(() => window.__submitCalls);
  assert(calls.length === 1, 'valid submit calls backend once');
  assert(calls[0] && calls[0].title === 'Testowa Potańcówka' && calls[0].city === 'Wrocław'
    && calls[0].type === 'social' && Array.isArray(calls[0].styles) && calls[0].styles.includes('kizomba')
    && calls[0].contactEmail === 'ja@example.com', 'payload has the expected fields');
  assert(!(await page.locator('#submit-success').evaluate(el => el.classList.contains('hidden'))), 'success message shown');

  // Honeypot: a filled _hp must block the backend call.
  await page.goto(TARGET_URL + '#/events', { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__submitCalls = []; window.__submitOverride = (p) => { window.__submitCalls.push(p); return Promise.resolve(); }; });
  await page.locator('.submit-event-cta').last().click();
  await page.waitForTimeout(100);
  await page.fill('input[name=title]', 'Bot');
  await page.selectOption('select[name=type]', 'social');
  await page.fill('input[name=city]', 'X');
  await page.fill('input[name=date_start]', '2030-10-05');
  await page.fill('input[name=url]', 'https://x/1');
  await page.fill('input[name=contactEmail]', 'bot@example.com');
  await page.locator('#submit-styles-options input[value=kizomba]').check();
  await page.evaluate(() => { document.querySelector('input[name=_hp]').value = 'spam'; });
  await page.locator('#submit-send').click();
  await page.waitForTimeout(150);
  assert(await page.evaluate(() => window.__submitCalls.length) === 0, 'honeypot blocks backend call');

  assert(errors.length === 0, 'no page errors: ' + JSON.stringify(errors));
  console.log(failures === 0 ? '\nALL TESTS PASSED' : '\n' + failures + ' FAILED');
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
```

- [ ] **Step 3: Run and verify it FAILS** — `cd ~/.claude/plugins/marketplaces/playwright-skill/skills/playwright-skill && node run.js /tmp/afropasso-submit.test.js`. Expected: FAIL at `dialog opens on CTA click` (no handler / dialog logic yet — `event-submit.js` does not exist).

### Task 5: Implement `event-submit.js`

**Files:**
- Create: `event-submit.js`

- [ ] **Step 1: Create `event-submit.js`** (browser ES module):

```js
// AfroPasso — on-site event submission form. Writes to Firestore `submissions`
// (intake only). Lazy-loads the Firebase Web SDK from CDN on first real send.
// Public config below is safe to commit (Firebase web config is not a secret).

const FIREBASE_CONFIG = {
    // TODO(owner): paste your project's firebaseConfig here after registering a Web App.
    apiKey: 'REPLACE_ME',
    authDomain: 'REPLACE_ME.firebaseapp.com',
    projectId: 'REPLACE_ME',
    storageBucket: 'REPLACE_ME.appspot.com',
    messagingSenderId: 'REPLACE_ME',
    appId: 'REPLACE_ME'
};
const SDK = 'https://www.gstatic.com/firebasejs/10.12.0';
const EVENT_TYPES = new Set(['social', 'warsztaty', 'festiwal']);

let stylesLoaded = false;
let firebaseWrite = null; // cached bound writer once SDK is initialised

function q(sel, root = document) { return root.querySelector(sel); }

async function loadStyleOptions() {
    if (stylesLoaded) return;
    const container = q('#submit-styles-options');
    try {
        const res = await fetch('./data/dances.json');
        const dances = (await res.json()).dances;
        container.innerHTML = dances.map(d =>
            `<label class="submit-style-option"><input type="checkbox" name="styles" value="${d.slug}"> ${d.names.pl}</label>`
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
        const db = getFirestore(initializeApp(FIREBASE_CONFIG));
        firebaseWrite = (p) => addDoc(collection(db, 'submissions'),
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
    delete payload._hp;

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
```

- [ ] **Step 2: Run the Task 4 e2e — verify PASS** — `cd ~/.claude/plugins/marketplaces/playwright-skill/skills/playwright-skill && node run.js /tmp/afropasso-submit.test.js` → `ALL TESTS PASSED`, exit 0. (The seam means no real Firebase is contacted.)

- [ ] **Step 3: Commit**

```bash
git add event-submit.js
git commit -m "Add on-site event submission form module (Firestore intake, test seam)"
```

### Task 6: Modal + form styling

**Files:**
- Modify: `styles.css` (append after the events-hub block)

- [ ] **Step 1: Append styles** (palette per DESIGN.md — warm surfaces, `--sand-line` borders, no pure black/white; all tokens used exist in `:root`):

```css
/* ===== Event submission dialog ===== */
.submit-hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }

.submit-dialog {
    width: min(560px, calc(100vw - 2rem));
    max-height: 90vh;
    padding: var(--space-5);
    border: 1px solid var(--sand-line);
    border-radius: var(--radius-lg);
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow-soft);
}
.submit-dialog::backdrop { background: oklch(21% 0.026 55 / 0.45); }

.submit-dialog-head { display: flex; align-items: center; justify-content: space-between; }
.submit-dialog-close {
    border: 0; background: transparent; color: var(--muted);
    font-size: 1.75rem; line-height: 1; cursor: pointer; padding: 0 0.25rem;
}
.submit-intro { color: var(--muted); margin: 0 0 var(--space-3); }

.submit-form label { display: block; margin-bottom: var(--space-3); font-weight: 600; }
.submit-form input,
.submit-form select,
.submit-form textarea {
    display: block; width: 100%; margin-top: 4px; padding: 0.55rem 0.7rem;
    font: inherit; color: var(--ink);
    border: 1px solid var(--sand-line); border-radius: var(--radius-sm);
    background: var(--surface);
}
.submit-form textarea { resize: vertical; }
.submit-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }

.submit-styles { border: 1px solid var(--sand-line); border-radius: var(--radius-sm); padding: var(--space-3); margin-bottom: var(--space-3); }
.submit-styles legend { font-weight: 600; padding: 0 0.4rem; }
.submit-styles-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.35rem; }
.submit-style-option { display: flex; align-items: center; gap: 0.4rem; margin: 0; font-weight: 400; }
.submit-style-option input { width: auto; margin: 0; }

.submit-error { color: var(--danger); font-weight: 600; }
.submit-success { color: var(--palm-dark); font-weight: 600; }
.submit-actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-4, 24px); }

@media (max-width: 760px) {
    .submit-row { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Verify** — reload `http://localhost:8123#/events`, open the dialog: warm styled modal, two-column rows collapse to one on mobile (390px), style checkboxes in a grid, backdrop dims the page. Take a desktop (1440×900) and mobile (390×844) screenshot; check against DESIGN.md (warm palette, no pure black/white). Re-run `/tmp/afropasso-submit.test.js` → still `ALL TESTS PASSED`.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "Style event submission dialog and form"
```

### Task 7: Curator CLI `tools/pull-submissions.js`

**Files:**
- Create: `tools/pull-submissions.js`

**Note:** This script needs `tools/service-account.json` + `firebase-admin` installed (owner prerequisite). It CANNOT be end-to-end tested without a real project; verify `node --check` and that importing it does not crash without arguments (it should print usage). Its pure logic (`mapSubmissionToEvent`, `validateSubmission`, `insertEventSorted`) is already unit-tested in Task 2 and `add-event.js`.

- [ ] **Step 1: Create `tools/pull-submissions.js`**:

```js
#!/usr/bin/env node
// AfroPasso curator: review Firestore `submissions` and publish approved ones
// into data/events.json. Needs firebase-admin + tools/service-account.json.
// Usage:
//   node tools/pull-submissions.js --list
//   node tools/pull-submissions.js --json
//   node tools/pull-submissions.js --approve <id>
//   node tools/pull-submissions.js --reject <id> [reason]
'use strict';

const fs = require('fs');
const path = require('path');
const { validateSubmission, mapSubmissionToEvent } = require('./submission-core.js');
const { insertEventSorted } = require('./add-event.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const KEY_PATH = path.join(__dirname, 'service-account.json');

function usage() {
    console.log('Użycie: node tools/pull-submissions.js --list | --json | --approve <id> | --reject <id> [powód]');
}

function getDb() {
    if (!fs.existsSync(KEY_PATH)) {
        console.error(`Brak ${KEY_PATH}. Pobierz klucz konta serwisowego z konsoli Firebase.`);
        process.exit(1);
    }
    const admin = require('firebase-admin');
    admin.initializeApp({ credential: admin.credential.cert(require(KEY_PATH)) });
    return admin.firestore();
}

async function getPending(db) {
    const snap = await db.collection('submissions').where('status', '==', 'pending').orderBy('submittedAt').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function main() {
    const [flag, arg, ...rest] = process.argv.slice(2);
    if (!flag) { usage(); process.exit(1); }

    if (flag === '--list' || flag === '--json') {
        const pending = await getPending(getDb());
        if (flag === '--json') { console.log(JSON.stringify(pending, null, 2)); return; }
        if (pending.length === 0) { console.log('Brak oczekujących zgłoszeń.'); return; }
        for (const s of pending) {
            console.log(`\n[${s.id}] ${s.title} — ${s.city}, ${s.date_start} (${s.type})`);
            console.log(`  style: ${(s.styles || []).join(', ')} | url: ${s.url} | kontakt: ${s.contactEmail}`);
            if (s.notes) console.log(`  notatka: ${s.notes}`);
        }
        return;
    }

    if (flag === '--approve') {
        if (!arg) { usage(); process.exit(1); }
        const db = getDb();
        const ref = db.collection('submissions').doc(arg);
        const doc = await ref.get();
        if (!doc.exists) { console.error(`Nie ma zgłoszenia ${arg}.`); process.exit(1); }
        const sub = doc.data();

        const dances = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dances.json'), 'utf8')).dances;
        const knownSlugs = dances.map(d => d.slug);
        const errors = validateSubmission(sub, knownSlugs);
        if (errors.length > 0) {
            console.error('Zgłoszenie nie przechodzi walidacji — nic nie zapisano:');
            errors.forEach(e => console.error(`  - ${e}`));
            process.exit(1);
        }
        const eventsFile = path.join(DATA_DIR, 'events.json');
        const eventsJson = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
        const event = mapSubmissionToEvent(sub);
        if (eventsJson.events.some(e => e.id === event.id)) {
            console.error(`Wydarzenie o id "${event.id}" już istnieje w events.json.`); process.exit(1);
        }
        eventsJson.events = insertEventSorted(eventsJson.events, event);
        fs.writeFileSync(eventsFile, JSON.stringify(eventsJson, null, 4) + '\n');
        await ref.update({ status: 'approved' });
        console.log(`Dodano "${event.title}" do data/events.json i oznaczono jako approved.`);
        console.log('Następnie: git add data/events.json && git commit && git push');
        return;
    }

    if (flag === '--reject') {
        if (!arg) { usage(); process.exit(1); }
        await getDb().collection('submissions').doc(arg).update({ status: 'rejected', rejectReason: rest.join(' ') || '' });
        console.log(`Oznaczono ${arg} jako rejected.`);
        return;
    }

    usage();
    process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Verify** — `node --check tools/pull-submissions.js` → clean. `node tools/pull-submissions.js` (no args) → prints usage and exits non-zero (does NOT require firebase-admin/key for the usage path). Confirm the unit tests still pass: `node --test tools/submission-core.test.js` and `node --test tools/add-event.test.js`.

- [ ] **Step 3: Commit**

```bash
git add tools/pull-submissions.js
git commit -m "Add curator CLI to review and publish Firestore submissions"
```

### Task 8: Docs, final verification, owner setup reminder

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update `AGENTS.md` Architecture section** — add these bullets (place near the `tools/add-event.js` bullet):

```markdown
- `event-submit.js` — browser ES module (loaded via `<script type="module">` on top of classic `app.js`) rendering the on-site "Zgłoś wydarzenie" `<dialog>` on `#/events`. Lazy-loads the Firebase Web SDK from CDN and writes to the Firestore `submissions` collection (intake only). Public `FIREBASE_CONFIG` placeholder is filled by the owner after creating the project; a `window.__submitOverride` seam lets e2e drive the form without Firebase.
- `firestore.rules` + `firebase.json` — Firestore security rules (public create-only on `submissions` with field validation + honeypot; no public read). Deploy with `firebase deploy --only firestore:rules`.
- `tools/submission-core.js` — pure `validateSubmission` / `mapSubmissionToEvent` (reuse `add-event.js`); unit-tested via `node --test tools/submission-core.test.js`.
- `tools/pull-submissions.js` — curator CLI (`firebase-admin` + `tools/service-account.json`, both gitignored): `--list` / `--json` (agent-friendly) / `--approve <id>` / `--reject <id>`. Approving inserts into `data/events.json`; publishing is still `git commit && push`.
- `tools/` now has its own `package.json` (`firebase-admin`); run `cd tools && npm install` once. The served site stays dependency-free (Firebase Web SDK is loaded from CDN, not bundled).
```

- [ ] **Step 2: Full verification pass:**
  - `node --check app.js` → clean.
  - `node --test tools/submission-core.test.js` → 5 pass; `node --test tools/add-event.test.js` → 6 pass.
  - `node -e "['events','schools','dances'].forEach(f=>JSON.parse(require('fs').readFileSync('data/'+f+'.json'))); console.log('json ok')"`.
  - Re-run `/tmp/afropasso-submit.test.js` → `ALL TESTS PASSED`.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "Document Firebase event submissions in agent notes"
```

- [ ] **Step 4: Print the owner checklist** (do not automate — the human runs these): create the Spark project → enable Firestore → register a Web App and paste `firebaseConfig` into `event-submit.js` → `npm i -g firebase-tools && firebase login && firebase deploy --only firestore:rules` → generate a service-account key to `tools/service-account.json` → `cd tools && npm install`. After that, submitting the form writes to Firestore and `node tools/pull-submissions.js --list` shows pending entries.

---

## Post-plan notes

- **App Check / reCAPTCHA** hardening is deferred (spec "Out of scope"); add if spam appears.
- The two throwaway e2e files (`/tmp/afropasso-events.test.js`, `/tmp/afropasso-submit.test.js`) are not committed.
- The temporary sample events currently in `data/events.json` are unrelated to this feature; leave them (or clear later) — approving a submission simply appends to whatever is there.
