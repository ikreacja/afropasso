# Events Hub — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `#/events` page (featured tiles + month-grouped chronological list + city/style/type filters), `data/events.json` + `data/schools.json`, a "Gdzie tańczyć regularnie" directory, a submission-form link, and a local curator CLI that imports events from public event URLs.

**Architecture:** Same static SPA pattern as the dance library: canonical JSON in `data/`, rendered client-side by `app.js`, new view in `index.html`. The curator tool is a dependency-free Node script in `tools/`; its pure functions (OG parsing, validation, sorted insert) are exported and unit-tested with `node --test`. Publishing = git commit + push.

**Tech Stack:** Static HTML/CSS/JS, Node ≥18 built-ins (`fetch`, `readline/promises`, `node:test`), Playwright e2e with `page.route()` fixture interception (site ships with an empty events list; tests inject fixtures).

**Spec:** `docs/superpowers/specs/2026-07-09-events-hub-design.md`

**Prerequisite:** The "Wszystkie tańce" plan (`2026-07-09-wszystkie-tance-library-page.md`) is fully executed — this plan reuses its filter-bar pattern and assumes nav already contains "Wszystkie tańce".

**Placeholder to replace at launch:** the Google Form URL in Task 4 (`EVENT_SUBMIT_FORM_URL`). The owner creates the form (fields mirroring the data model + contact) and pastes its link; everything else works without it.

---

### Task 1: Data files and loading

**Files:**
- Create: `data/events.json`, `data/schools.json`
- Modify: `app.js` (globals ~line 1, `loadData` ~line 136)

- [ ] **Step 1: Seed data files** (empty — real events come via the curator tool):

`data/events.json`:
```json
{
    "events": []
}
```

`data/schools.json`:
```json
{
    "schools": []
}
```

- [ ] **Step 2: Load them** in `app.js`. Add globals next to `dancesData`:

```js
let eventsData = null;
let schoolsData = null;
let filteredEvents = [];
```

Add below `loadData()`:

```js
async function loadEventsData() {
    try {
        const [eventsResponse, schoolsResponse] = await Promise.all([
            fetch('./data/events.json'),
            fetch('./data/schools.json')
        ]);
        if (!eventsResponse.ok || !schoolsResponse.ok) {
            throw new Error(`HTTP ${eventsResponse.status}/${schoolsResponse.status}`);
        }
        eventsData = (await eventsResponse.json()).events;
        schoolsData = (await schoolsResponse.json()).schools;
    } catch (error) {
        console.error('Error loading events:', error);
        eventsData = null;
        schoolsData = null;
    }
}
```

and call it from the `DOMContentLoaded` handler after `await loadData();`:

```js
    await loadEventsData();
```

A failed events fetch must not break the dance guide — that is why it is a separate try/catch and not part of `loadData`.

- [ ] **Step 3: Verify** — `node --check app.js`; both JSON files parse: `node -e "['events','schools'].forEach(f => JSON.parse(require('fs').readFileSync('data/'+f+'.json')))"`.

- [ ] **Step 4: Commit**

```bash
git add data/events.json data/schools.json app.js
git commit -m "Add events and schools data files with loader"
```

### Task 2: Failing e2e suite with fixture events

**Files:**
- Create: `/tmp/afropasso-events.test.js` (throwaway; not committed)

- [ ] **Step 1: Start server** (background): `cd /Users/ikreacja/Documents/1.PROJEKTY/_Apps/AfroPasso && python3 -m http.server 8123`

- [ ] **Step 2: Write the suite.** Fixtures use far-future dates so they never expire; one past event proves date filtering.

