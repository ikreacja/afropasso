# Homepage Discovery Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the home page's duplicate "Zajrzyj do biblioteki tańców" preview (6 cards, same destination as `#/dances`), relocate its "Zobacz wszystkie tańce" button under the featured-tiles grid, and replace the removed section with a new discovery-guide section that teases the 5 other site destinations (Społeczność, Etykieta, Korzenie, Porównaj, Glosariusz).

**Architecture:** New static (non-data-driven) `.guide-panel` section in `index.html`, styled with a fresh `.guide-grid`/`.guide-tile` CSS namespace modeled on `.featured-tile` but without any of the `featured-motion.js` JS coupling — entrance animation reuses the existing generic `setupReveals()` reveal system in `hero-motion.js`, hover reuses the existing CSS-only `.featured-tile:hover` fallback pattern. No new JS files.

**Tech Stack:** Vanilla JS/HTML/CSS (no build step). Verification via `node --check`, `python3 -m http.server 8123`, and Playwright (Python) browser checks — this project has no unit test framework.

**Spec:** `docs/superpowers/specs/2026-07-13-homepage-discovery-guide-design.md` — read it for full rationale; this plan implements it task-by-task.

---

## Project context (read first — zero-context primer)

- **AfroPasso is a static site.** No `package.json` at root, no bundler. Plain `index.html` + `app.js` + `styles.css` served from the repo root (GitHub Pages). Never introduce a build step. Relative paths only.
- **No test framework.** Verify with `node --check app.js`, `node -e "JSON.parse(require('fs').readFileSync('data/dances.json'))"`, and Playwright browser scripts written to the scratchpad (never commit them). Local server: `python3 -m http.server 8123` (port 8123 on purpose — see `AGENTS.md`).
- **This session already fixed a real Chromium rendering bug** on `.featured-tile`: a `::after` generated-content pseudo-element combined with `overflow:hidden` + an absolutely-positioned full-cover sibling could "ghost"-render at the tile's corner. The fix was to use a real inline `<span class="tile-arrow">` instead of CSS `content: "→"`. **This plan reuses that same real-element `.tile-arrow` pattern for the new guide tiles' CTAs — never reintroduce a `content: "→"` pseudo-element.**
- **Do not touch `.featured-tile`, `.featured-grid`, `.featured-tile-media`, `.tile-arrow`, or `featured-motion.js`** in this plan except where a task explicitly says so (Task 5 only touches `hero-motion.js`, not `featured-motion.js`). The new section is deliberately decoupled from that system.
- **`passo-companion.js`** is unrelated in-progress work from a separate session; do not modify it.

### Current state (baseline you are changing)

`index.html` home view (`#home-view`), in this order: `.hero` → `.library-panel` (featured-tiles grid) → `.dance-pillars` → `.dances-grid` (the section being replaced, id `library-preview-container` + `.library-preview-action` button).

```html
<section class="library-panel" aria-labelledby="explore-title">
    <div class="section-heading">
        <p class="section-kicker">Biblioteka tańców</p>
        <h3 id="explore-title">Od klasycznych korzeni po współczesne interpretacje</h3>
    </div>
    <div class="featured-dances" aria-labelledby="featured-dances-title">
        <h3 id="featured-dances-title" class="sr-only">Wyróżnione tańce AfroPasso</h3>
        <div id="featured-dances-container" class="featured-grid"></div>
    </div>
</section>

<section class="dance-pillars" aria-labelledby="pillars-title">
    ... (unchanged, not part of this plan) ...
</section>

<!-- Dance Cards Grid -->
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

`app.js` renders `#library-preview-container` via `renderLibraryPreview()` (6 dance cards, shared `danceCardHTML()` template), called from `loadData()` (initial load) and `handleRoute()`'s `'home'` case (every home navigation).

`hero-motion.js`'s `setupReveals()` has a reveal group targeting `#home-view .dances-grid` (heading + preview cards + button) that must be replaced, not left dangling.

