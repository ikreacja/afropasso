# Wspólna kolejka zgłoszeń + publiczne CLI (P1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jedna kolejka zgłoszeń eventów w Firestore (formularz + cudzy agent), z akceptacją człowieka i publikacją do `data/events.json` — w całości na darmowym planie Firebase.

**Architecture:** Klient (przeglądarka lub cudzy agent) pisze **płaski, event-kształtny** dokument do kolekcji Firestore `queue`; `firestore.rules` waliduje (create-only, honeypot). Kurator lokalnie przez `tools/queue.js` (firebase-admin) listuje pending, promuje (live-check + cover→WebP + insert do `events.json`) lub odrzuca; publikacja = `git push`. Statyczna strona bez zmian.

**Tech Stack:** Vanilla JS (served, dependency-free), Node.js curator tools (`node --test`, `firebase-admin`), Firestore + security rules, Firebase Web SDK (CDN) po stronie formularza.

**Spec:** `docs/superpowers/specs/2026-07-23-event-intake-queue-cli-design.md`

**Uproszczenie P1 (świadome):** kolejka jest **płaska** (pola eventu na najwyższym poziomie, jak w obecnym `submissions`) + meta `kind`/`source`/`trust`. Zagnieżdżony `payload` i kindy `school`/`class` w promocji dochodzą w osobnej fazie (schools/classes). To maksymalnie reużywa `firestore.rules` i `tools/submission-core.js`.

---

## Prerekwizyt P0 — Firebase (akcja właściciela; kod poniżej działa bez tego, ale nie połączy się z bazą)

Nie jest krokiem kodowym. Irek wykonuje raz w konsoli Firebase:
1. Utwórz projekt (plan **Spark/darmowy**), włącz **Firestore** (production mode, region `europe-central2`).
2. Web app → skopiuj `firebaseConfig` → wstaw w miejsce `FIREBASE_CONFIG` w konfiguracji strony (patrz Task 5).
3. Project settings → Service accounts → **Generate new private key** → zapisz jako `tools/service-account.json` (gitignored).
4. `cd tools && npm install`.
5. Po Task 2: `firebase deploy --only firestore:rules`.

Zadania 1–5 są **kodowalne i częściowo testowalne bez P0**; kroki „live" (deploy reguł, realny `create`, `queue.js` na żywo) wykonuje się po P0 — są wyraźnie oznaczone.

---

## File Structure

- Create: `tools/queue-core.js` — czyste funkcje: walidacja doc kolejki, mapowanie na rekord eventu, wybór pliku po `kind`. Reużywa `submission-core.js`.
- Create: `tools/queue-core.test.js` — testy jednostkowe powyższego.
- Modify: `firestore.rules` — dodanie `match /queue/{id}` + walidatory.
- Create: `docs/afropasso-submit.md` — skill/prompt dla cudzego agenta (schemat + REST + przykład).
- Create: `tools/queue.js` — kuratorskie CLI (`--list`/`--json`/`--promote`/`--reject`). Reużywa `queue-core`, `add-event`, `cover-image`, `firebase-admin`.
- Modify: `event-submit.js` — zapis do `queue` (nie `submissions`) z `kind`/`source`/`trust`.
- Modify: `AGENTS.md` — nota o kolejce/narzędziu; oznaczenie `pull-submissions.js`/`promote-candidate.js` jako wygaszanych.

`tools/pull-submissions.js` i `tools/promote-candidate.js` zostają na dysku (nie usuwamy w P1), oznaczone jako deprecated w AGENTS.md.

---

## Task 1: `tools/queue-core.js` — czysta logika kolejki (TDD)

**Files:**
- Create: `tools/queue-core.js`
- Test: `tools/queue-core.test.js`

- [ ] **Step 1: Write the failing test**

