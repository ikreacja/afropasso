# "Wszystkie tańce" Library Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move search/filters and the full dance index from the home page to a new `#/dances` page; home keeps curated static blocks plus a 6-card library preview.

**Architecture:** Vanilla-JS hash-router SPA (no build step). All views are `<section>` blocks in `index.html` toggled by `app.js`. This plan adds a `dances` view/route, reverts the featured-tiles filter reactivity, and extracts a shared card template so home preview and library grid render identically.

**Tech Stack:** Static HTML/CSS/JS, `data/dances.json`, Playwright (via playwright-skill executor) for e2e verification, `python3 -m http.server` for local serving.

**Spec:** `docs/superpowers/specs/2026-07-09-wszystkie-tance-library-page-design.md`

**Working-tree note:** The tree already contains the 2026-07-09 filter fix (featured tiles react to filters, `#filter-status` counter). Task 3 deliberately reverts the featured reactivity and keeps the counter. Do not `git checkout` anything — edit forward.

---

### Task 1: Failing e2e suite for the target structure

**Files:**
- Create: `/tmp/afropasso-library-page.test.js` (throwaway e2e script; not committed)

- [ ] **Step 1: Start the local server** (leave running for all tasks)

Run (background): `cd /Users/ikreacja/Documents/1.PROJEKTY/_Apps/AfroPasso && python3 -m http.server 8123`

- [ ] **Step 2: Write the e2e suite**

```js
// /tmp/afropasso-library-page.test.js
const { chromium } = require('playwright');
const TARGET_URL = 'http://localhost:8123';
let failures = 0;
function assert(cond, label) {
  console.log((cond ? 'PASS' : 'FAIL') + ' — ' + label);
  if (!cond) failures++;
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  // Home structure
  assert(await page.locator('#featured-dances-container .featured-tile').count() === 8, 'home: 8 featured tiles');
  assert(await page.locator('.dance-pillars').isVisible(), 'home: pillars section visible');
  assert(await page.locator('#library-preview-container .dance-card').count() === 6, 'home: 6 preview cards');
  assert(!(await page.locator('#search-input').isVisible()), 'home: search input not visible');
  assert(await page.locator('.hero-actions .btn-primary').getAttribute('href') === '#/dances', 'hero CTA points to #/dances');

  // Nav
  const navLabels = await page.locator('.nav-menu .nav-link').allTextContents();
  assert(navLabels.length === 4 && navLabels[0].trim() === 'Wszystkie tańce', 'nav: 4 items, first = Wszystkie tańce');

  // Preview button navigates to library
  await page.click('text=Zobacz wszystkie tańce');
  await page.waitForTimeout(200);
  assert(await page.locator('#dances-view').evaluate(el => el.classList.contains('active')), 'library: view active');
  assert(await page.locator('#dances-container .dance-card').count() === 9, 'library: 9 cards');
  assert(await page.locator('#search-input').isVisible(), 'library: search visible');

  // Filters work on library page
  await page.fill('#search-input', 'semba');
  await page.waitForTimeout(600);
  assert(await page.locator('#dances-container .dance-card').count() === 3, 'library: search semba → 3');
  assert(await page.locator('#filter-status').isVisible(), 'library: status counter visible');
  await page.click('#clear-filters');
  await page.waitForTimeout(200);
  await page.selectOption('#country-filter', 'Haiti');
  await page.waitForTimeout(300);
  assert(await page.locator('#dances-container .dance-card').count() === 1, 'library: Haiti → 1');
  await page.fill('#search-input', 'xyz-nie-ma');
  await page.waitForTimeout(600);
  assert(await page.locator('#no-results').isVisible(), 'library: no-results visible');

  // Home is untouched by library filtering
  await page.click('.nav-title a');
  await page.waitForTimeout(200);
  assert(await page.locator('#home-view').evaluate(el => el.classList.contains('active')), 'logo returns home');
  assert(await page.locator('#featured-dances-container .featured-tile').count() === 8, 'home: featured still 8 after filtering');
  assert(await page.locator('#library-preview-container .dance-card').count() === 6, 'home: preview still 6');

  assert(errors.length === 0, 'no page errors: ' + JSON.stringify(errors));
  console.log(failures === 0 ? '\nALL TESTS PASSED' : '\n' + failures + ' FAILED');
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
```

- [ ] **Step 3: Run and verify it FAILS**