```js
// /tmp/afropasso-events.test.js
const { chromium } = require('playwright');
const TARGET_URL = 'http://localhost:8123';
let failures = 0;
function assert(cond, label) {
  console.log((cond ? 'PASS' : 'FAIL') + ' — ' + label);
  if (!cond) failures++;
}

const FIXTURE_EVENTS = { events: [
  { id: 'social-warszawa-2030-07-12', title: 'Kizomba Social Night', type: 'social',
    styles: ['kizomba', 'semba'], city: 'Warszawa', venue: 'Studio X',
    date_start: '2030-07-12', time: '21:00', price: '30 zł',
    url: 'https://www.facebook.com/events/1', featured: false, organizer: 'Studio X', source: 'kurator' },
  { id: 'warsztaty-krakow-2030-07-19', title: 'Warsztaty tarraxo', type: 'warsztaty',
    styles: ['tarraxo'], city: 'Kraków',
    date_start: '2030-07-19', time: '12:00',
    url: 'https://www.facebook.com/events/2', featured: false, organizer: 'Szkoła Y', source: 'zgloszenie' },
  { id: 'festiwal-gdansk-2030-08-07', title: 'Afro Festival PL', type: 'festiwal',
    styles: ['kizomba', 'semba', 'kuduro'], city: 'Gdańsk',
    date_start: '2030-08-07', date_end: '2030-08-09',
    url: 'https://www.facebook.com/events/3', featured: true, organizer: 'Afro Festival', source: 'kurator' },
  { id: 'social-lodz-2020-01-10', title: 'Wydarzenie z przeszłości', type: 'social',
    styles: ['kizomba'], city: 'Łódź', date_start: '2020-01-10',
    url: 'https://www.facebook.com/events/4', featured: false, organizer: 'Ktoś', source: 'kurator' }
] };
const FIXTURE_SCHOOLS = { schools: [
  { id: 'studio-x-warszawa', name: 'Studio X', city: 'Warszawa',
    styles: ['kizomba', 'semba'], schedule_pl: 'wtorki i czwartki', url: 'https://example.com/zapisy' }
] };

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.route('**/data/events.json', r => r.fulfill({ json: FIXTURE_EVENTS }));
  await page.route('**/data/schools.json', r => r.fulfill({ json: FIXTURE_SCHOOLS }));

  await page.goto(TARGET_URL + '#/events', { waitUntil: 'networkidle' });

  assert(await page.locator('#events-view').evaluate(el => el.classList.contains('active')), 'events view active via #/events');
  const navLabels = await page.locator('.nav-menu .nav-link').allTextContents();
  assert(navLabels.map(t => t.trim()).includes('Wydarzenia'), 'nav contains Wydarzenia');

  assert(await page.locator('#featured-events-container .featured-tile').count() === 1, 'featured: only the flagged festival');
  assert(await page.locator('#events-list-container .event-row').count() === 3, 'list: 3 upcoming, past excluded');
  const months = await page.locator('#events-list-container .month-heading').allTextContents();
  assert(months.length === 2 && /Lipiec 2030/i.test(months[0]) && /Sierpień 2030/i.test(months[1]), 'month headings: Lipiec, Sierpień 2030');
  const firstRow = await page.locator('#events-list-container .event-row').first().textContent();
  assert(/Kizomba Social Night/.test(firstRow) && /Warszawa/.test(firstRow) && /21:00/.test(firstRow) && /30 zł/.test(firstRow), 'row shows title, city, time, price');
  assert(/7–9/.test(await page.locator('#events-list-container .event-row').nth(2).textContent()), 'multi-day range 7–9 rendered');

  // Filters
  const cityOptions = await page.locator('#event-city-filter option').allTextContents();
  assert(cityOptions.join(',').includes('Warszawa') && cityOptions.join(',').includes('Gdańsk') && !cityOptions.join(',').includes('Łódź'), 'city options from upcoming data only');
  await page.selectOption('#event-city-filter', 'Warszawa');
  await page.waitForTimeout(300);
  assert(await page.locator('#events-list-container .event-row').count() === 1, 'filter city=Warszawa → 1');
  assert(/1 wydarzenie pasuje/.test((await page.locator('#event-filter-status').textContent()) || ''), 'counter: 1 wydarzenie pasuje');
  await page.selectOption('#event-city-filter', '');
  await page.selectOption('#event-style-filter', 'kuduro');
  await page.waitForTimeout(300);
  assert(await page.locator('#events-list-container .event-row').count() === 1, 'filter style=kuduro → 1 (festival)');
  await page.click('#event-clear-filters');
  await page.selectOption('#event-type-filter', 'warsztaty');
  await page.waitForTimeout(300);
  assert(await page.locator('#events-list-container .event-row').count() === 1, 'filter type=warsztaty → 1');
  await page.selectOption('#event-type-filter', 'festiwal');
  await page.selectOption('#event-city-filter', 'Warszawa');
  await page.waitForTimeout(300);
  assert(await page.locator('#events-empty').isVisible(), 'zero matches → empty state with submit link');

  // Schools + submit
  assert(await page.locator('#schools-container .school-card').count() === 1, 'schools: 1 card');
  assert((await page.locator('#submit-event-link').getAttribute('href') || '').startsWith('https://'), 'submit link present');

  assert(errors.length === 0, 'no page errors: ' + JSON.stringify(errors));
  console.log(failures === 0 ? '\nALL TESTS PASSED' : '\n' + failures + ' FAILED');
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
```

- [ ] **Step 3: Run and verify it FAILS** — `cd ~/.claude/plugins/marketplaces/playwright-skill/skills/playwright-skill && node run.js /tmp/afropasso-events.test.js`. Expected: FAIL from the first assertion (`#events-view` does not exist yet).

### Task 3: Events view markup and nav

**Files:**
- Modify: `index.html` (nav, new view before `<!-- Dance Detail View -->` — after `#dances-view`)

- [ ] **Step 1: Nav item** — insert after the "Wszystkie tańce" item:

```html
<li><a href="#/events" class="nav-link" data-route="events">Wydarzenia</a></li>
```

- [ ] **Step 2: View markup:**

```html
<!-- Events View -->
<div id="events-view" class="view">
    <section class="events-section" aria-labelledby="events-title">
        <div class="section-heading">
            <p class="section-kicker">Hub wydarzeń</p>
            <h2 id="events-title">Wydarzenia</h2>
            <p class="events-intro">Potańcówki, warsztaty i festiwale tańców afro w Polsce — w jednym miejscu, zawsze aktualne.</p>
        </div>

        <div class="filters" aria-labelledby="event-filters-title">
            <h3 id="event-filters-title" class="sr-only">Filtry wydarzeń</h3>
            <div class="filters-container events-filters-container">
                <div class="filter-group">
                    <label for="event-city-filter">Miasto</label>
                    <select id="event-city-filter" aria-label="Filtruj według miasta">
                        <option value="">Wszystkie</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="event-style-filter">Styl tańca</label>
                    <select id="event-style-filter" aria-label="Filtruj według stylu tańca">
                        <option value="">Wszystkie</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="event-type-filter">Typ</label>
                    <select id="event-type-filter" aria-label="Filtruj według typu wydarzenia">
                        <option value="">Wszystkie</option>
                        <option value="social">Potańcówka / social</option>
                        <option value="warsztaty">Warsztaty</option>
                        <option value="festiwal">Festiwal</option>
                    </select>
                </div>
                <button id="event-clear-filters" class="btn-tertiary" aria-label="Wyczyść filtry wydarzeń">Wyczyść</button>
            </div>
            <p id="event-filter-status" class="filter-status hidden" role="status"></p>
        </div>

        <div id="featured-events-container" class="featured-events-grid"></div>
        <div id="events-list-container" class="events-list"></div>
        <div id="events-empty" class="no-results hidden" role="status" aria-live="polite">
            <p>Nie znamy nadchodzących wydarzeń pasujących do tych filtrów.</p>
            <a class="btn-primary submit-event-cta" href="#" target="_blank" rel="noopener">Zgłoś wydarzenie</a>
        </div>
        <div class="events-submit">
            <p>Organizujesz potańcówkę, warsztaty albo festiwal?</p>
            <a id="submit-event-link" class="btn-secondary submit-event-cta" href="#" target="_blank" rel="noopener">Zgłoś wydarzenie</a>
        </div>
    </section>

    <section class="schools-section" aria-labelledby="schools-title">
        <div class="section-heading">
            <p class="section-kicker">Regularne zajęcia</p>
            <h3 id="schools-title">Gdzie tańczyć regularnie</h3>
        </div>
        <div id="schools-container" class="schools-grid"></div>
    </section>
</div>
```

- [ ] **Step 3: Verify** — reload; nav shows "Wydarzenia"; view exists (still unstyled/empty, route not wired yet — suite still fails on `events view active`).

- [ ] **Step 4: Commit**

```bash
git add index.html && git commit -m "Add events view markup and nav item"
```

### Task 4: Events rendering logic

**Files:**
- Modify: `app.js` (`elements`, `initializeElements`, `setupEventListeners`, `handleRoute`, new functions after the glossary section)

- [ ] **Step 1: Element refs.** In the `elements` literal add:

```js
    events: {
        cityFilter: null,
        styleFilter: null,
        typeFilter: null,
        clearFilters: null,
        filterStatus: null,
        featuredContainer: null,
        listContainer: null,
        emptyState: null,
        submitLinks: null,
        schoolsContainer: null
    },
```

In `initializeElements`:

```js
    // Events view
    elements.events.cityFilter = document.getElementById('event-city-filter');
    elements.events.styleFilter = document.getElementById('event-style-filter');
    elements.events.typeFilter = document.getElementById('event-type-filter');
    elements.events.clearFilters = document.getElementById('event-clear-filters');
    elements.events.filterStatus = document.getElementById('event-filter-status');
    elements.events.featuredContainer = document.getElementById('featured-events-container');
    elements.events.listContainer = document.getElementById('events-list-container');
    elements.events.emptyState = document.getElementById('events-empty');
    elements.events.submitLinks = document.querySelectorAll('.submit-event-cta');
    elements.events.schoolsContainer = document.getElementById('schools-container');
```

In `initializeElements` also register the view: `elements.views.events = document.getElementById('events-view');`

- [ ] **Step 2: Listeners + submit URL.** Top of file, next to the globals:

```js
const EVENT_SUBMIT_FORM_URL = 'https://forms.gle/REPLACE-WITH-REAL-FORM';
```

In `setupEventListeners`:

```js
    // Event filters
    elements.events.cityFilter.addEventListener('change', handleEventFilters);
    elements.events.styleFilter.addEventListener('change', handleEventFilters);
    elements.events.typeFilter.addEventListener('change', handleEventFilters);
    elements.events.clearFilters.addEventListener('click', clearEventFilters);
    elements.events.submitLinks.forEach(link => { link.href = EVENT_SUBMIT_FORM_URL; });
```

In `handleRoute`'s switch:

```js
        case 'events':
            renderEventsPage();
            break;
```

- [ ] **Step 3: Core logic** — add a new section after the glossary functions:

```js
// ===== Events hub =====

const EVENT_TYPE_LABELS = { social: 'potańcówka', warsztaty: 'warsztaty', festiwal: 'festiwal' };
const eventMonthFormatter = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' });
const eventWeekdayFormatter = new Intl.DateTimeFormat('pl-PL', { weekday: 'short' });

function parseEventDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getUpcomingEvents() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventsData
        .filter(event => {
            const end = parseEventDate(event.date_end || event.date_start);
            if (!end || !parseEventDate(event.date_start)) {
                console.warn(`Pomijam wydarzenie z niepoprawną datą: ${event.id}`);
                return false;
            }
            return end >= today;
        })
        .sort((a, b) => a.date_start.localeCompare(b.date_start));
}

function handleEventFilters() {
    const city = elements.events.cityFilter.value;
    const style = elements.events.styleFilter.value;
    const type = elements.events.typeFilter.value;

    filteredEvents = getUpcomingEvents().filter(event =>
        (!city || event.city === city) &&
        (!style || event.styles.includes(style)) &&
        (!type || event.type === type)
    );

    renderFeaturedEvents();
    renderEventsList();
    updateEventFilterStatus(Boolean(city || style || type));
}

function clearEventFilters() {
    elements.events.cityFilter.value = '';
    elements.events.styleFilter.value = '';
    elements.events.typeFilter.value = '';
    handleEventFilters();
}

function renderEventsPage() {
    if (!eventsData) {
        elements.events.listContainer.innerHTML =
            '<p class="events-error">Błąd podczas ładowania wydarzeń. Spróbuj odświeżyć stronę.</p>';
        return;
    }
    populateEventFilterOptions();
    handleEventFilters();
    renderSchools();
}

function populateEventFilterOptions() {
    const upcoming = getUpcomingEvents();
    const selectedCity = elements.events.cityFilter.value;
    const selectedStyle = elements.events.styleFilter.value;

    const cities = [...new Set(upcoming.map(event => event.city))].sort((a, b) => a.localeCompare(b, 'pl'));
    elements.events.cityFilter.innerHTML = '<option value="">Wszystkie</option>' +
        cities.map(city => `<option value="${escapeAttribute(city)}">${escapeHTML(city)}</option>`).join('');
    elements.events.cityFilter.value = cities.includes(selectedCity) ? selectedCity : '';

    const styleSlugs = [...new Set(upcoming.flatMap(event => event.styles))];
    const styles = styleSlugs
        .map(slug => ({ slug, name: (dancesData.find(dance => dance.slug === slug) || {}).names?.pl || slug }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    elements.events.styleFilter.innerHTML = '<option value="">Wszystkie</option>' +
        styles.map(style => `<option value="${escapeAttribute(style.slug)}">${escapeHTML(style.name)}</option>`).join('');
    elements.events.styleFilter.value = styleSlugs.includes(selectedStyle) ? selectedStyle : '';
}

function renderFeaturedEvents() {
    const featured = filteredEvents.filter(event => event.featured).slice(0, 3);
    elements.events.featuredContainer.innerHTML = featured.map(event => `
        <a class="featured-tile featured-event-tile" href="${escapeAttribute(event.url)}" target="_blank" rel="noopener"
           ${event.image ? `style="--tile-image: url('${escapeAttribute(event.image)}')"` : ''}>
            <div class="featured-tile-content">
                <p class="featured-country">${escapeHTML(formatEventDateLabel(event))} · ${escapeHTML(event.city)}</p>
                <h4>${escapeHTML(event.title)}</h4>
                <p class="featured-character">${escapeHTML(EVENT_TYPE_LABELS[event.type] || event.type)}</p>
                <span>Zobacz wydarzenie</span>
            </div>
        </a>
    `).join('');
}

function renderEventsList() {
    const container = elements.events.listContainer;
    if (filteredEvents.length === 0) {
        container.innerHTML = '';
        elements.events.emptyState.classList.remove('hidden');
        return;
    }
    elements.events.emptyState.classList.add('hidden');

    let currentMonth = '';
    let html = '';
    for (const event of filteredEvents) {
        const monthKey = event.date_start.slice(0, 7);
        if (monthKey !== currentMonth) {
            currentMonth = monthKey;
            const label = eventMonthFormatter.format(parseEventDate(event.date_start));
            html += `<h3 class="month-heading">${escapeHTML(label.charAt(0).toUpperCase() + label.slice(1))}</h3>`;
        }
        html += eventRowHTML(event);
    }
    container.innerHTML = html;
}

function eventRowHTML(event) {
    const start = parseEventDate(event.date_start);
    const end = event.date_end && event.date_end !== event.date_start ? parseEventDate(event.date_end) : null;
    const dayLabel = end ? `${start.getDate()}–${end.getDate()}` : String(start.getDate());
    const weekday = end
        ? `${eventWeekdayFormatter.format(start)}–${eventWeekdayFormatter.format(end)}`
        : eventWeekdayFormatter.format(start);
    const styleNames = event.styles
        .map(slug => (dancesData.find(dance => dance.slug === slug) || {}).names?.pl || slug)
        .join(', ');
    const meta = [event.city, EVENT_TYPE_LABELS[event.type] || event.type, styleNames].filter(Boolean).join(' · ');
    const details = [event.time, event.venue, event.price].filter(Boolean).join(' · ');

    return `
        <article class="event-row">
            <div class="event-date-block" aria-hidden="true">
                <span class="event-day">${escapeHTML(dayLabel)}</span>
                <span class="event-weekday">${escapeHTML(weekday)}</span>
            </div>
            <div class="event-row-body">
                <h4 class="event-title">${escapeHTML(event.title)}</h4>
                <p class="event-meta">${escapeHTML(meta)}</p>
                ${details ? `<p class="event-details">${escapeHTML(details)}</p>` : ''}
            </div>
            <a class="event-link" href="${escapeAttribute(event.url)}" target="_blank" rel="noopener">Szczegóły</a>
        </article>
    `;
}

function formatEventDateLabel(event) {
    const start = parseEventDate(event.date_start);
    const day = String(start.getDate());
    const month = String(start.getMonth() + 1).padStart(2, '0');
    if (event.date_end && event.date_end !== event.date_start) {
        const end = parseEventDate(event.date_end);
        return `${day}–${end.getDate()}.${month}`;
    }
    return `${day}.${month}`;
}

function updateEventFilterStatus(hasFilters) {
    const status = elements.events.filterStatus;
    if (!hasFilters) {
        status.textContent = '';
        status.classList.add('hidden');
        return;
    }
    status.textContent = formatEventFilterStatus(filteredEvents.length);
    status.classList.remove('hidden');
}

function formatEventFilterStatus(count) {
    if (count === 0) return 'Żadne wydarzenie nie pasuje do filtrów.';
    if (count === 1) return '1 wydarzenie pasuje do filtrów.';
    const few = count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14);
    return few ? `${count} wydarzenia pasują do filtrów.` : `${count} wydarzeń pasuje do filtrów.`;
}

function renderSchools() {
    if (!schoolsData || !elements.events.schoolsContainer) return;
    if (schoolsData.length === 0) {
        elements.events.schoolsContainer.innerHTML =
            '<p class="schools-empty">Wkrótce dodamy szkoły i regularne zajęcia. Prowadzisz takie? Zgłoś się!</p>';
        return;
    }
    elements.events.schoolsContainer.innerHTML = schoolsData.map(school => `
        <article class="school-card">
            <h4>${escapeHTML(school.name)}</h4>
            <p class="school-meta">${escapeHTML(school.city)} · ${escapeHTML(school.schedule_pl)}</p>
            <p class="school-styles">${escapeHTML(school.styles.map(slug => (dancesData.find(dance => dance.slug === slug) || {}).names?.pl || slug).join(', '))}</p>
            <a class="card-link" href="${escapeAttribute(school.url)}" target="_blank" rel="noopener">Zapisy i informacje</a>
        </article>
    `).join('');
}
```