Create `tools/queue-core.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { targetFileForKind, validateQueueDoc, mapQueueDocToRecord } = require('./queue-core');

const STYLES = ['kizomba', 'semba', 'urban-kizz', 'kuduro'];

function validEventDoc(extra = {}) {
  return Object.assign({
    kind: 'event', source: 'cli', trust: 'public',
    title: 'Kizomba Night Gdańsk', type: 'social', city: 'Gdańsk',
    date_start: '2026-09-12', styles: ['kizomba'],
    url: 'https://example.com/e', contactEmail: 'org@example.com'
  }, extra);
}

test('targetFileForKind maps kinds to files', () => {
  assert.strictEqual(targetFileForKind('event'), 'data/events.json');
  assert.strictEqual(targetFileForKind('school'), 'data/schools.json');
  assert.strictEqual(targetFileForKind('class'), 'data/schools.json');
  assert.throws(() => targetFileForKind('nope'));
});

test('validateQueueDoc accepts a valid event doc', () => {
  assert.deepStrictEqual(validateQueueDoc(validEventDoc(), STYLES), []);
});

test('validateQueueDoc rejects bad kind/source/trust', () => {
  const errs = validateQueueDoc({ kind: 'x', source: 'y', trust: 'z' }, STYLES);
  assert.ok(errs.length >= 3, 'expected at least 3 meta errors');
});

test('validateQueueDoc rejects an event with a bad date', () => {
  const errs = validateQueueDoc(validEventDoc({ date_start: '12-09-2026' }), STYLES);
  assert.ok(errs.length >= 1);
});

test('mapQueueDocToRecord maps an event payload to a record', () => {
  const rec = mapQueueDocToRecord(validEventDoc());
  assert.strictEqual(rec.title, 'Kizomba Night Gdańsk');
  assert.strictEqual(rec.city, 'Gdańsk');
});

test('mapQueueDocToRecord refuses non-event kinds in P1', () => {
  assert.throws(() => mapQueueDocToRecord(validEventDoc({ kind: 'school' })));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/queue-core.test.js`
Expected: FAIL — `Cannot find module './queue-core'`.

- [ ] **Step 3: Write minimal implementation**

Create `tools/queue-core.js`:
```js
'use strict';
// Pure helpers for the unified intake queue. No Firebase here so it stays unit-testable.
// P1 keeps queue docs FLAT (event-shaped) to reuse submission-core + firestore.rules.
const { validateSubmission, mapSubmissionToEvent } = require('./submission-core');

const KINDS = ['event', 'school', 'class'];
const SOURCES = ['form', 'cli', 'research'];
const TRUSTS = ['public', 'single-source', 'verified'];

function targetFileForKind(kind) {
  if (kind === 'event') return 'data/events.json';
  if (kind === 'school' || kind === 'class') return 'data/schools.json';
  throw new Error(`Unknown kind: ${kind}`);
}

// Returns an array of error strings ([] === valid).
function validateQueueDoc(doc, knownStyleSlugs) {
  if (!doc || typeof doc !== 'object') return ['doc is not an object'];
  const errors = [];
  if (!KINDS.includes(doc.kind)) errors.push(`kind must be one of: ${KINDS.join(', ')}`);
  if (!SOURCES.includes(doc.source)) errors.push(`source must be one of: ${SOURCES.join(', ')}`);
  if (!TRUSTS.includes(doc.trust)) errors.push(`trust must be one of: ${TRUSTS.join(', ')}`);
  if (doc.kind === 'event') errors.push(...validateSubmission(doc, knownStyleSlugs));
  return errors;
}

// Maps a flat event-shaped queue doc into the record we publish to events.json.
function mapQueueDocToRecord(doc) {
  if (doc.kind === 'event') return mapSubmissionToEvent(doc);
  throw new Error(`Promotion for kind "${doc.kind}" is not supported in P1 (events only)`);
}

module.exports = { KINDS, SOURCES, TRUSTS, targetFileForKind, validateQueueDoc, mapQueueDocToRecord };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/queue-core.test.js`
Expected: PASS (6 tests). If `validateSubmission` requires a field the test omits, align the test's `validEventDoc()` with `tools/submission-core.js` required fields — do not weaken validation.

- [ ] **Step 5: Commit**

```bash
git add tools/queue-core.js tools/queue-core.test.js
git commit -m "feat(queue): pure queue-core (validate/map/target-file) + tests"
```

---

## Task 2: `firestore.rules` — kolekcja `queue`

**Files:**
- Modify: `firestore.rules` (dodaj `match /queue/{id}` obok istniejącego `submissions`)

- [ ] **Step 1: Add the `queue` match + validators**