**Important — `.dances-grid` and `.cards-grid` classes stay in `styles.css`.** They are also used by the real `#/dances` library page (`index.html` line ~224, inside `#dances-view`). Only the *home page's use* of the section is removed.

---

## Task 1: Remove the duplicate preview section, relocate the CTA button

**Files:**
- Modify: `index.html` (home view, `.library-panel` and the old `.dances-grid` preview section)

- [ ] **Step 1: Move the "Zobacz wszystkie tańce" button into `.library-panel`**

In `index.html`, find:

```html
                <div class="featured-dances" aria-labelledby="featured-dances-title">
                    <h3 id="featured-dances-title" class="sr-only">Wyróżnione tańce AfroPasso</h3>
                    <div id="featured-dances-container" class="featured-grid">
                        <!-- Featured dance tiles will be populated by JavaScript -->
                    </div>
                </div>
            </section>
```

Replace with (adds the button + its wrapper right after the grid, still inside `.library-panel`):

```html
                <div class="featured-dances" aria-labelledby="featured-dances-title">
                    <h3 id="featured-dances-title" class="sr-only">Wyróżnione tańce AfroPasso</h3>
                    <div id="featured-dances-container" class="featured-grid">
                        <!-- Featured dance tiles will be populated by JavaScript -->
                    </div>
                </div>
                <div class="library-preview-action">
                    <a class="btn-primary" href="#/dances">Zobacz wszystkie tańce</a>
                </div>
            </section>
```

- [ ] **Step 2: Delete the old preview section**

Delete this entire block (immediately after the `.dance-pillars` section, before the closing `</div>` of `#home-view`):

```html
            <!-- Dance Cards Grid -->
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

Leave the `</div>` that closes `#home-view` in place — Task 3 will insert the new section where this one was.

- [ ] **Step 3: Sanity check in the browser**

Run: `python3 -m http.server 8123` (skip if already running: `lsof -i :8123 -sTCP:LISTEN -t`).

```python
# tmp_check1.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    assert pg.evaluate("!!document.getElementById('library-preview-container')") == False, "old preview container still present"
    btn = pg.locator(".library-panel .library-preview-action a")
    assert btn.count() == 1, "relocated button missing"
    assert btn.inner_text() == "Zobacz wszystkie tańce"
    assert errs == [], errs
    b.close()
print("TASK1 OK")
```

Run in the scratchpad directory (never commit this file): `python3 tmp_check1.py` → expected `TASK1 OK`. (There will be a broken/dangling section further down until Task 3 — that is expected at this point; Task 3 fixes it.)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "refactor: relocate library CTA button under featured-tiles grid"
```

---

## Task 2: Remove `renderLibraryPreview` and its references

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Remove the `previewContainer` element reference**

In `app.js`, in the `elements` object's `home` block, delete the line:

```javascript
        previewContainer: null
```

(It is the last property before the closing `},` of the `home` block — remove the trailing comma from the line above it, `noResults: null`, so it becomes `noResults: null` with no trailing comma.)

- [ ] **Step 2: Remove the `previewContainer` assignment in `initializeElements()`**

Delete this line from `initializeElements()`:

```javascript
    elements.home.previewContainer = document.getElementById('library-preview-container');
```

- [ ] **Step 3: Remove the call in `loadData()`**

In `loadData()`, find:

```javascript
        renderFeaturedDances();
        renderLibraryPreview();
```

Replace with:

```javascript
        renderFeaturedDances();
```

- [ ] **Step 4: Remove the call in `handleRoute()`**

In `handleRoute()`'s `switch (currentRoute)`, find:

```javascript
        case 'home':
            renderLibraryPreview();
            break;
```

Replace with (matching the existing "nothing to render" comment style already used by the `'etykieta'`/`'compare'`/`'glossary'` cases right below it):

```javascript
        case 'home':
            // Featured tiles and the guide panel are static/rendered once in loadData()
            break;