- [ ] **Step 4: Verify** — `node --check app.js` → clean. Rerun the Task 2 suite; layout assertions may fail (CSS pending) but logic assertions (counts, months, filters, counter) should PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js && git commit -m "Render events page: featured tiles, month-grouped list, filters, schools"
```

### Task 5: Events styling

**Files:**
- Modify: `styles.css` (new section after the `.no-results` block; mobile rules near the existing `@media` blocks)

- [ ] **Step 1: Add styles** (warm palette per DESIGN.md — no pure black/white, borders not side-stripes):

```css
/* ===== Events hub ===== */
.events-section {
    margin-top: var(--space-5);
}

.events-intro {
    max-width: 46rem;
    color: var(--muted);
}

.featured-events-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 230px;
    gap: var(--space-3);
    padding-top: var(--space-5);
}

.featured-events-grid:empty {
    display: none;
}

.featured-event-tile {
    text-decoration: none;
}

.month-heading {
    margin: var(--space-5) 0 var(--space-3);
    color: var(--clay);
    font-size: 1.1rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.event-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    margin-bottom: var(--space-2, 12px);
    border: 1px solid var(--sand-line);
    border-radius: var(--radius-md);
    background: var(--surface);
}

.event-date-block {
    min-width: 74px;
    padding: 10px 8px;
    border-radius: var(--radius-sm);
    background: var(--sand);
    text-align: center;
    color: var(--ink);
}