W `firestore.rules`, wewnątrz `match /databases/{database}/documents { … }`, dodaj obok bloku `submissions`:
```
    match /queue/{id} {
      allow create: if isValidQueueDoc(request.resource.data);
      allow read, update, delete: if false;
    }
    function isValidQueueDoc(d) {
      return d.keys().hasOnly(['kind', 'source', 'trust', 'status', '_hp',
              'title', 'type', 'city', 'date_start', 'styles', 'url', 'contactEmail',
              'organizer', 'notes', 'date_end', 'time', 'venue', 'price',
              'sourceUrl', 'submittedBy', 'submittedAt'])
        && d.kind in ['event', 'school', 'class']
        && d.source in ['form', 'cli', 'research']
        && d.trust in ['public', 'single-source', 'verified']
        && d.status == 'pending'
        && d.get('_hp', '') == ''
        && d.submittedAt == request.time
        && (!('sourceUrl' in d) || (d.sourceUrl is string && d.sourceUrl.size() <= 500))
        && (!('submittedBy' in d) || (d.submittedBy is string && d.submittedBy.size() <= 120))
        && isValidQueueEventFields(d);
    }
    function isValidQueueEventFields(d) {
      return d.title is string && d.title.size() > 0 && d.title.size() <= 200
        && d.type in ['social', 'warsztaty', 'festiwal']
        && d.city is string && d.city.size() > 0 && d.city.size() <= 100
        && d.date_start is string && d.date_start.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}')
        && d.url is string && d.url.size() > 0 && d.url.size() <= 500
        && d.contactEmail is string && d.contactEmail.size() > 0 && d.contactEmail.size() <= 200
        && d.styles is list && d.styles.size() > 0 && d.styles.size() <= 12
        && (!('organizer' in d) || (d.organizer is string && d.organizer.size() <= 200))
        && (!('notes' in d) || (d.notes is string && d.notes.size() <= 2000))
        && (!('date_end' in d) || (d.date_end is string && d.date_end.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}')))
        && (!('time' in d) || (d.time is string && d.time.size() <= 40))
        && (!('venue' in d) || (d.venue is string && d.venue.size() <= 200))
        && (!('price' in d) || (d.price is string && d.price.size() <= 80));
    }
```
Nie usuwaj bloku `submissions` (zostaje na czas migracji).

- [ ] **Step 2: Syntax-check the rules file locally**

Run: `npx -y firebase-tools firestore:rules:canonicalize firestore.rules 2>/dev/null || echo "CLI offline — sprawdź składnię wizualnie"`
Expected: brak błędu składni (albo, gdy brak sieci/CLI, ręczne sprawdzenie nawiasów).

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(queue): firestore rules for create-only queue collection"
```

- [ ] **Step 4 (po P0, live): Deploy + test reguł**

Run: `firebase deploy --only firestore:rules`
Następnie test negatywny/pozytywny — patrz Task 3 Step 3 (ten sam `curl`).

---

## Task 3: `docs/afropasso-submit.md` — skill dla cudzego agenta

**Files:**
- Create: `docs/afropasso-submit.md`

- [ ] **Step 1: Write the document**

Create `docs/afropasso-submit.md` z sekcjami (pełna treść, nie skrót):
- **Cel:** „Sformatuj wydarzenie taneczne i zgłoś je do AfroPasso. Trafi do kolejki weryfikacji; publikujemy po akceptacji człowieka."
- **Schemat (pola):** wymagane `title` (≤200), `type` ∈ `social|warsztaty|festiwal`, `city`, `date_start` `YYYY-MM-DD`, `styles` (lista slugów z `data/dances.json`: kizomba, semba, urban-kizz, kizomba-fusion, tarraxo, tarraxinha, kompa, kuduro, massemba), `url`, `contactEmail`. Opcjonalne: `date_end`, `time`, `venue`, `price`, `organizer`, `notes`.
- **Endpoint (REST Firestore, create):**
  `POST https://firestore.googleapis.com/v1/projects/<PROJECT_ID>/databases/(default)/documents/queue?key=<PUBLIC_WEB_API_KEY>`
