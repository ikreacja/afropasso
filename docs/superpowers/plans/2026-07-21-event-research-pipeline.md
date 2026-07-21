# Event Research Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a human-in-the-loop pipeline where an agent researches dance events into a staging file and a curator CLI promotes verified ones into `data/events.json`.

**Architecture:** Three new artifacts — a source registry (`tools/research-sources.json`), a staging queue (`data/candidates.json`), and a dependency-free promotion CLI (`tools/promote-candidate.js`) — reusing the existing `add-event.js` validators. Covers are downloaded and converted to WebP via a shared `tools/cover-image.js`. The `#/events` featured tile is fixed to actually render its cover with a brand scrim (and a clean fallback when there is no image).

**Tech Stack:** Node.js (no deps, `node:test`), `cwebp` CLI for WebP, static HTML/CSS/JS site (no build step).

**Spec:** `docs/superpowers/specs/2026-07-21-event-research-pipeline-design.md`

---

## File Structure

- Create `tools/research-sources.json` — registry of sources the procedure returns to (aggregators, PL calendars, ticketing, FB/IG as human sources).
- Create `data/candidates.json` — staging queue; never served to the site.
- Create `tools/cover-image.js` — download + WebP conversion helper (shared by promote + add-event).
- Create `tools/cover-image.test.js` — unit tests for the pure helper.
- Create `tools/promote-candidate.js` — curator CLI (`--list` / `--promote` / `--reject`).
- Create `tools/promote-candidate.test.js` — unit tests for the pure functions.
- Modify `tools/add-event.js` — reuse `cover-image.js` so downloaded covers become WebP (DRY).
- Modify `styles.css:2369` — render the event cover with a brand scrim + fallback.
- Modify `data/events.json` — remove the 8 placeholder events.

---

## Task 1: Source registry

**Files:**
- Create: `tools/research-sources.json`

- [ ] **Step 1: Create the registry file**

```json
{
    "sources": [
        { "name": "Latin Dance Calendar", "url": "https://latindancecalendar.com/", "type": "aggregator", "access": "agent", "role": "both", "quality": "high", "scope": "kizomba, worldwide", "notes": "Filtruje po stylu i kraju; podaje daty i linki oficjalne." },
        { "name": "Placetodance", "url": "https://www.placetodance.com/", "type": "aggregator", "access": "agent", "role": "both", "quality": "high", "scope": "kizomba, worldwide", "notes": "Karty festiwali z datą i miejscem." },
        { "name": "Danceplace", "url": "https://www.danceplace.com/", "type": "aggregator", "access": "agent", "role": "both", "quality": "high", "scope": "worldwide", "notes": "" },
        { "name": "Kizomba World", "url": "https://kizomba-world.com/", "type": "aggregator", "access": "agent", "role": "both", "quality": "high", "scope": "kizomba/semba", "notes": "Bywa 403 na listach lokalizacji." },
        { "name": "Where To Dance", "url": "https://where-to-dance-salsa.com/", "type": "aggregator", "access": "agent", "role": "both", "quality": "high", "scope": "worldwide", "notes": "" },
        { "name": "go&dance", "url": "https://www.goandance.com/", "type": "aggregator", "access": "agent", "role": "both", "quality": "medium", "scope": "worldwide", "notes": "Paginacja." },
        { "name": "Kizomba Embassy", "url": "https://kizombaembassy.com/", "type": "aggregator", "access": "agent", "role": "both", "quality": "medium", "scope": "kizomba", "notes": "" },
        { "name": "Kizz Calendar", "url": "https://www.kizzcalendar.com/", "type": "aggregator", "access": "agent", "role": "both", "quality": "medium", "scope": "kizomba", "notes": "" },
        { "name": "Kizomba Katxupa", "url": "https://kizombakatxupa.com/", "type": "aggregator", "access": "agent", "role": "both", "quality": "high", "scope": "kizomba/semba", "notes": "Często ma FB-only eventy w czytelnym HTML." },
        { "name": "Wydarzenia Taneczne PL", "url": "https://wydarzeniataneczne.pl/", "type": "pl-calendar", "access": "agent", "role": "both", "quality": "high", "scope": "Polska", "notes": "Polski kalendarz festiwali/warsztatów." },
        { "name": "Trójmiasto imprezy", "url": "https://www.trojmiasto.pl/imprezy/", "type": "pl-calendar", "access": "agent", "role": "both", "quality": "high", "scope": "Trójmiasto", "notes": "Near-term lokalny sweep; wyszukiwarka po haśle." },
        { "name": "iwencik", "url": "https://iwencik.pl/", "type": "ticketing", "access": "agent", "role": "verify", "quality": "high", "scope": "Polska", "notes": "Publiczna strona zapisów potwierdza datę/miejsce." },
        { "name": "Eventbrite", "url": "https://www.eventbrite.com/", "type": "ticketing", "access": "agent", "role": "verify", "quality": "high", "scope": "worldwide", "notes": "" },
        { "name": "Dizizid", "url": "https://www.dizizid.com/", "type": "ticketing", "access": "agent", "role": "verify", "quality": "medium", "scope": "worldwide", "notes": "Brak publicznej przeglądarki — tylko strony biletowe konkretnych eventów." },
        { "name": "Facebook", "url": "https://www.facebook.com/", "type": "social", "access": "human", "role": "both", "quality": "high", "scope": "worldwide", "notes": "Oficjalne profile/eventy organizatorów. Agent dosięga pośrednio przez WebSearch i agregatory; reszta przez paste-link." },
        { "name": "Instagram", "url": "https://www.instagram.com/", "type": "social", "access": "human", "role": "both", "quality": "high", "scope": "worldwide", "notes": "Jak FB." },
        { "name": "OnlyDance app", "url": "https://onlydanceapp.com/", "type": "social", "access": "human", "role": "discovery", "quality": "high", "scope": "worldwide", "notes": "Tylko apka mobilna, brak publicznego webu — wyłącznie paste-link." }
    ]
}
```