.event-day {
    display: block;
    font-size: 1.35rem;
    font-weight: 600;
}

.event-weekday {
    display: block;
    font-size: 0.78rem;
    color: var(--muted);
}

.event-row-body {
    flex: 1;
}

.event-title {
    margin: 0 0 4px;
    font-size: 1.15rem;
}

.event-meta,
.event-details {
    margin: 0;
    color: var(--muted);
    font-size: 0.92rem;
}

.event-link {
    align-self: center;
    white-space: nowrap;
}

.events-submit {
    margin-top: var(--space-5);
    padding: var(--space-4, 24px);
    border: 1px solid var(--sand-line);
    border-radius: var(--radius-lg);
    background: var(--sand);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
}

.schools-section {
    margin-top: var(--space-6, 64px);
}

.schools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-3);
    padding-top: var(--space-4, 24px);
}

.school-card {
    padding: var(--space-3);
    border: 1px solid var(--sand-line);
    border-radius: var(--radius-md);
    background: var(--surface);
}

.schools-empty,
.events-error {
    color: var(--muted);
}

@media (max-width: 760px) {
    .featured-events-grid {
        grid-template-columns: 1fr;
    }
    .event-row {
        flex-wrap: wrap;
    }
    .events-submit {
        flex-direction: column;
        text-align: center;
    }
}
```

**Note:** before committing, check that every `var(--…)` token used above exists in `:root` of `styles.css` (names like `--sand`, `--surface`, `--clay`, `--ink`, `--space-*`, `--radius-*`). Where a token differs (e.g. the sand background variable has another name), use the existing token — do not invent new ones.

- [ ] **Step 2: Verify + commit**

Run the Task 2 suite — layout assertions now meaningful. Then:
```bash
git add styles.css && git commit -m "Style events hub: date rows, month headings, featured tiles, schools"
```

### Task 6: Curator tool — pure functions with unit tests (TDD)

**Files:**
- Create: `tools/add-event.js`, `tools/add-event.test.js`

- [ ] **Step 1: Write failing tests:**

```js
// tools/add-event.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { parseOgTags, validateEvent, insertEventSorted, slugifyEvent } = require('./add-event.js');

test('parseOgTags extracts title, image, description in both attribute orders', () => {
    const html = `
        <meta property="og:title" content="Kizomba Night &amp; Social"/>
        <meta content="https://cdn.example.com/e.jpg" property="og:image">
        <meta property="og:description" content="Zapraszamy!">`;
    const tags = parseOgTags(html);
    assert.equal(tags.title, 'Kizomba Night & Social');
    assert.equal(tags.image, 'https://cdn.example.com/e.jpg');
    assert.equal(tags.description, 'Zapraszamy!');
});

test('parseOgTags returns empty object for HTML without OG tags', () => {
    assert.deepEqual(parseOgTags('<html><body>nic</body></html>'), {});
});

test('validateEvent accepts a complete valid entry', () => {
    const errors = validateEvent(
        { id: 'social-warszawa-2030-07-12', title: 'X', type: 'social', styles: ['kizomba'],
          city: 'Warszawa', date_start: '2030-07-12', url: 'https://fb.com/e/1',
          featured: false, organizer: 'Y', source: 'kurator' },
        ['kizomba', 'semba'], []);
    assert.deepEqual(errors, []);
});

test('validateEvent rejects bad date, unknown style, bad type, duplicate id, missing fields', () => {
    const errors = validateEvent(
        { id: 'dup', title: '', type: 'koncert', styles: ['tango'], city: '',
          date_start: '12.07.2030', url: '', featured: false, organizer: '', source: 'kurator' },
        ['kizomba'], ['dup']);
    assert.ok(errors.some(e => e.includes('date_start')));
    assert.ok(errors.some(e => e.includes('tango')));
    assert.ok(errors.some(e => e.includes('type')));
    assert.ok(errors.some(e => e.includes('id')));
    assert.ok(errors.some(e => e.includes('title')));
    assert.ok(errors.some(e => e.includes('city')));
    assert.ok(errors.some(e => e.includes('url')));
});

test('insertEventSorted keeps chronological order', () => {
    const events = [{ id: 'a', date_start: '2030-01-01' }, { id: 'c', date_start: '2030-03-01' }];
    const result = insertEventSorted(events, { id: 'b', date_start: '2030-02-01' });
    assert.deepEqual(result.map(e => e.id), ['a', 'b', 'c']);
});