- **Meta do dołączenia:** `kind:"event"`, `source:"cli"`, `trust:"public"`, `status:"pending"`, `_hp:""`, `submittedAt` = server request time (w REST: pomiń — reguła wymaga `== request.time`; użyj wartości serwera przez `"submittedAt": {"timestampValue": "<ISO teraz>"}` i licz się z tym, że reguła sprawdza równość z czasem żądania → jeśli nie przejdzie, patrz Uwaga niżej).
- **Format ciała (Firestore REST, przykład kompletny):**
```json
{
  "fields": {
    "kind":        {"stringValue": "event"},
    "source":      {"stringValue": "cli"},
    "trust":       {"stringValue": "public"},
    "status":      {"stringValue": "pending"},
    "_hp":         {"stringValue": ""},
    "title":       {"stringValue": "Kizomba Night Gdańsk"},
    "type":        {"stringValue": "social"},
    "city":        {"stringValue": "Gdańsk"},
    "date_start":  {"stringValue": "2026-09-12"},
    "url":         {"stringValue": "https://example.com/event"},
    "contactEmail":{"stringValue": "org@example.com"},
    "styles":      {"arrayValue": {"values": [{"stringValue": "kizomba"}]}},
    "submittedAt": {"timestampValue": "2026-09-01T18:00:00Z"}
  }
}
```
- **Zasady:** jeden event = jeden `create`; nie zgaduj `styles` — użyj tylko dozwolonych slugów; jeśli nie masz pola opcjonalnego, pomiń klucz.
- **Uwaga o `submittedAt`:** reguła wymaga `submittedAt == request.time`. REST nie ustawia server-time automatycznie. **Decyzja implementacyjna (do potwierdzenia w Task 2):** złagodź regułę dla `submittedAt` do `d.submittedAt is timestamp` (zamiast `== request.time`) dla kanału REST/CLI, zostawiając ścisłe `== request.time` tylko dla formularza SDK — LUB przyjmij `timestampValue` z klienta i akceptuj drobny rozjazd. **W Task 2 użyj wariantu `d.submittedAt is timestamp`** (spójne dla obu kanałów), i zaktualizuj ten dokument, by nie wprowadzać w błąd.

> Podczas implementacji: zsynchronizuj Task 2 (`submittedAt`) z tą uwagą — reguła ma być `d.submittedAt is timestamp`. Popraw Step 1 w Task 2 odpowiednio (zamień `d.submittedAt == request.time` na `d.submittedAt is timestamp`).

- [ ] **Step 2: Commit**

```bash
git add docs/afropasso-submit.md
git commit -m "docs: public 'submit event' skill for external agents (Firestore REST)"
```

- [ ] **Step 3 (po P0, live): Test endpointu**

Pozytywny (powinien utworzyć dokument):
```bash
curl -s -X POST \
 "https://firestore.googleapis.com/v1/projects/<PROJECT_ID>/databases/(default)/documents/queue?key=<PUBLIC_WEB_API_KEY>" \
 -H "Content-Type: application/json" \
 -d '{"fields":{"kind":{"stringValue":"event"},"source":{"stringValue":"cli"},"trust":{"stringValue":"public"},"status":{"stringValue":"pending"},"_hp":{"stringValue":""},"title":{"stringValue":"Test Kizomba"},"type":{"stringValue":"social"},"city":{"stringValue":"Gdańsk"},"date_start":{"stringValue":"2026-09-12"},"url":{"stringValue":"https://example.com/e"},"contactEmail":{"stringValue":"a@b.pl"},"styles":{"arrayValue":{"values":[{"stringValue":"kizomba"}]}},"submittedAt":{"timestampValue":"2026-09-01T18:00:00Z"}}}'
```
Expected: HTTP 200 + zwrócony dokument.
Negatywny (honeypot niepusty → odrzucony): zmień `_hp` na `{"stringValue":"x"}` → Expected: HTTP 403 `Missing or insufficient permissions`.

---

## Task 4: `event-submit.js` — zapis do `queue`

**Files:**
- Modify: `event-submit.js` (zapis kolekcji + payload)

- [ ] **Step 1: Repoint the collection and add meta fields**

W `event-submit.js`:
1. Zmień `collection(db, 'submissions')` → `collection(db, 'queue')` (przy `addDoc`, ~linia 84).
2. Do obiektu payloadu budowanego przed zapisem dołóż trzy pola meta (zachowaj wszystkie istniejące pola eventu i `_hp`, `status`, `submittedAt`):
```js
kind: 'event',
source: 'form',
trust: 'public',
```
Nie zmieniaj seam `window.__submitOverride`.