```

- [ ] **Step 5: Delete the `renderLibraryPreview` function**

Delete the entire function:

```javascript
function renderLibraryPreview() {
    if (!dancesData || !elements.home.previewContainer) return;
    elements.home.previewContainer.innerHTML = dancesData
        .slice(0, 6)
        .map((dance, index) => danceCardHTML(dance, index))
        .join('');
}

```

(Keep `renderDanceCards()` and `danceCardHTML()` — both are still used by the real `#/dances` page.)

- [ ] **Step 6: Syntax check**

Run: `node --check app.js` → expected: exit 0, no output.

- [ ] **Step 7: Verify no dangling references**

Run: `grep -n "renderLibraryPreview\|previewContainer\|library-preview-container" app.js index.html` → expected: no output (nothing found). If `index.html` still shows a match, Task 1 wasn't fully applied — go back and fix it before continuing.

- [ ] **Step 8: Commit**

```bash
git add app.js
git commit -m "refactor: remove renderLibraryPreview (duplicate of the Wszystkie tańce page)"
```

---

## Task 3: Add the discovery guide section markup

**Files:**
- Modify: `index.html` (insert new section where the old preview section was, in the home view)

- [ ] **Step 1: Insert the new section**

In `index.html`, insert this section in the home view, in the exact spot the old `.dances-grid` preview section occupied (after `.dance-pillars`, before the closing `</div>` of `#home-view`):

```html
            <section class="guide-panel" aria-labelledby="guide-title">
                <div class="section-heading">
                    <p class="section-kicker">Odkryj AfroPasso</p>
                    <h3 id="guide-title">Co jeszcze znajdziesz na stronie</h3>
                </div>
                <div class="guide-grid" aria-label="Pozostałe sekcje AfroPasso">
                    <a class="guide-tile guide-large guide-tile--events" href="#/events">
                        <span class="guide-tile-media" aria-hidden="true"></span>
                        <div class="guide-tile-content">
                            <h4>Społeczność</h4>
                            <p>Potańcówki, warsztaty i festiwale w Polsce — zawsze aktualne.</p>
                            <span>Zobacz wydarzenia <span class="tile-arrow" aria-hidden="true">&rarr;</span></span>
                        </div>
                    </a>
                    <a class="guide-tile guide-tile--etykieta" href="#/etykieta">
                        <span class="guide-tile-media" aria-hidden="true"></span>
                        <div class="guide-tile-content">
                            <h4>Etykieta</h4>
                            <p>Zasady, gesty i kultura parkietu — jak tańczyć z szacunkiem.</p>
                            <span>Poznaj zasady <span class="tile-arrow" aria-hidden="true">&rarr;</span></span>
                        </div>
                    </a>
                    <a class="guide-tile guide-tile--timeline" href="#/timeline">
                        <span class="guide-tile-media" aria-hidden="true"></span>
                        <div class="guide-tile-content">
                            <h4>Korzenie</h4>
                            <p>Nić rodowodu: jak tańce wędrowały przez kraje i epoki.</p>
                            <span>Zobacz korzenie <span class="tile-arrow" aria-hidden="true">&rarr;</span></span>
                        </div>
                    </a>
                    <a class="guide-tile guide-tile--compare" href="#/compare">
                        <span class="guide-tile-media" aria-hidden="true"></span>
                        <div class="guide-tile-content">
                            <h4>Porównaj</h4>
                            <p>Zestaw dwa style obok siebie i zobacz, czym naprawdę się różnią.</p>
                            <span>Porównaj tańce <span class="tile-arrow" aria-hidden="true">&rarr;</span></span>
                        </div>
                    </a>
                    <a class="guide-tile guide-tile--glossary" href="#/glossary">
                        <span class="guide-tile-media" aria-hidden="true"></span>
                        <div class="guide-tile-content">
                            <h4>Glosariusz</h4>
                            <p>Nie znasz terminu? Sprawdź pełne wyjaśnienie.</p>
                            <span>Otwórz słowniczek <span class="tile-arrow" aria-hidden="true">&rarr;</span></span>
                        </div>
                    </a>
                </div>
            </section>
```