test('slugifyEvent builds ascii slug from Polish title, city, date', () => {
    assert.equal(
        slugifyEvent('Potańcówka Łódź – Kizomba & Semba!', 'Łódź', '2030-07-12'),
        'potancowka-lodz-kizomba-semba-lodz-2030-07-12');
});
```

- [ ] **Step 2: Run to verify FAIL** — `node --test tools/` → all tests fail (`Cannot find module './add-event.js'`).

- [ ] **Step 3: Implement the pure functions** in `tools/add-event.js`:

```js
#!/usr/bin/env node
// AfroPasso curator tool: import an event from a public event URL into data/events.json.
// Usage: node tools/add-event.js <url>     (or with no URL for fully manual entry)
'use strict';

const fs = require('fs');
const path = require('path');

const EVENT_TYPES = ['social', 'warsztaty', 'festiwal'];
const DATA_DIR = path.join(__dirname, '..', 'data');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'events');

function decodeEntities(value) {
    return value
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function parseOgTags(html) {
    const tags = {};
    const metaRegex = /<meta\b[^>]*>/gi;
    for (const [meta] of html.matchAll(metaRegex)) {
        const property = meta.match(/property=["']og:([^"']+)["']/i);
        const content = meta.match(/content=["']([^"']*)["']/i);
        if (property && content && !(property[1] in tags)) {
            tags[property[1]] = decodeEntities(content[1]);
        }
    }
    return tags;
}

function validateEvent(event, knownStyleSlugs, existingIds) {
    const errors = [];
    for (const field of ['id', 'title', 'city', 'url']) {
        if (!event[field] || !String(event[field]).trim()) errors.push(`Brak wymaganego pola: ${field}`);
    }
    if (!EVENT_TYPES.includes(event.type)) errors.push(`Nieznany type: "${event.type}" (dozwolone: ${EVENT_TYPES.join(', ')})`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date_start || '') || Number.isNaN(new Date(`${event.date_start}T00:00:00`).getTime())) {
        errors.push(`Niepoprawne date_start: "${event.date_start}" (format RRRR-MM-DD)`);
    }
    if (event.date_end && (!/^\d{4}-\d{2}-\d{2}$/.test(event.date_end) || event.date_end < event.date_start)) {
        errors.push(`Niepoprawne date_end: "${event.date_end}"`);
    }
    for (const slug of event.styles || []) {
        if (!knownStyleSlugs.includes(slug)) errors.push(`Nieznany styl: "${slug}" (slug musi istnieć w dances.json)`);
    }
    if (existingIds.includes(event.id)) errors.push(`Wydarzenie o id "${event.id}" już istnieje`);
    return errors;
}

function insertEventSorted(events, entry) {
    return [...events, entry].sort((a, b) => a.date_start.localeCompare(b.date_start));
}

function slugifyEvent(title, city, dateStart) {
    const ascii = (value) => value.toLowerCase()
        .replace(/[ąćęłńóśźż]/g, ch => ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }[ch]))
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${ascii(title)}-${ascii(city)}-${dateStart}`;
}

module.exports = { parseOgTags, validateEvent, insertEventSorted, slugifyEvent };
```

- [ ] **Step 4: Run tests, verify PASS** — `node --test tools/` → 6 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add tools/add-event.js tools/add-event.test.js
git commit -m "Add curator tool core: OG parsing, validation, sorted insert"
```

### Task 7: Curator tool — interactive CLI flow

**Files:**
- Modify: `tools/add-event.js` (append below `module.exports`)

- [ ] **Step 1: Append the CLI** (guarded by `require.main`, so tests are unaffected):

```js
async function fetchOgTags(url) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AfroPassoBot/1.0)' },
            redirect: 'follow'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return parseOgTags(await response.text());
    } catch (error) {
        console.warn(`Nie udało się pobrać metadanych (${error.message}) — wpiszesz dane ręcznie.`);
        return {};
    }
}

async function downloadImage(imageUrl, id) {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const ext = (imageUrl.match(/\.(jpe?g|png|webp)(?:\?|$)/i) || [, 'jpg'])[1].toLowerCase();
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
        const filePath = path.join(IMAGES_DIR, `${id}.${ext}`);
        fs.writeFileSync(filePath, Buffer.from(await response.arrayBuffer()));
        return `assets/events/${id}.${ext}`;
    } catch (error) {
        console.warn(`Nie udało się pobrać grafiki: ${error.message}`);
        return '';
    }
}