- [ ] **Step 2: Syntax check**

Run: `node --check event-submit.js`
Expected: brak błędu. (To ES module; `node --check` przechodzi dla składni.)

- [ ] **Step 3: Verify payload shape via the e2e seam (bez Firebase)**

Manualnie (DevTools na stronie `#/events`): ustaw `window.__submitOverride = (p) => { console.log(JSON.stringify(p)); return Promise.resolve(); }` i wyślij formularz.
Expected: log zawiera `kind:"event"`, `source:"form"`, `trust:"public"`, `status:"pending"` oraz pola eventu.

- [ ] **Step 4: Commit**

```bash
git add event-submit.js
git commit -m "feat(queue): on-site form writes to unified queue with kind/source/trust"
```

---

## Task 5: `tools/queue.js` — kuratorskie CLI

**Files:**
- Create: `tools/queue.js`
- Modify: `event-submit.js` — wstaw realny `FIREBASE_CONFIG` (po P0; placeholder zostaje w repo do czasu podania konfigu przez właściciela)

- [ ] **Step 1: Write the CLI (wzorzec z `promote-candidate.js` + `pull-submissions.js`)**

Create `tools/queue.js`:
```js
'use strict';
// AfroPasso curator: review the Firestore `queue` and publish approved items.
// Needs firebase-admin + tools/service-account.json (gitignored).
//   node tools/queue.js --list
//   node tools/queue.js --json
//   node tools/queue.js --promote <id> [--force]
//   node tools/queue.js --reject <id> [powód]
const fs = require('fs');
const path = require('path');
const { validateEvent, insertEventSorted } = require('./add-event');
const { downloadAndConvertCover } = require('./cover-image');
const { targetFileForKind, validateQueueDoc, mapQueueDocToRecord } = require('./queue-core');

const ROOT = path.join(__dirname, '..');
const KEY_PATH = path.join(__dirname, 'service-account.json');
const IMAGES_DIR = path.join(ROOT, 'assets', 'events');

function db() {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.cert(require(KEY_PATH)) });
  }
  return admin.firestore();
}

async function pending() {
  const snap = await db().collection('queue').where('status', '==', 'pending').get();
  return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
}

function knownStyleSlugs() {
  const dances = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dances.json')));
  return (dances.dances || dances).map(d => d.slug);
}

async function isLive(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.ok || res.status === 405; // some hosts reject HEAD
  } catch (_) { return false; }
}

async function list(asJson) {
  const rows = await pending();
  if (asJson) { console.log(JSON.stringify(rows, null, 2)); return; }
  if (!rows.length) { console.log('Kolejka pusta.'); return; }
  for (const r of rows) {
    console.log(`${r.id}  [${r.kind}/${r.source}/${r.trust}]  ${r.title}  ${r.date_start}  ${r.city}\n   ${r.url}`);
  }
}

async function promote(id, force) {
  const rows = await pending();
  const doc = rows.find(r => r.id === id);
  if (!doc) throw new Error(`Nie ma pending o id ${id}`);
  if (doc.kind !== 'event') throw new Error(`P1 promuje tylko kind:"event" (dostałem ${doc.kind}).`);
  if (doc.trust === 'public' && !force && !(await isLive(doc.url))) {
    throw new Error(`Link nieżywy lub niepewny (trust=public). Użyj --force, jeśli świadomie.`);
  }
  const styles = knownStyleSlugs();
  const verrs = validateQueueDoc(doc, styles);
  if (verrs.length) throw new Error('Walidacja: ' + verrs.join('; '));

  const eventsPath = path.join(ROOT, 'data', 'events.json');
  const eventsJson = JSON.parse(fs.readFileSync(eventsPath));
  const record = mapQueueDocToRecord(doc);

  const errors = validateEvent(record, styles, eventsJson.events.map(e => e.id));
  if (errors.length) throw new Error('validateEvent: ' + errors.join('; '));

  if (doc.image || record.image) {
    try { record.image = await downloadAndConvertCover(doc.image || record.image, record.id, IMAGES_DIR); }
    catch (e) { console.warn('Cover pominięty:', e.message); }
  }

  eventsJson.events = insertEventSorted(eventsJson.events, record);
  fs.writeFileSync(eventsPath, JSON.stringify(eventsJson, null, 4) + '\n');
  await db().collection('queue').doc(id).update({ status: 'approved' });
  console.log(`Promowano ${id} → data/events.json. Teraz: przejrzyj diff i \`git commit && push\`.`);
}