Note this reuses the `.tile-arrow` real-element pattern (not `content: "→"`) already fixed on featured-tiles earlier this session — deliberate, do not change to a pseudo-element.

- [ ] **Step 2: Syntax sanity check**

Run: `python3 -c "import re,sys; s=open('index.html').read(); assert s.count('<section')==s.count('</section>'), 'mismatched section tags'"` → expected: no output (no assertion error).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add discovery guide section markup (5 tiles linking to Społeczność/Etykieta/Korzenie/Porównaj/Glosariusz)"
```

---

## Task 4: Style the guide tiles

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Register `.guide-panel` with the shared section base rule**

Find (around line 299):

```css
.library-panel,
.dances-grid,
.dance-pillars,
.events-section,
.schools-section,
.timeline-section,
.compare-section,
.glossary-section {
```

Replace with:

```css
.library-panel,
.dances-grid,
.dance-pillars,
.guide-panel,
.events-section,
.schools-section,
.timeline-section,
.compare-section,
.glossary-section {
```

- [ ] **Step 2: Add the guide grid layout and tile styles**

Append this block right after the `.tile-arrow` rules (after the block ending `.featured-tile:hover .tile-arrow, .featured-tile:focus .tile-arrow { ... }`, before the `/* ===== Featured tiles motion support ... ===== */` comment):

```css
/* ===== Discovery guide section (static, lighter motion than featured-tiles) ===== */

.guide-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr 0.9fr;
    grid-auto-rows: 220px;
    gap: var(--space-3);
    padding-top: var(--space-5);
}

.guide-large {
    grid-row: span 2;
}

.guide-tile {
    position: relative;
    display: flex;
    align-items: end;
    min-height: 100%;
    padding: clamp(1.2rem, 2.2vw, 1.9rem);
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: pointer;
    background: oklch(14% 0.04 48);
    color: var(--paper);
    text-decoration: none;
    transition: transform 180ms var(--ease-micro), filter 180ms var(--ease-micro);
}

.guide-tile:hover,
.guide-tile:focus {
    filter: saturate(1.08) contrast(1.03);
    outline: none;
    transform: translateY(-2px);
}

.guide-tile-media {
    position: absolute;
    inset: 0;
    z-index: 0;
    background:
        linear-gradient(90deg, oklch(14% 0.04 48 / 0.84), oklch(14% 0.04 48 / 0.46), transparent 78%),
        url("assets/hero-dance-workshop.png");
    background-position: 50% 50%;
    background-size: cover;
}

.guide-tile--events .guide-tile-media { background-image: linear-gradient(90deg, oklch(14% 0.04 48 / 0.84), oklch(14% 0.04 48 / 0.46), transparent 78%), url("assets/guide/spolecznosc.png"); }
.guide-tile--etykieta .guide-tile-media { background-image: linear-gradient(90deg, oklch(14% 0.04 48 / 0.84), oklch(14% 0.04 48 / 0.46), transparent 78%), url("assets/guide/etykieta.png"); }
.guide-tile--timeline .guide-tile-media { background-image: linear-gradient(90deg, oklch(14% 0.04 48 / 0.84), oklch(14% 0.04 48 / 0.46), transparent 78%), url("assets/guide/korzenie.png"); }
.guide-tile--compare .guide-tile-media { background-image: linear-gradient(90deg, oklch(14% 0.04 48 / 0.84), oklch(14% 0.04 48 / 0.46), transparent 78%), url("assets/guide/porownaj.png"); }
.guide-tile--glossary .guide-tile-media { background-image: linear-gradient(90deg, oklch(14% 0.04 48 / 0.84), oklch(14% 0.04 48 / 0.46), transparent 78%), url("assets/guide/glosariusz.png"); }

.guide-tile-content {
    max-width: 24rem;
    position: relative;
    z-index: 1;
}

.guide-tile-content h4 {
    margin-top: 0;
    color: var(--paper);
    font-size: clamp(1.35rem, 2vw, 1.9rem);
    font-weight: 500;
    letter-spacing: -0.03em;
}

.guide-large .guide-tile-content h4 {
    font-size: clamp(1.65rem, 3vw, 2.4rem);
}

.guide-tile-content p {
    max-width: 26ch;
    margin-top: var(--space-3);
    color: oklch(95% 0.02 79);
    font-size: 0.94rem;
    line-height: 1.56;
}

.guide-tile-content > span {
    display: inline-flex;
    align-items: baseline;
    gap: 0.4rem;
    margin-top: var(--space-4);
    color: oklch(82% 0.14 76);
    font-weight: 760;
    font-size: 0.95rem;
}

.guide-tile:hover .tile-arrow,
.guide-tile:focus .tile-arrow {
    transform: translateX(0.28rem);
}
```

`.tile-arrow` itself (the shared base rule with `transition: transform ...`) is already defined from the featured-tiles fix earlier this session — this step only adds the guide-tile hover trigger for it, exactly mirroring the existing `.featured-tile:hover .tile-arrow` rule.

This deliberately does **not** add a `.guide-tile::after` sheen, `.guide-grid.featured-motion-on` hook, or any `perspective`/`transform-style: preserve-3d` — those belong only to the JS-driven featured-tiles system (`featured-motion.js`), which this section never loads. The `.guide-tile:hover` rule is the *entire* hover treatment (CSS-only, no JS), matching the plan's "lighter motion" decision.

`.guide-tile-media` uses a plain `background-image` (not the `var(--tile-image, fallback)` custom-property indirection `.featured-tile-media` uses) because these 5 tiles are static markup with one fixed image each, not data-driven — a per-tile CSS class is simpler here. Until the 5 files under `assets/guide/` exist, each `background-image` 404s silently and the tile shows its solid dark `background` color with the text still fully readable (same graceful-degradation behavior as any missing CSS background-image — no broken-image icon, since this is CSS `background-image`, not an `<img>` tag).

- [ ] **Step 3: Add the responsive breakpoint**

Find (inside the `@media (max-width: 720px)` block, around line 2589):

```css
    .featured-large {
        grid-row: span 1;
    }
```

Replace with:

```css
    .featured-large {
        grid-row: span 1;
    }

    .guide-grid {
        grid-template-columns: 1fr;
        grid-auto-rows: 220px;
    }

    .guide-large {
        grid-row: span 1;
    }
```

- [ ] **Step 4: Visual check**

```python
# tmp_check4.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    tiles = pg.locator(".guide-tile")
    assert tiles.count() == 5, f"expected 5 guide tiles, got {tiles.count()}"
    pg.locator(".guide-panel").scroll_into_view_if_needed()
    pg.wait_for_timeout(500)
    pg.locator(".guide-panel").screenshot(path="tmp_guide_desktop.png")
    m = b.new_page(viewport={"width": 390, "height": 844})
    m.goto("http://localhost:8123/#/", wait_until="networkidle")
    m.wait_for_timeout(1500)
    m.locator(".guide-panel").scroll_into_view_if_needed()
    m.wait_for_timeout(500)
    m.locator(".guide-panel").screenshot(path="tmp_guide_mobile.png")
    assert errs == [], errs
    b.close()
print("TASK4 OK")
```

Run: `python3 tmp_check4.py` → expected `TASK4 OK`. Open `tmp_guide_desktop.png`: Społeczność is the large tile (spans 2 rows) in the left column, 4 equal tiles fill the rest; every tile shows readable text over a dark tile (photo missing is fine at this point — Task 6 covers the fallback). Open `tmp_guide_mobile.png`: single column, all 5 tiles stacked, large tile is the same height as the others (not double).

- [ ] **Step 5: Commit**

```bash
git add styles.css
git commit -m "feat: style discovery guide tiles (lighter, JS-independent variant of featured-tile)"
```

---

## Task 5: Wire up the entrance reveal

**Files:**
- Modify: `hero-motion.js` (`setupReveals()`, the `groups` array)

- [ ] **Step 1: Replace the stale `.dances-grid` reveal group with `.guide-panel`**

In `hero-motion.js`, `setupReveals()`, find:

```javascript
            {
                root: document.querySelector('#home-view .dances-grid'),
                targets: function (el) {
                    return [el.querySelector('.library-heading')]
                        .concat(Array.prototype.slice.call(el.querySelectorAll('#library-preview-container > *')))
                        .concat([el.querySelector('.library-preview-action')]);
                }
            }
```

Replace with:

```javascript
            {
                root: document.querySelector('#home-view .guide-panel'),
                targets: function (el) {
                    return [el.querySelector('.section-heading')]
                        .concat(Array.prototype.slice.call(el.querySelectorAll('.guide-grid > *')));
                }
            }
```

(This is the last entry in the `groups` array — keep the array's closing `];` unchanged.)

- [ ] **Step 2: Syntax check**

Run: `node --check hero-motion.js` → expected: exit 0, no output.

- [ ] **Step 3: Verify the reveal fires**

```python
# tmp_check5.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    # before scrolling into view, tiles should be part of the reveal's initial "from" state
    pg.locator(".guide-panel").scroll_into_view_if_needed()
    pg.wait_for_timeout(1200)  # reveal duration 0.9s + settle
    opacity = pg.evaluate("getComputedStyle(document.querySelector('.guide-tile h4')).opacity")
    assert opacity == "1", f"guide tile heading did not reveal, opacity={opacity}"
    assert errs == [], errs
    b.close()