Run: `cd ~/.claude/plugins/marketplaces/playwright-skill/skills/playwright-skill && node run.js /tmp/afropasso-library-page.test.js`
Expected: FAIL on `home: 6 preview cards`, `nav: 4 items…`, `hero CTA`, etc. (current site has no `#library-preview-container`, nav says "Biblioteka").

### Task 2: Extract shared card template `danceCardHTML()`

**Files:**
- Modify: `app.js` (function `renderDanceCards`, ~line 319)

- [ ] **Step 1: Refactor** — replace the inline template in `renderDanceCards` with:

```js
function danceCardHTML(dance, index) {
    return `
        <article class="dance-card" onclick="navigateTo('/dance/${escapeAttribute(dance.slug)}')"
                 role="button" tabindex="0" style="--i: ${index}"
                 onkeydown="if(event.key==='Enter'||event.key===' ') navigateTo('/dance/${escapeAttribute(dance.slug)}')">
            <header class="dance-card-header">
                <p class="dance-card-number">${String(index + 1).padStart(2, '0')}</p>
                <h3 class="dance-card-title">${escapeHTML(dance.names.pl)}</h3>
                <p class="dance-card-origin">${escapeHTML(formatOrigin(dance))}</p>
                <p class="dance-card-region">${escapeHTML(dance.origin.years)}</p>
            </header>
            <div class="dance-card-body">
                <p class="dance-card-character">
                    <strong>Charakter</strong>
                    <span>${escapeHTML(formatClassification(dance))}</span>
                </p>
                <p class="dance-card-description">
                    ${escapeHTML(truncateText(dance.character_pl, 170))}
                </p>
                <footer class="dance-card-footer">
                    <span class="card-link">Poznaj historię</span>
                </footer>
            </div>
        </article>
    `;
}
```

and shrink `renderDanceCards` body to use it:

```js
    container.innerHTML = filteredDances.map((dance, index) => danceCardHTML(dance, index)).join('');
```

- [ ] **Step 2: Verify** — `node --check app.js` → no output. Reload `http://localhost:8123` manually or rerun Task 1 suite: the same assertions fail as before (refactor changes nothing visible).

- [ ] **Step 3: Commit**

```bash
git add app.js && git commit -m "Extract danceCardHTML shared card template"
```

### Task 3: Revert featured-tiles filter reactivity

**Files:**
- Modify: `app.js` (`renderFeaturedDances`, `handleFilters`, `clearFilters`)

- [ ] **Step 1: Make `renderFeaturedDances` static again** — remove the `matchingSlugs` filtering and section hiding added on 2026-07-09:

```js
function renderFeaturedDances() {
    if (!dancesData || !elements.home.featuredContainer) return;

    const featuredSlugs = ['kizomba', 'semba', 'tarraxinha', 'tarraxo', 'kizomba-fusion', 'urban-kizz', 'kuduro', 'kompa'];
    const featured = featuredSlugs
        .map(slug => dancesData.find(dance => dance.slug === slug))
        .filter(Boolean);
```

(rest of the function unchanged). Also delete the `featuredSection` entries in the `elements` literal and in `initializeElements` (both added 2026-07-09), and remove the `renderFeaturedDances();` call from **both** `handleFilters()` and `clearFilters()` (keep `renderDanceCards()` and `updateFilterStatus()` there).

- [ ] **Step 2: Verify** — `node --check app.js` → clean.

- [ ] **Step 3: Commit**

```bash
git add app.js && git commit -m "Make featured tiles static again (curated, filter-independent)"
```

### Task 4: New `#/dances` view — markup move, nav, route

**Files:**
- Modify: `index.html` (nav `~line 73`, home view `~lines 100-222`), `app.js` (`elements`, `initializeElements`, `handleRoute`)

- [ ] **Step 1: Update nav item** in `index.html`:

```html
<li><a href="#/dances" class="nav-link" data-route="dances">Wszystkie tańce</a></li>
```

replaces `<li><a href="#/" class="nav-link active" data-route="home">Biblioteka</a></li>`. (Logo already links to `#/` — no change.)

- [ ] **Step 2: Create the dances view** in `index.html`, inserted between `#home-view`'s closing `</div>` and `<!-- Dance Detail View -->`. MOVE (cut from home view, paste here) the entire `<div class="filters">…</div>` block, the `<div id="dances-container">…</div>`, the `<div id="no-results">…</div>`, and the `#filter-status` element into this shell:

```html
<!-- Dances Library View -->
<div id="dances-view" class="view">
    <section class="library-panel" aria-labelledby="all-dances-title">
        <div class="section-heading">
            <p class="section-kicker">Biblioteka tańców</p>
            <h2 id="all-dances-title">Wszystkie tańce</h2>
        </div>
        <!-- [MOVED] <div class="filters"> … </div> (with #filter-status inside) -->
        <div class="dances-grid">
            <!-- [MOVED] <div id="dances-container" …> and <div id="no-results" …> -->
        </div>
    </section>
</div>
```

In the home view: the `library-panel` section keeps its heading and the `featured-dances` block; the old `dances-grid` section is emptied for Task 5 (leave its `<section>` shell in place).

- [ ] **Step 3: Register view and route** in `app.js`. In `initializeElements`:

```js
    elements.views.dances = document.getElementById('dances-view');
```

In `handleRoute`'s switch, change the `home` case and add `dances`:

```js
        case 'home':
            renderLibraryPreview();
            break;
        case 'dances':
            renderDanceCards();
            break;
```

(`renderLibraryPreview` arrives in Task 5; add a stub `function renderLibraryPreview() {}` now so nothing throws.)

- [ ] **Step 4: Verify** — `node --check app.js`; reload page: nav shows "Wszystkie tańce", clicking it shows filters + 9 cards; home no longer shows filters.

- [ ] **Step 5: Commit**

```bash
git add index.html app.js && git commit -m "Add Wszystkie tańce page with filters and full index"
```

### Task 5: Home library preview (6 cards + CTA)

**Files:**
- Modify: `index.html` (home `dances-grid` section, hero CTA), `app.js` (`elements.home`, `initializeElements`, `loadData`, `renderLibraryPreview`), `styles.css`

- [ ] **Step 1: Home preview markup** — fill the emptied home `dances-grid` section:

```html
<section class="dances-grid" aria-labelledby="library-preview-title">
    <div class="section-heading library-heading">
        <p class="section-kicker">Z biblioteki AfroPasso</p>
        <h3 id="library-preview-title">Zajrzyj do biblioteki tańców</h3>
    </div>
    <div id="library-preview-container" class="cards-grid" aria-label="Podgląd biblioteki tańców"></div>
    <div class="library-preview-action">
        <a class="btn-primary" href="#/dances">Zobacz wszystkie tańce</a>
    </div>
</section>
```

Change the hero CTA: `<a class="btn-primary" href="#dances-title">Przeglądaj tańce</a>` → `href="#/dances"`.

- [ ] **Step 2: Render logic** in `app.js` — add to the `elements.home` literal: `previewContainer: null,`; in `initializeElements`: `elements.home.previewContainer = document.getElementById('library-preview-container');`; replace the Task 4 stub:

```js
function renderLibraryPreview() {
    if (!dancesData || !elements.home.previewContainer) return;
    elements.home.previewContainer.innerHTML = dancesData
        .slice(0, 6)
        .map((dance, index) => danceCardHTML(dance, index))
        .join('');
}
```

and call `renderLibraryPreview();` in `loadData()` right after `renderFeaturedDances();`.

- [ ] **Step 3: CSS** — add to `styles.css` next to `.no-results`:

```css
.library-preview-action {
    margin-top: var(--space-5);
    display: flex;
    justify-content: center;
}
```

- [ ] **Step 4: Verify** — `node --check app.js`; reload home: 6 cards + centered button.

- [ ] **Step 5: Commit**

```bash
git add index.html app.js styles.css && git commit -m "Add home library preview with Zobacz wszystkie tańce CTA"
```

### Task 6: Green suite, visual pass, docs

**Files:**
- Modify: `AGENTS.md` (architecture section)

- [ ] **Step 1: Run the Task 1 suite** — Expected: `ALL TESTS PASSED`, exit 0. Fix forward if not.

- [ ] **Step 2: Visual pass** — screenshot desktop (1440×900) and mobile (390×844) of home and `#/dances`; check the preview grid, filter layout, and status counter against DESIGN.md (warm palette, no pure black/white).

- [ ] **Step 3: Data sanity** — `node -e "JSON.parse(require('fs').readFileSync('data/dances.json'))"` → silent.

- [ ] **Step 4: Update `AGENTS.md`** — in the Architecture section, extend the `app.js` bullet's route list with `#/dances` and note: home shows a static 6-card library preview; search/filtering lives on the Wszystkie tańce page.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md && git commit -m "Document Wszystkie tańce page in agent notes"
```

- [ ] **Step 6: Stop the server** — `pkill -f "http.server 8123"`.