async function reject(id, reason) {
  await db().collection('queue').doc(id).update({ status: 'rejected', rejectReason: reason || '' });
  console.log(`Odrzucono ${id}.`);
}

(async function main() {
  const a = process.argv.slice(2);
  try {
    if (a.includes('--list')) return await list(false);
    if (a.includes('--json')) return await list(true);
    const pi = a.indexOf('--promote');
    if (pi !== -1 && a[pi + 1]) return await promote(a[pi + 1], a.includes('--force'));
    const ri = a.indexOf('--reject');
    if (ri !== -1 && a[ri + 1]) return await reject(a[ri + 1], a[ri + 2]);
    console.log('Użycie: node tools/queue.js --list | --json | --promote <id> [--force] | --reject <id> [powód]');
  } catch (e) { console.error('Błąd:', e.message); process.exit(1); }
})();
```

Uwaga: `insertEventSorted`/`validateEvent`/`JSON.stringify(..., 4)` — zachowaj format `events.json` (4 spacje, końcowy newline) zgodnie z resztą repo; jeśli obecny plik ma inny wcięcie, dopasuj.

- [ ] **Step 2: Syntax check**

Run: `node --check tools/queue.js`
Expected: brak błędu.

- [ ] **Step 3: Reuse-sanity (bez Firebase)**

Run: `node -e "const q=require('./tools/queue-core'); console.log(q.targetFileForKind('event'))"`
Expected: `data/events.json`.

- [ ] **Step 4: Commit**

```bash
git add tools/queue.js
git commit -m "feat(queue): unified curator CLI (list/promote/reject) over Firestore queue"
```

- [ ] **Step 5 (po P0, live): E2E kolejki**

1. Wyślij testowy event (Task 3 Step 3 `curl`).
2. `node tools/queue.js --list` → widzisz pending.
3. `node tools/queue.js --promote <id>` → event w `data/events.json`, cover pobrany (jeśli był), doc `approved`.
4. Uruchom stronę (`python3 -m http.server 8123`), `#/events` → event widoczny po `git`-owym wdrożeniu.
5. `node tools/queue.js --reject <id>` na innym → znika z listy pending.

---

## Task 6: Dokumentacja i wygaszenie starych narzędzi

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update AGENTS.md**

W sekcji o narzędziach dodaj wpis o `tools/queue.js` (wspólna kolejka `queue`, `--list/--promote/--reject`), `docs/afropasso-submit.md` (skill dla cudzych agentów) i zaznacz, że `tools/pull-submissions.js` oraz `tools/promote-candidate.js` są **wygaszane** (zastąpione przez `queue.js`; formularz i przyszły research piszą do `queue`). Wspomnij o prerekwizycie Firebase (`service-account.json`).

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document the unified queue + deprecate old intake tools"
```

---

## Self-Review (wykonane)

**Spec coverage:** kolejka `queue` (Task 2/4), skill submit (Task 3), `queue.js` list/promote/reject (Task 5), formularz→queue (Task 4), reuse submission-core/add-event/cover-image (Task 1/5), darmowy plan / brak Cloud Functions (cały plan), P0 jako prerekwizyt (nagłówek). Poza P1: research→queue, województwa/mapa, MCP — świadomie pominięte.

**Placeholder scan:** `<PROJECT_ID>`/`<PUBLIC_WEB_API_KEY>` to celowe wartości z konfigu właściciela (P0), nie placeholdery zadań. Brak „TODO/TBD" w krokach.

**Type consistency:** `validateQueueDoc`/`mapQueueDocToRecord`/`targetFileForKind` zdefiniowane w Task 1 i użyte identycznie w Task 5. Reguła `submittedAt`: Task 3 wskazuje na `d.submittedAt is timestamp` — **przy implementacji Task 2 użyj `is timestamp`, nie `== request.time`**, żeby REST/CLI i formularz działały spójnie.

**Znane zależności od P0:** deploy reguł, realny `create`, `queue.js` na żywo, wstawienie `FIREBASE_CONFIG` — oznaczone jako „(po P0, live)".