print("TASK5 OK")
```

Run: `python3 tmp_check5.py` → expected `TASK5 OK`.

- [ ] **Step 4: Reduced-motion check**

```python
# tmp_check5r.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.emulate_media(reduced_motion="reduce")
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    opacity = pg.evaluate("getComputedStyle(document.querySelector('.guide-tile h4')).opacity")
    assert opacity == "1", f"content not visible under reduced motion, opacity={opacity}"
    b.close()
print("TASK5R OK")
```

Run: `python3 tmp_check5r.py` → expected `TASK5R OK`.

- [ ] **Step 5: Commit**

```bash
git add hero-motion.js
git commit -m "feat: entrance reveal for discovery guide section (reuses generic reveal system)"
```

---

## Task 6: Document in AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update the home page description**

In `AGENTS.md`, find this sentence inside the `app.js` architecture bullet:

```
Home (`#/`) shows a static 8-tile featured set plus a static 6-card library preview (`renderLibraryPreview`); search and filtering live on the Wszystkie tańce page (`#/dances`), which renders the full index via `renderDanceCards`. Both preview and library reuse the shared `danceCardHTML()` template.
```

Replace with:

```
Home (`#/`) shows a static 8-tile featured set (`renderFeaturedDances`) with a "Zobacz wszystkie tańce" button below it, then a static discovery-guide section (`.guide-panel`, hardcoded in index.html — 5 tiles linking to Społeczność/Etykieta/Korzenie/Porównaj/Glosariusz, no JS render function). Search and filtering live on the Wszystkie tańce page (`#/dances`), which renders the full index via `renderDanceCards` and the shared `danceCardHTML()` template.
```

- [ ] **Step 2: Add asset documentation**

In the `assets/` bullet, find:

```
- `assets/` — brand marks, hero, pillar icons, one image per dance in `assets/dances/`, and curator-downloaded event images in `assets/events/`.
```

Replace with:

```
- `assets/` — brand marks, hero, pillar icons, one image per dance in `assets/dances/`, curator-downloaded event images in `assets/events/`, and discovery-guide tile photos in `assets/guide/` (`spolecznosc.png`, `etykieta.png`, `korzenie.png`, `porownaj.png`, `glosariusz.png` — see `docs/superpowers/specs/2026-07-13-homepage-discovery-guide-design.md` section 7 for the generation prompts; until these exist the tiles fall back to their solid dark background color).
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document discovery guide section and assets/guide/ in AGENTS.md"
```

---

## Task 7: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Syntax sweep**

Run: `node --check app.js && node --check hero-motion.js && node --check featured-motion.js && node --check lineage-motion.js && echo ALL OK` → expected: `ALL OK`.

- [ ] **Step 2: Full-page click-through + console check**

```python
# tmp_check7.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    routes = ["#/", "#/dances", "#/events", "#/etykieta", "#/timeline", "#/compare", "#/glossary"]
    for route in routes:
        pg = b.new_page(viewport={"width": 1440, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(f"http://localhost:8123/{route}", wait_until="networkidle")
        pg.wait_for_timeout(1500)
        assert errs == [], f"{route}: {errs}"
        pg.close()
        print(f"{route}: OK")

    # click-through: each guide tile navigates to its destination
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.locator(".guide-panel").scroll_into_view_if_needed()
    pg.wait_for_timeout(500)
    expected = ["#/events", "#/etykieta", "#/timeline", "#/compare", "#/glossary"]
    for i, hash_ in enumerate(expected):
        pg.goto("http://localhost:8123/#/", wait_until="networkidle")
        pg.wait_for_timeout(1500)
        pg.locator(".guide-panel").scroll_into_view_if_needed()
        pg.wait_for_timeout(500)
        pg.locator(".guide-tile").nth(i).click()
        pg.wait_for_timeout(500)
        actual = pg.evaluate("location.hash")
        assert actual == hash_, f"tile {i}: expected {hash_}, got {actual}"
        print(f"tile {i} -> {actual}: OK")

    # the relocated "Zobacz wszystkie tańce" button still works
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.locator(".library-panel .library-preview-action a").click()
    pg.wait_for_timeout(500)
    assert pg.evaluate("location.hash") == "#/dances"
    print("library CTA button: OK")

    b.close()
print("TASK7 OK")
```

Run: `python3 tmp_check7.py` → expected every line ending `OK`, final line `TASK7 OK`.

- [ ] **Step 3: Confirm no dangling references anywhere in the repo**

Run: `grep -rn "renderLibraryPreview\|library-preview-container\|library-preview-title" --include="*.js" --include="*.html" .` → expected: no output.

- [ ] **Step 4: `git status` cleanliness check**

Run: `git status -sb` → expected: no `tmp_check*.py` or `tmp_guide_*.png` files staged or tracked (they must never be committed — delete them from the scratch location if they ended up in the repo root).

---

## Acceptance checklist (run at the very end)

- [ ] Home page shows: featured-tiles grid → "Zobacz wszystkie tańce" button → Perspektywa AfroPasso pillars → discovery guide section (Społeczność large + 4 smaller tiles). No duplicate dance-card preview anywhere on the home page.
- [ ] All 5 guide tiles navigate to their correct destination on click.
- [ ] Guide section entrance-reveals on scroll (fades/rises in), consistent with the rest of the page's reveal style.
- [ ] Guide tile hover: subtle lift + saturation bump, no tilt/parallax/sheen (that's featured-tiles only).
- [ ] `prefers-reduced-motion`: guide section content fully visible immediately, no animation.
- [ ] Missing `assets/guide/*.png` files degrade gracefully (solid dark tile, readable text, no broken-image icon).
- [ ] No console errors on any route.
- [ ] `grep` confirms zero references to `renderLibraryPreview` / `library-preview-container` anywhere in the repo.
- [ ] Mobile (390px): guide tiles stack in a single column, large tile is not double-height.