async function main() {
    const readline = require('readline/promises');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = async (label, preset = '') => {
        const answer = (await rl.question(preset ? `${label} [${preset}]: ` : `${label}: `)).trim();
        return answer || preset;
    };

    const url = process.argv[2] || await ask('Link do wydarzenia (np. Facebook)');
    const og = process.argv[2] ? await fetchOgTags(url) : {};
    if (og.title) console.log(`Znaleziono: "${og.title}"`);

    const dances = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dances.json'), 'utf8')).dances;
    const knownStyleSlugs = dances.map(dance => dance.slug);
    const eventsFile = path.join(DATA_DIR, 'events.json');
    const eventsJson = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));

    const title = await ask('Tytuł', og.title || '');
    const type = await ask(`Typ (${EVENT_TYPES.join(' / ')})`, 'social');
    const city = await ask('Miasto');
    const date_start = await ask('Data rozpoczęcia (RRRR-MM-DD)');
    const date_end = await ask('Data zakończenia (enter = jednodniowe)', '');
    const time = await ask('Godzina (np. 21:00, enter = pomiń)', '');
    const price = await ask('Cena (np. 30 zł, enter = pomiń)', '');
    const stylesRaw = await ask(`Style (slugi po przecinku; dostępne: ${knownStyleSlugs.join(', ')})`, 'kizomba');
    const organizer = await ask('Organizator', '');
    const featured = (await ask('Wyróżnione? (t/n)', 'n')).toLowerCase().startsWith('t');
    const source = await ask('Źródło (fb / zgloszenie / kurator)', 'fb');
    const id = await ask('Id', slugifyEvent(title, city, date_start));

    const event = {
        id, title, type,
        styles: stylesRaw.split(',').map(s => s.trim()).filter(Boolean),
        city, date_start, url, featured, organizer, source
    };
    const venue = await ask('Miejsce (enter = pomiń)', '');
    if (venue) event.venue = venue;
    if (date_end) event.date_end = date_end;
    if (time) event.time = time;
    if (price) event.price = price;

    if (og.image && (await ask(`Pobrać grafikę? ${og.image} (t/n)`, 't')).toLowerCase().startsWith('t')) {
        const imagePath = await downloadImage(og.image, id);
        if (imagePath) event.image = imagePath;
    }

    const errors = validateEvent(event, knownStyleSlugs, eventsJson.events.map(e => e.id));
    if (errors.length > 0) {
        console.error('\nBłędy — nic nie zapisano:');
        errors.forEach(error => console.error(`  - ${error}`));
        rl.close();
        process.exit(1);
    }

    eventsJson.events = insertEventSorted(eventsJson.events, event);
    fs.writeFileSync(eventsFile, JSON.stringify(eventsJson, null, 4) + '\n');
    console.log(`\nZapisano "${title}" do data/events.json. Sprawdź diff, potem: git add data/events.json assets/events && git commit`);
    rl.close();
}

if (require.main === module) {
    main().catch(error => { console.error(error); process.exit(1); });
}
```

- [ ] **Step 2: Verify** — `node --check tools/add-event.js`; `node --test tools/` still all-pass. Smoke-run manual mode: `node tools/add-event.js` and enter a valid dummy event; confirm `data/events.json` gains a sorted entry; then `git checkout data/events.json` to discard the dummy.

- [ ] **Step 3: Commit**

```bash
git add tools/add-event.js && git commit -m "Add interactive CLI flow to curator tool"
```

### Task 8: Green e2e, visual pass, docs

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Run the Task 2 suite** — Expected: `ALL TESTS PASSED`, exit 0.

- [ ] **Step 2: Empty-state check without fixtures** — open `http://localhost:8123#/events` (no interception): empty state and "Wkrótce dodamy szkoły…" render, no console errors.

- [ ] **Step 3: Visual pass** — desktop (1440×900) + mobile (390×844) screenshots of `#/events` with fixtures; verify against DESIGN.md.

- [ ] **Step 4: Update `AGENTS.md`** — add to Architecture: `data/events.json` + `data/schools.json` (events hub data), `tools/add-event.js` (curator import CLI; run `node --test tools/` before claiming tool changes complete), `#/events` route.

- [ ] **Step 5: Commit and stop server**

```bash
git add AGENTS.md && git commit -m "Document events hub in agent notes"
pkill -f "http.server 8123"
```

---

## Phase 2 outline (separate plan when Phase 1 ships)

- **ICS feed:** GitHub Action on push to `data/events.json` runs `tools/build-ics.js` → `afropasso.ics` at repo root; "Subskrybuj kalendarz" link on the events page; per-event "Dodaj do kalendarza" via client-side ICS blob.
- **Archiving:** monthly Action moves past events to `data/events-archive.json`.
- **Newsletter:** Buttondown (or similar) signup embed; `tools/digest.js` renders the weekly-digest draft from upcoming events.

## Phase 3 outline (separate plan)

- **Organizer profiles:** `data/organizers.json`, `#/organizer/<id>` route, events gain `organizer_id`.
- **Personalization:** remembered city filter + starred events in `localStorage`.
- **Monetization:** `featured` slots sold manually (curator sets the flag); pricing/process documented outside the codebase.