- [ ] **Step 2: Validate JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('tools/research-sources.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add tools/research-sources.json
git commit -m "feat: add event research source registry"
```

---

## Task 2: Candidates staging file

**Files:**
- Create: `data/candidates.json`

- [ ] **Step 1: Create the empty staging queue**

```json
{
    "candidates": []
}
```

- [ ] **Step 2: Validate JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('data/candidates.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add data/candidates.json
git commit -m "feat: add empty candidates staging queue"
```

---

## Task 3: Cover image helper (WebP)

**Files:**
- Create: `tools/cover-image.js`
- Test: `tools/cover-image.test.js`

- [ ] **Step 1: Write the failing test**

`tools/cover-image.test.js`:

```javascript
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { sourceExtension, coverOutputPath } = require('./cover-image');

test('sourceExtension lowercases and strips query', () => {
    assert.strictEqual(sourceExtension('https://x/poster.PNG'), 'png');
    assert.strictEqual(sourceExtension('https://x/y.jpg?v=2'), 'jpg');
    assert.strictEqual(sourceExtension('https://x/z.JPEG'), 'jpeg');
    assert.strictEqual(sourceExtension('https://x/no-ext'), 'jpg');
});

test('coverOutputPath returns webp path under assets/events', () => {
    assert.strictEqual(coverOutputPath('vamos-2026'), 'assets/events/vamos-2026.webp');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/cover-image.test.js`
Expected: FAIL — `Cannot find module './cover-image'`

- [ ] **Step 3: Write the implementation**

`tools/cover-image.js`:

```javascript
'use strict';
// Download an event cover and convert it to WebP (project convention: cwebp -q 92 -m 6).
// Falls back to the original file if cwebp is not installed.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function sourceExtension(url) {
    return (url.match(/\.(jpe?g|png|webp)(?:\?|$)/i) || [, 'jpg'])[1].toLowerCase();
}

function coverOutputPath(id) {
    return `assets/events/${id}.webp`;
}

async function downloadAndConvertCover(imageUrl, id, imagesDir) {
    const response = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AfroPassoBot/1.0)' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    fs.mkdirSync(imagesDir, { recursive: true });
    const ext = sourceExtension(imageUrl);
    const tmpPath = path.join(imagesDir, `${id}.src.${ext}`);
    fs.writeFileSync(tmpPath, Buffer.from(await response.arrayBuffer()));
    const webpPath = path.join(imagesDir, `${id}.webp`);
    try {
        execFileSync('cwebp', ['-q', '92', '-m', '6', tmpPath, '-o', webpPath], { stdio: 'ignore' });
        fs.unlinkSync(tmpPath);
        return coverOutputPath(id);
    } catch (error) {
        const keptPath = path.join(imagesDir, `${id}.${ext}`);
        fs.renameSync(tmpPath, keptPath);
        console.warn(`cwebp niedostępny — zapisano oryginał ${id}.${ext} (skonwertuj ręcznie).`);
        return `assets/events/${id}.${ext}`;
    }
}

module.exports = { sourceExtension, coverOutputPath, downloadAndConvertCover };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/cover-image.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Syntax-check**

Run: `node --check tools/cover-image.js`
Expected: no output (exit 0)

- [ ] **Step 6: Commit**

```bash
git add tools/cover-image.js tools/cover-image.test.js
git commit -m "feat: add WebP cover image helper"
```

---

## Task 4: Promotion pure functions

**Files:**
- Create: `tools/promote-candidate.js` (pure functions + exports only for now)
- Test: `tools/promote-candidate.test.js`

- [ ] **Step 1: Write the failing test**

`tools/promote-candidate.test.js`:

```javascript
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { computeConfidence, dedupeKey, isDuplicate, candidateToEvent } = require('./promote-candidate');

test('computeConfidence labels by source count and link', () => {
    assert.strictEqual(computeConfidence({ sources: ['a', 'b'], link_ok: true }), 'verified');
    assert.strictEqual(computeConfidence({ sources: ['a'], link_ok: true }), 'single-source');
    assert.strictEqual(computeConfidence({ sources: ['a', 'b'], link_ok: false }), 'unverified');
    assert.strictEqual(computeConfidence({ sources: [], link_ok: true }), 'unverified');
});

test('isDuplicate matches by id or by date+city', () => {
    const existing = [{ id: 'x', date_start: '2026-11-19', city: 'Warszawa' }];
    assert.strictEqual(isDuplicate({ id: 'x', date_start: '2026-01-01', city: 'Gdańsk' }, existing), true);
    assert.strictEqual(isDuplicate({ id: 'y', date_start: '2026-11-19', city: 'warszawa' }, existing), true);
    assert.strictEqual(isDuplicate({ id: 'y', date_start: '2026-12-01', city: 'Gdańsk' }, existing), false);
});

test('candidateToEvent strips staging fields and marks single-source', () => {
    const event = candidateToEvent({
        id: 'e1', title: 'T', type: 'festiwal', styles: ['kizomba'], city: 'Lizbona',
        date_start: '2026-12-11', url: 'https://x', organizer: 'Org',
        sources: ['a'], link_ok: true, status: 'ready', image_src: 'https://img'
    });
    assert.strictEqual(event.confidence, 'single-source');
    assert.strictEqual(event.featured, false);
    assert.strictEqual(event.source, 'research');
    assert.ok(!('sources' in event));
    assert.ok(!('link_ok' in event));
    assert.ok(!('image_src' in event));
});

test('candidateToEvent omits confidence when verified', () => {
    const event = candidateToEvent({
        id: 'e2', title: 'T', type: 'festiwal', styles: ['kizomba'], city: 'Paris',
        date_start: '2026-11-19', url: 'https://x', sources: ['a', 'b'], link_ok: true
    });
    assert.ok(!('confidence' in event));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/promote-candidate.test.js`
Expected: FAIL — `Cannot find module './promote-candidate'`

- [ ] **Step 3: Write the pure functions**

`tools/promote-candidate.js`:

```javascript
#!/usr/bin/env node
// AfroPasso curator tool: promote a verified candidate from data/candidates.json into data/events.json.
// Usage: node tools/promote-candidate.js --list | --promote <id> | --reject <id> [--force]
'use strict';

const fs = require('fs');
const path = require('path');
const { validateEvent, insertEventSorted } = require('./add-event');
const { downloadAndConvertCover } = require('./cover-image');

const DATA_DIR = path.join(__dirname, '..', 'data');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'events');

function computeConfidence(candidate) {
    if (!candidate.link_ok) return 'unverified';
    const count = (candidate.sources || []).filter(Boolean).length;
    if (count >= 2) return 'verified';
    if (count >= 1) return 'single-source';
    return 'unverified';
}

function dedupeKey(event) {
    return `${event.date_start}|${(event.city || '').toLowerCase()}`;
}

function isDuplicate(event, existingEvents) {
    return existingEvents.some(e => e.id === event.id || dedupeKey(e) === dedupeKey(event));
}

function candidateToEvent(candidate) {
    const event = {
        id: candidate.id,
        title: candidate.title,
        type: candidate.type,
        styles: candidate.styles || [],
        city: candidate.city,
        date_start: candidate.date_start,
        url: candidate.url,
        featured: Boolean(candidate.featured),
        organizer: candidate.organizer || '',
        source: candidate.source || 'research'
    };
    if (candidate.venue) event.venue = candidate.venue;
    if (candidate.date_end) event.date_end = candidate.date_end;
    if (candidate.time) event.time = candidate.time;
    if (candidate.price) event.price = candidate.price;
    if (candidate.image) event.image = candidate.image;
    if (computeConfidence(candidate) === 'single-source') event.confidence = 'single-source';
    return event;
}

module.exports = { computeConfidence, dedupeKey, isDuplicate, candidateToEvent };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/promote-candidate.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/promote-candidate.js tools/promote-candidate.test.js
git commit -m "feat: add promotion pure functions (confidence, dedupe, mapping)"
```

---

## Task 5: Promotion CLI (main)

**Files:**
- Modify: `tools/promote-candidate.js` (append link check + `main()` below the `module.exports` line)

- [ ] **Step 1: Append the CLI implementation**

Add to the end of `tools/promote-candidate.js`, after the `module.exports = {...}` line:

```javascript

async function checkLink(url) {
    try {
        const res = await fetch(url, {
            method: 'GET', redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AfroPassoBot/1.0)' }
        });
        return res.ok;
    } catch (error) {
        return false;
    }
}

function listCandidates(candidates) {
    if (!candidates.length) { console.log('Poczekalnia pusta.'); return; }
    for (const c of candidates) {
        const conf = computeConfidence(c);
        const dates = c.date_end && c.date_end !== c.date_start ? `${c.date_start}–${c.date_end}` : c.date_start;
        console.log(`[${c.status || 'candidate'} · ${conf}] ${c.id}`);
        console.log(`    ${c.title} — ${c.city} — ${dates}`);
        console.log(`    url: ${c.url}  (źródła: ${(c.sources || []).length})`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const candidatesFile = path.join(DATA_DIR, 'candidates.json');
    const eventsFile = path.join(DATA_DIR, 'events.json');
    const store = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));
    const candidates = store.candidates || [];
    const force = args.includes('--force');

    if (args.length === 0 || args.includes('--list')) {
        listCandidates(candidates);
        return;
    }

    const rejectIdx = args.indexOf('--reject');
    if (rejectIdx !== -1) {
        const id = args[rejectIdx + 1];
        const candidate = candidates.find(x => x.id === id);
        if (!candidate) { console.error(`Nie znaleziono kandydata: ${id}`); process.exit(1); }
        candidate.status = 'rejected';
        fs.writeFileSync(candidatesFile, JSON.stringify(store, null, 4) + '\n');
        console.log(`Odrzucono ${id}.`);
        return;
    }

    const promoteIdx = args.indexOf('--promote');
    if (promoteIdx === -1) {
        console.error('Użycie: promote-candidate.js --list | --promote <id> | --reject <id> [--force]');
        process.exit(1);
    }

    const id = args[promoteIdx + 1];
    const candidate = candidates.find(x => x.id === id);
    if (!candidate) { console.error(`Nie znaleziono kandydata: ${id}`); process.exit(1); }

    candidate.link_ok = await checkLink(candidate.url);
    const confidence = computeConfidence(candidate);
    console.log(`Link: ${candidate.link_ok ? 'żywy' : 'MARTWY'} · pewność: ${confidence}`);
    if (confidence === 'unverified' && !force) {
        console.error('Kandydat unverified (martwy link lub brak źródeł) — nie publikuję. Użyj --force by wymusić.');
        process.exit(1);
    }

    const eventsJson = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
    if (isDuplicate(candidate, eventsJson.events) && !force) {
        console.error('Wygląda na duplikat istniejącego eventu — nie publikuję. Użyj --force.');
        process.exit(1);
    }

    if (candidate.image_src && !candidate.image) {
        try {
            candidate.image = await downloadAndConvertCover(candidate.image_src, candidate.id, IMAGES_DIR);
            console.log(`Grafika: ${candidate.image}`);
        } catch (error) {
            console.warn(`Grafika pominięta: ${error.message}`);
        }
    }

    const event = candidateToEvent(candidate);
    const dances = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dances.json'), 'utf8')).dances;
    const knownStyleSlugs = dances.map(d => d.slug);
    const errors = validateEvent(event, knownStyleSlugs, eventsJson.events.map(e => e.id));
    if (errors.length > 0) {
        console.error('Błędy walidacji — nic nie zapisano:');
        errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
    }

    eventsJson.events = insertEventSorted(eventsJson.events, event);
    fs.writeFileSync(eventsFile, JSON.stringify(eventsJson, null, 4) + '\n');
    store.candidates = candidates.filter(x => x.id !== id);
    fs.writeFileSync(candidatesFile, JSON.stringify(store, null, 4) + '\n');
    console.log(`\nOpublikowano "${event.title}" do data/events.json. Sprawdź diff, potem: git add data/events.json assets/events && git commit`);
}

if (require.main === module) {
    main().catch(error => { console.error(error); process.exit(1); });
}
```

- [ ] **Step 2: Syntax-check**

Run: `node --check tools/promote-candidate.js`
Expected: no output (exit 0)

- [ ] **Step 3: Re-run pure-function tests (guard against regressions)**

Run: `node --test tools/promote-candidate.test.js`
Expected: PASS (4 tests) — requiring the module must not run `main()`.

- [ ] **Step 4: Smoke-test `--list` against the empty queue**

Run: `node tools/promote-candidate.js --list`
Expected: `Poczekalnia pusta.`

- [ ] **Step 5: Commit**

```bash
git add tools/promote-candidate.js
git commit -m "feat: add promote-candidate CLI (list/promote/reject)"
```

---

## Task 6: Reuse WebP helper in add-event.js (DRY)

**Files:**
- Modify: `tools/add-event.js:78-91` (replace `downloadImage`)

- [ ] **Step 1: Replace the `downloadImage` function**

In `tools/add-event.js`, add this require near the top (after the `const path = require('path');` line at line 7):

```javascript
const { downloadAndConvertCover } = require('./cover-image');
```

Then replace the whole `downloadImage` function (lines 78-91) with:

```javascript
async function downloadImage(imageUrl, id) {
    try {
        return await downloadAndConvertCover(imageUrl, id, IMAGES_DIR);
    } catch (error) {
        console.warn(`Nie udało się pobrać grafiki: ${error.message}`);
        return '';
    }
}
```

- [ ] **Step 2: Syntax-check**

Run: `node --check tools/add-event.js`
Expected: no output (exit 0)

- [ ] **Step 3: Run existing add-event tests (no regression)**

Run: `node --test tools/add-event.test.js`
Expected: PASS — `parseOgTags`, `validateEvent`, `insertEventSorted`, `slugifyEvent` are unchanged.

- [ ] **Step 4: Commit**

```bash
git add tools/add-event.js
git commit -m "refactor: add-event covers reuse shared WebP helper"
```

---

## Task 7: Render the event cover (brand scrim + fallback)

**Files:**
- Modify: `styles.css:2369-2371` (`.featured-event-tile`)

- [ ] **Step 1: Replace the `.featured-event-tile` rule**

In `styles.css`, replace lines 2369-2371:

```css
.featured-event-tile {
    text-decoration: none;
}
```

with:

```css
.featured-event-tile {
    text-decoration: none;
    background:
        linear-gradient(180deg,
            oklch(14% 0.04 48 / 0.15),
            oklch(14% 0.04 48 / 0.72) 62%,
            oklch(14% 0.04 48 / 0.92)),
        var(--tile-image, none),
        oklch(14% 0.04 48);
    background-position: center;
    background-size: cover;
}
```

Rationale: the base `.featured-tile` paints a solid dark background and only `.featured-tile-media` (absent on event tiles) consumed `--tile-image`. This rule makes the event tile render its own cover under a brand scrim for readability; with no `--tile-image` the layer resolves to `none` and the solid `oklch(14% 0.04 48)` shows through as a clean typographic fallback (same dark tone as the dance/guide tiles).

- [ ] **Step 2: Serve locally and inspect**

Run: `python3 -m http.server 8123`
Then open `http://localhost:8123/#/events` and confirm: featured event tiles with an image show the photo under a dark scrim (title readable); tiles without an image show the solid dark card with readable text. Check mobile width too. Stop the server (Ctrl-C) when done.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "fix: render event cover with brand scrim and clean fallback"
```

---

## Task 8: Remove placeholder events

**Files:**
- Modify: `data/events.json`

- [ ] **Step 1: Replace the file contents with an empty queue**

Replace the entire contents of `data/events.json` with:

```json
{
    "events": []
}
```

Rationale (spec §11): the 8 seeded events are fictional (most link to `facebook.com/afropasso`; "Vamos Wrocław" even attaches a real FB event id to a wrong city/date). They must not mix with real data.

- [ ] **Step 2: Validate JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('data/events.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Verify the empty state renders**

Run: `python3 -m http.server 8123`
Open `http://localhost:8123/#/events` — the list should show the empty-state copy ("Nie mamy jeszcze żadnych nadchodzących wydarzeń…"), no console errors. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add data/events.json
git commit -m "chore: remove placeholder events before real ingestion"
```

---

## Task 9: Seed the sample candidates and publish (operator step)

This task uses the live network (link check + cover download) and `cwebp`. Run it on the curator's machine, reviewing each diff.

**Files:**
- Modify: `data/candidates.json`

- [ ] **Step 1: Seed the 5 researched sample events**

Replace the contents of `data/candidates.json` with:

```json
{
    "candidates": [
        {
            "id": "vamos-festival-warsaw-2026-07-31",
            "title": "VAMOS Festival Warsaw",
            "type": "festiwal",
            "styles": ["kizomba", "urban-kizz"],
            "city": "Warszawa",
            "venue": "Novotel Airport",
            "date_start": "2026-07-31",
            "date_end": "2026-08-03",
            "url": "https://iwencik.pl/registrations/VAMOS2025/EN",
            "organizer": "VAMOS Festival",
            "sources": ["https://kizombakatxupa.com/en/congresos/vamos-festival-warsaw-2/", "https://where-to-dance-salsa.com/festivals/warsaw/"],
            "link_ok": null,
            "status": "ready",
            "notes": "kizomba/urban-kizz; potwierdzone na 3 źródłach + FB event."
        },
        {
            "id": "elsol-festival-fall-warszawa-2026-11-12",
            "title": "elSol Festival Fall Edition",
            "type": "festiwal",
            "styles": ["kizomba"],
            "city": "Warszawa",
            "date_start": "2026-11-12",
            "date_end": "2026-11-16",
            "url": "https://elsolfestival.pl",
            "organizer": "elSol Festival",
            "sources": ["https://elsolfestival.pl", "https://latindancecalendar.com/festivals/location/poland/style/kizomba/"],
            "link_ok": null,
            "status": "ready",
            "notes": "Potwierdź obecność kizomby w programie na stronie oficjalnej."
        },
        {
            "id": "paris-kizomba-congress-2026-11-19",
            "title": "Paris Kizomba Congress",
            "type": "festiwal",
            "styles": ["kizomba", "urban-kizz"],
            "city": "Tremblay-en-France",
            "venue": "Hilton Paris CDG",
            "date_start": "2026-11-19",
            "date_end": "2026-11-23",
            "url": "https://www.pariskizombacongress.com",
            "organizer": "Paris Kizomba Congress",
            "sources": ["https://www.danceplace.com/index/no/16172/", "https://my.weezevent.com/paris-kizomba-congress-2026"],
            "link_ok": null,
            "status": "ready",
            "notes": ""
        },
        {
            "id": "tukina-lisboa-kizomba-semba-2026-12-11",
            "title": "Tukina Lisboa – Kizomba & Semba",
            "type": "festiwal",
            "styles": ["kizomba", "semba"],
            "city": "Lizbona",
            "date_start": "2026-12-11",
            "url": "https://kizombakatxupa.com/en/congresos/tukina/",
            "organizer": "Os Tukina",
            "sources": ["https://latindancecalendar.com/festivals/tukina-lisboa-kizomba-semba-festival-lisbon/", "https://kizomba-world.com/event/tukina-lisboa-kizomba-semba-festival-in-lisbon/"],
            "link_ok": null,
            "status": "ready",
            "notes": "date_end do potwierdzenia na oficjalnym FB (część źródeł: 11–14)."
        },
        {
            "id": "nantes-kizomba-festival-2026-12-03",
            "title": "Nantes Kizomba Festival",
            "type": "festiwal",
            "styles": ["kizomba", "semba", "tarraxo", "urban-kizz"],
            "city": "Nantes",
            "venue": "Sure Hotel Nantes Beaujoire",
            "date_start": "2026-12-03",
            "date_end": "2026-12-07",
            "url": "https://www.placetodance.com/en/festivals/calendar/nantes-kizomba-festival-2026-b143e",
            "organizer": "Nantes Kizomba Festival",
            "sources": ["https://www.placetodance.com/en/festivals/calendar/nantes-kizomba-festival-2026-b143e"],
            "link_ok": null,
            "status": "needs_second_source",
            "notes": "single-source: domknij oficjalnym FB/stroną przed publikacją lub opublikuj jako single-source."
        }
    ]
}
```

- [ ] **Step 2: Validate JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('data/candidates.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Confirm each style slug exists in dances.json**

Run: `node -e "const d=JSON.parse(require('fs').readFileSync('data/dances.json','utf8')).dances.map(x=>x.slug); const c=JSON.parse(require('fs').readFileSync('data/candidates.json','utf8')).candidates; const bad=[...new Set(c.flatMap(e=>e.styles))].filter(s=>!d.includes(s)); console.log(bad.length?('NIEZNANE SLUGI: '+bad):'wszystkie slugi ok')"`
Expected: `wszystkie slugi ok`
If it prints unknown slugs, fix them in `data/candidates.json` to match real slugs in `data/dances.json` before continuing.

- [ ] **Step 4: List the queue**

Run: `node tools/promote-candidate.js --list`
Expected: 5 candidates printed with `[status · confidence]` lines.

- [ ] **Step 5: Promote the four verified candidates**

Run each and review the printed link/confidence line:

```bash
node tools/promote-candidate.js --promote vamos-festival-warsaw-2026-07-31
node tools/promote-candidate.js --promote elsol-festival-fall-warszawa-2026-11-12
node tools/promote-candidate.js --promote paris-kizomba-congress-2026-11-19
node tools/promote-candidate.js --promote tukina-lisboa-kizomba-semba-2026-12-11
```

Expected: each prints `pewność: verified` (or `single-source` if a link check fails) and `Opublikowano "…"`. If any prints `Link: MARTWY`, open the `url` in a browser; update it in `data/candidates.json` if the event moved, then re-run.

- [ ] **Step 6: Decide on Nantes (single source)**

Either find a second independent source and add it to the Nantes entry's `sources` (making it `verified`), or promote it as single-source (it will carry `"confidence": "single-source"` in events.json):

```bash
node tools/promote-candidate.js --promote nantes-kizomba-festival-2026-12-03
```

Expected: `pewność: single-source` (if still one source) and `Opublikowano`.

- [ ] **Step 7: Validate the resulting events.json and view the page**

Run: `node -e "JSON.parse(require('fs').readFileSync('data/events.json','utf8')); console.log('ok')"`
Then: `python3 -m http.server 8123` and open `http://localhost:8123/#/events` — the 5 events appear in chronological month groups; featured tiles (if any) render covers or clean fallbacks. Stop the server.

- [ ] **Step 8: Commit the published data and covers**

```bash
git add data/events.json data/candidates.json assets/events
git commit -m "feat: publish first researched events (VAMOS, elSol, Paris, Tukina, Nantes)"
```

---

## Self-Review

**Spec coverage:**
- §3 architecture (candidates → promote → events) → Tasks 2, 4, 5. ✓
- §4 source registry → Task 1. ✓
- §5 candidates schema → Tasks 2, 9. ✓
- §6 non-blocking confidence → Task 4 (`computeConfidence`), Task 5 (gate only on `unverified` unless `--force`). ✓
- §7 research procedure → executed by the agent using the registry from Task 1 (documented, no code artifact); near-term local sweep is a runtime instruction, not a build task. ✓
- §8 promote CLI → Tasks 4-5. ✓
- §9 cover WebP + fallback → Tasks 3, 6 (WebP), Task 7 (render + fallback). ✓
- §10 Facebook reality → informational; no code (human paste-path uses existing add-event.js). ✓
- §11 cleanup placeholders → Task 8. ✓
- §12 cron + monetization → out of scope, no tasks. ✓
- §13 testing → each task runs `node --test` / `node --check` / JSON validation. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; every command has expected output. ✓

**Type consistency:** `computeConfidence`, `dedupeKey`, `isDuplicate`, `candidateToEvent` names match between Task 4 definition, Task 4 tests, and Task 5 usage. `downloadAndConvertCover(imageUrl, id, imagesDir)` signature matches between Task 3 definition and its callers in Task 5 and Task 6. Event field order in `candidateToEvent` mirrors `add-event.js`. Candidate `id`s in Task 9 match those referenced in Task 9 promote commands. ✓
