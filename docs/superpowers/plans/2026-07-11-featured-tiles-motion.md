# Featured Tiles Motion ("Wejście na parkiet") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic rise-and-fade animation of the 8 featured dance tiles on the AfroPasso home page ("Od klasycznych korzeni po współczesne interpretacje") with an award-grade motion language: choreographed clip-path entrance on a syncopated rhythm, pointer-driven 3D tilt with inner-image parallax and light sheen, neighbor-aware focus dimming, and subtle scroll drift.

**Architecture:** A new standalone `featured-motion.js` (same progressive-enhancement pattern as the existing `hero-motion.js` / `lineage-motion.js`): it exits early without GSAP, without ScrollTrigger, or under `prefers-reduced-motion`, leaving the page fully usable. The tile markup gains an inner `.featured-tile-media` layer (so the photo can transform independently of the tile frame), rendered by `app.js`. The generic reveal that `hero-motion.js` currently applies to this section is narrowed so the two systems never double-animate.

**Tech Stack:** Vanilla JS (no build step, no framework), GSAP 3.12.7 core + ScrollTrigger from jsDelivr CDN (already loaded in `index.html` with SRI hashes), CSS custom properties, Playwright (Python) for browser verification.

---

## Project context (read first — zero-context primer)

- **AfroPasso is a static site.** No `package.json` at root, no bundler, no framework. Plain `index.html` + `app.js` + `styles.css` served from the repo root (GitHub Pages). Never introduce a build step. Relative paths only.
- **Motion layers are separate deferred scripts.** `index.html` already loads (in this order, all `defer`): GSAP core (CDN+SRI), ScrollTrigger (CDN+SRI), `hero-motion.js`, `lineage-motion.js`. You will add `featured-motion.js` after them.
- **Progressive enhancement is a hard rule.** Every motion file starts with:
  1. exit if `matchMedia('(prefers-reduced-motion: reduce)').matches`,
  2. exit if `window.gsap` (and, where needed, `window.ScrollTrigger`) is undefined.
  The static page must remain complete and attractive in both cases.
- **Design constraints (from `DESIGN.md` / `AGENTS.md`):** warm cultural-documentary tone; NO neon/nightclub styling, NO glassmorphism, NO gradient text. Palette tokens live as CSS custom properties in `styles.css` `:root` (`--paper`, `--clay`, `--ochre`, `--ink`, `--sand-line`…). Easing tokens: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-micro: cubic-bezier(0.25, 1, 0.5, 1)`.
- **Local dev server:** `python3 -m http.server 8123` from the repo root (port 8123 on purpose — 3000/8000 are taken by another project). `fetch()` requires HTTP, so always test through the server, never `file://`.
- **Verification tooling:** Python Playwright is installed (`python3` + `playwright` package, Chromium present). Launch Chromium with `args=["--enable-unsafe-swiftshader"]`. Write throwaway scripts to the session scratchpad or `tmp/` (never commit them).
- **Verify commands before claiming done:** `node --check app.js`, `node --check featured-motion.js`, then the Playwright checks given per task.
- **Commits:** small, per task, message style `feat:`/`refactor:`/`docs:`. Do not commit `tmp/`, `.DS_Store`, loose research notes.

### Current state of the section (baseline you are changing)

`index.html` (home view) contains:

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
```

`app.js` → `renderFeaturedDances()` (near line 317) fills the grid with 8 tiles (first one `featured-large`, spans 2 rows). Current tile template (BEFORE your change):

```html
<article class="featured-tile featured-large" style="--tile-position: 58% 50%; --tile-image: url('assets/hero-dance-workshop.png')"
         onclick="navigateTo('/dance/kizomba')" role="button" tabindex="0"
         onkeydown="if(event.key==='Enter'||event.key===' ') navigateTo('/dance/kizomba')">
    <div class="featured-tile-content">
        <h4>Kizomba</h4>
        <p class="featured-country">Angola, Luanda</p>
        <p class="featured-character">współczesny · social</p>
        <p class="featured-description">Bliskość, dialog i historia semby spotykająca zouk.</p>
        <span>Przejdź do karty</span>
    </div>
</article>
```

The photo is currently the tile's own CSS `background-image` (see `styles.css` `.featured-tile`, near line 665) — that is why an inner media layer must be introduced: you cannot parallax a background of the same element that clips it without paint-heavy `background-position` animation.

`hero-motion.js` → `setupReveals()` currently registers the whole `.library-panel` (heading + every `.featured-grid` child) for a generic y+fade reveal. That is the "standard, unattractive" animation being replaced for the tiles; the heading keeps it.

### Motion concept (the design intent — do not water it down)

**Name: "Wejście na parkiet"** (stepping onto the dance floor). Four layers:

1. **Entrance (once, scroll-triggered):** each tile is revealed by an animated `clip-path: inset(...)` wipe whose direction depends on the tile's position (dancers entering from different wings), while the inner photo settles from `scale(1.18)` to its resting `scale(1.06)`. Tile stagger is **syncopated** — offsets follow a rhythmic beat array, not a uniform interval — so the grid enters like a musical phrase, not a queue. Tile text rises with a micro-stagger and un-blurs.
2. **Pointer choreography (fine pointers only):** 3D tilt of the tile toward the cursor (`rotationX/rotationY`, perspective 900px), the inner photo counter-translates (depth parallax), and a warm light sheen follows the cursor (CSS radial gradient positioned by `--mx`/`--my` custom properties). Everything through `gsap.quickTo` — no tween allocation per mousemove.
3. **Neighbor awareness:** hovering one tile softly focuses it (scale 1.015) and recedes the siblings (scale 0.985, brightness 0.92) — like stage light on a couple.
4. **Scroll drift:** after entrance, columns drift at ±3% differential speed (scrubbed) so the grid has depth while passing by.

Hard limits: animate only `transform`, `opacity`, `clip-path`, `filter` (short-lived); target 60fps; no motion on touch/coarse pointers beyond the entrance; `prefers-reduced-motion` gets today's static presentation including the existing CSS hover.

---

## File structure

- **Create:** `featured-motion.js` — all four motion layers, lifecycle (lazy init after `renderFeaturedDances()` populates the grid via MutationObserver; home-route aware), reduced-motion teardown.
- **Modify:** `app.js` — `renderFeaturedDances()` tile template: add `.featured-tile-media` inner layer.
- **Modify:** `styles.css` — media-layer styles (photo moves off the tile background), sheen pseudo-element, no-JS hover guard, `.featured-grid` perspective helper.
- **Modify:** `hero-motion.js` — `setupReveals()` library-panel group targets only the heading.
- **Modify:** `index.html` — one `<script defer src="featured-motion.js">` tag.
- **Modify:** `AGENTS.md` — one architecture bullet documenting the new file.

---

### Task 1: Move the tile photo into an inner media layer

The tile frame keeps `overflow: hidden` + radius; the new `.featured-tile-media` carries the photo + scrim and can be transformed independently. Visual result of this task must be **pixel-identical** to today (resting scale compensates nothing yet — it is added by motion later, so keep scale 1 here).

**Files:**
- Modify: `app.js` (renderFeaturedDances, ~line 325)
- Modify: `styles.css` (`.featured-tile` block, ~line 665)

- [ ] **Step 1: Change the tile template in `app.js`**

In `renderFeaturedDances()`, replace the `<article ...>` template with (only the media span is new; keep everything else byte-identical):

```javascript
    elements.home.featuredContainer.innerHTML = featured.map((dance, index) => `
        <article class="featured-tile ${index === 0 ? 'featured-large' : ''}" style="--tile-position: ${getFeaturedPosition(dance.slug)}; --tile-image: url('${escapeAttribute(getFeaturedImage(dance.slug))}')" onclick="navigateTo('/dance/${escapeAttribute(dance.slug)}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ') navigateTo('/dance/${escapeAttribute(dance.slug)}')">
            <span class="featured-tile-media" aria-hidden="true"></span>
            <div class="featured-tile-content">
                <h4>${escapeHTML(dance.names.pl)}</h4>
                <p class="featured-country">${escapeHTML(formatOrigin(dance))}</p>
                <p class="featured-character">${escapeHTML(formatClassification(dance))}</p>
                <p class="featured-description">${escapeHTML(getFeaturedDescription(dance))}</p>
                <span>Przejdź do karty</span>
            </div>
        </article>
    `).join('');
```

- [ ] **Step 2: Move the background from `.featured-tile` to `.featured-tile-media` in `styles.css`**

Replace the current `.featured-tile` rule (near line 665):

```css
.featured-tile {
    position: relative;
    display: flex;
    align-items: end;
    min-height: 100%;
    padding: clamp(1.35rem, 2.5vw, 2.25rem);
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: pointer;
    background: oklch(14% 0.04 48);
    color: var(--paper);
    transition: transform 180ms var(--ease-micro), filter 180ms var(--ease-micro);
}

.featured-tile-media {
    position: absolute;
    inset: 0;
    z-index: 0;
    background:
        linear-gradient(90deg, oklch(14% 0.04 48 / 0.84), oklch(14% 0.04 48 / 0.46), transparent 78%),
        var(--tile-image, url("assets/hero-dance-workshop.png"));
    background-position: var(--tile-position, 50% 50%);
    background-size: cover;
}
```

(The old rule's `background: linear-gradient(...), var(--tile-image ...)` lines move into the media layer verbatim; the tile keeps a dark solid as loading fallback.)

- [ ] **Step 3: Syntax check + visual verification**

Run: `node --check app.js` → expected: no output (exit 0).

Start server if not running: `python3 -m http.server 8123 &`. Playwright check (throwaway script, e.g. `tmp/check1.py`):

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":1440,"height":900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    assert pg.evaluate("document.querySelectorAll('.featured-tile-media').length") == 8, "media layers missing"
    pg.locator(".featured-grid").screenshot(path="tmp/t1-grid.png")
    assert errs == [], errs
    b.close()
print("TASK1 OK")
```

Run: `python3 tmp/check1.py` → expected: `TASK1 OK`. Open `tmp/t1-grid.png` and confirm the grid looks the same as before the change (photos, scrims, text all present).

- [ ] **Step 4: Commit**

```bash
git add app.js styles.css
git commit -m "refactor: featured tile photo moved to inner media layer for independent motion"
```

---

### Task 2: Hand the section over — narrow hero-motion.js reveals to the heading

**Files:**
- Modify: `hero-motion.js` (`setupReveals()`, the `groups` array)

- [ ] **Step 1: Narrow the library-panel group**

In `hero-motion.js`, `setupReveals()`, find:

```javascript
            {
                root: document.querySelector('#home-view .library-panel'),
                targets: function (el) {
                    return [el.querySelector('.section-heading')]
                        .concat(Array.prototype.slice.call(el.querySelectorAll('.featured-grid > *')));
                }
            },
```

Replace with:

```javascript
            {
                root: document.querySelector('#home-view .library-panel'),
                targets: function (el) {
                    return [el.querySelector('.section-heading')];
                }
            },
```

- [ ] **Step 2: Syntax check**

Run: `node --check hero-motion.js` → expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add hero-motion.js
git commit -m "refactor: featured grid excluded from generic reveals (featured-motion takes over)"
```

---

### Task 3: CSS groundwork for the motion language

**Files:**
- Modify: `styles.css` (append after the `.featured-tile span::after` hover rules, ~line 786)

- [ ] **Step 1: Add motion-support styles**

Append this block to the featured-tile section of `styles.css`:

```css
/* ===== Featured tiles motion support (featured-motion.js) ===== */
/* The JS adds .featured-motion-on to the grid when it takes over. */
.featured-grid.featured-motion-on {
    perspective: 900px;
}

.featured-grid.featured-motion-on .featured-tile {
    transform-style: preserve-3d;
    transition: filter 180ms var(--ease-micro);
}

/* Warm light sheen that follows the cursor (positioned via --mx/--my). */
.featured-tile::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0;
    background: radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), oklch(97% 0.021 79 / 0.16), transparent 65%);
    transition: opacity 260ms var(--ease-micro);
}

.featured-grid.featured-motion-on .featured-tile:hover::after {
    opacity: 1;
}

/* Text must stay above the sheen layer. */
.featured-grid.featured-motion-on .featured-tile-content {
    z-index: 2;
}

/* The old lift stays ONLY when the motion layer is not active (no JS / no GSAP). */
.featured-grid.featured-motion-on .featured-tile:hover,
.featured-grid.featured-motion-on .featured-tile:focus {
    transform: none;
}

@media (prefers-reduced-motion: reduce) {
    .featured-tile::after {
        content: none;
    }
}
```

Note: the existing `.featured-tile:hover` rule (translateY(-2px) + filter) stays untouched — it is the no-JS fallback; the `.featured-motion-on` override neutralizes only the transform when JS choreography owns transforms.

- [ ] **Step 2: Visual sanity check**

Reload `http://localhost:8123/#/` — before the JS exists, nothing may look different (the `::after` sheen has `opacity: 0` and `.featured-motion-on` is never set). Confirm hover still lifts tiles.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: css groundwork for featured tiles motion (sheen, perspective, js-off guards)"
```

---

### Task 4: featured-motion.js — lifecycle + syncopated entrance

**Files:**
- Create: `featured-motion.js`
- Modify: `index.html` (script tag)

- [ ] **Step 1: Create `featured-motion.js` with lifecycle and the entrance choreography**

```javascript
/*
 * AfroPasso featured tiles motion: "Wejście na parkiet".
 * Syncopated clip-path entrance, pointer tilt with photo parallax and light
 * sheen, neighbor-aware focus, subtle scroll drift. Progressive enhancement:
 * without GSAP/ScrollTrigger or with prefers-reduced-motion the grid keeps
 * its static presentation and CSS hover states.
 */
(function () {
    'use strict';

    var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMq.matches) return;
    if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    var grid = null;
    var initialized = false;
    var teardownFns = [];

    /* Kizomba-inspired beat offsets (seconds-ish, scaled below): the grid
       enters as a musical phrase, not a uniform queue. */
    var BEATS = [0, 0.12, 0.3, 0.38, 0.62, 0.7, 0.88, 0.96];

    /* Entrance wipe direction per tile index: dancers entering from wings. */
    var WIPES = [
        'inset(0 100% 0 0)',
        'inset(100% 0 0 0)',
        'inset(0 0 0 100%)',
        'inset(0 0 100% 0)',
        'inset(0 100% 0 0)',
        'inset(0 0 0 100%)',
        'inset(100% 0 0 0)',
        'inset(0 0 100% 0)'
    ];

    var MEDIA_REST_SCALE = 1.06; /* permanent overscan: parallax headroom */

    function initEntrance(tiles) {
        tiles.forEach(function (tile, index) {
            var media = tile.querySelector('.featured-tile-media');
            var content = tile.querySelectorAll('.featured-tile-content > *');
            gsap.set(tile, { clipPath: WIPES[index % WIPES.length] });
            if (media) gsap.set(media, { scale: 1.18 });
            gsap.set(content, { y: 18, opacity: 0, filter: 'blur(6px)' });
        });

        var st = ScrollTrigger.create({
            trigger: grid,
            start: 'top 78%',
            once: true,
            onEnter: function () {
                var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
                tiles.forEach(function (tile, index) {
                    var media = tile.querySelector('.featured-tile-media');
                    var content = tile.querySelectorAll('.featured-tile-content > *');
                    var at = BEATS[index % BEATS.length] * 0.9;
                    tl.to(tile, {
                        clipPath: 'inset(0% 0% 0% 0%)',
                        duration: 1.0,
                        ease: 'power3.inOut',
                        clearProps: 'clipPath'
                    }, at);
                    if (media) {
                        tl.to(media, { scale: MEDIA_REST_SCALE, duration: 1.6, ease: 'power2.out' }, at);
                    }
                    tl.to(content, {
                        y: 0,
                        opacity: 1,
                        filter: 'blur(0px)',
                        duration: 0.7,
                        stagger: 0.06,
                        clearProps: 'all'
                    }, at + 0.35);
                });
            }
        });
        teardownFns.push(function () { st.kill(); });
    }

    function init() {
        if (initialized) return;
        grid = document.getElementById('featured-dances-container');
        if (!grid) return;
        var tiles = Array.prototype.slice.call(grid.querySelectorAll('.featured-tile'));
        if (tiles.length === 0) return;
        initialized = true;

        grid.classList.add('featured-motion-on');
        initEntrance(tiles);
        initPointer(tiles);
        initDrift(tiles);
        ScrollTrigger.refresh();
    }

    /* Placeholders replaced in Tasks 5 and 6 — keep these empty functions so
       Task 4 runs standalone. */
    function initPointer(tiles) {}
    function initDrift(tiles) {}

    function teardown() {
        teardownFns.forEach(function (fn) { fn(); });
        teardownFns = [];
        if (grid) {
            grid.classList.remove('featured-motion-on');
            var animated = grid.querySelectorAll('.featured-tile, .featured-tile-media, .featured-tile-content > *');
            gsap.set(animated, { clearProps: 'all' });
        }
        initialized = false;
    }

    /* The grid is rendered by app.js after the data fetch: init lazily. */
    var container = document.getElementById('featured-dances-container');
    if (container) {
        new MutationObserver(function () { init(); }).observe(container, { childList: true });
    }
    init();

    var onReduceChange = function (e) {
        if (e.matches) teardown();
    };
    if (typeof reduceMq.addEventListener === 'function') {
        reduceMq.addEventListener('change', onReduceChange);
    } else if (typeof reduceMq.addListener === 'function') {
        reduceMq.addListener(onReduceChange);
    }
})();
```

- [ ] **Step 2: Add the script tag in `index.html`**

Find the script block at the end of `<body>` and add the last line:

```html
    <script defer src="hero-motion.js"></script>
    <script defer src="lineage-motion.js"></script>
    <script defer src="featured-motion.js"></script>
```

- [ ] **Step 3: Syntax check**

Run: `node --check featured-motion.js` → expected: exit 0.

- [ ] **Step 4: Verify entrance in the browser**

Playwright script `tmp/check4.py`:

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":1440,"height":900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    assert pg.evaluate("document.querySelector('.featured-grid').classList.contains('featured-motion-on')")
    pg.mouse.wheel(0, 700)   # scroll the grid into view -> entrance fires
    pg.wait_for_timeout(300)
    pg.screenshot(path="tmp/t4-entrance-mid.png")   # tiles mid-wipe
    pg.wait_for_timeout(2200)
    pg.screenshot(path="tmp/t4-entrance-done.png")  # all tiles fully revealed
    # every tile fully visible afterwards (clipPath cleared)
    clipped = pg.evaluate("""Array.from(document.querySelectorAll('.featured-tile'))
        .filter(t => t.style.clipPath && t.style.clipPath !== 'inset(0% 0% 0% 0%)').length""")
    assert clipped == 0, f"{clipped} tiles still clipped"
    assert errs == [], errs
    b.close()
print("TASK4 OK")
```

Run: `python3 tmp/check4.py` → expected `TASK4 OK`. Inspect `tmp/t4-entrance-mid.png`: tiles must be partially wiped from **different directions** at different progress (syncopation visible). Inspect `tmp/t4-entrance-done.png`: grid complete, text sharp.

- [ ] **Step 5: Reduced-motion check**

```python
# tmp/check4r.py
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":1440,"height":900})
    pg.emulate_media(reduced_motion="reduce")
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(2000)
    assert not pg.evaluate("document.querySelector('.featured-grid').classList.contains('featured-motion-on')")
    assert pg.evaluate("getComputedStyle(document.querySelector('.featured-tile-content h4')).opacity") == "1"
    b.close()
print("TASK4R OK")
```

Run: `python3 tmp/check4r.py` → expected `TASK4R OK`.

- [ ] **Step 6: Commit**

```bash
git add featured-motion.js index.html
git commit -m "feat: syncopated clip-path entrance for featured dance tiles"
```

---

### Task 5: Pointer choreography — tilt, photo parallax, sheen, neighbor focus

**Files:**
- Modify: `featured-motion.js` (replace the empty `initPointer` from Task 4)

- [ ] **Step 1: Replace the empty `initPointer(tiles) {}` with the full implementation**

```javascript
    function initPointer(tiles) {
        if (!window.matchMedia('(pointer: fine)').matches) return;

        tiles.forEach(function (tile) {
            var media = tile.querySelector('.featured-tile-media');
            var siblings = tiles.filter(function (other) { return other !== tile; });

            var toRotX = gsap.quickTo(tile, 'rotationX', { duration: 0.5, ease: 'power2.out' });
            var toRotY = gsap.quickTo(tile, 'rotationY', { duration: 0.5, ease: 'power2.out' });
            var toMedX = media ? gsap.quickTo(media, 'x', { duration: 0.6, ease: 'power2.out' }) : null;
            var toMedY = media ? gsap.quickTo(media, 'y', { duration: 0.6, ease: 'power2.out' }) : null;

            gsap.set(tile, { transformPerspective: 900 });

            var onMove = function (event) {
                var rect = tile.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                var px = (event.clientX - rect.left) / rect.width - 0.5;
                var py = (event.clientY - rect.top) / rect.height - 0.5;
                toRotX(py * -5);
                toRotY(px * 7);
                if (toMedX) toMedX(px * -12);
                if (toMedY) toMedY(py * -12);
                tile.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
                tile.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%');
            };

            var onEnter = function () {
                gsap.to(tile, { scale: 1.015, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
                gsap.to(siblings, { scale: 0.985, filter: 'brightness(0.92)', duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
            };

            var onLeave = function () {
                toRotX(0);
                toRotY(0);
                if (toMedX) toMedX(0);
                if (toMedY) toMedY(0);
                gsap.to(tiles, { scale: 1, filter: 'brightness(1)', duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
            };

            tile.addEventListener('pointermove', onMove, { passive: true });
            tile.addEventListener('pointerenter', onEnter);
            tile.addEventListener('pointerleave', onLeave);
            teardownFns.push(function () {
                tile.removeEventListener('pointermove', onMove);
                tile.removeEventListener('pointerenter', onEnter);
                tile.removeEventListener('pointerleave', onLeave);
            });
        });
    }
```

- [ ] **Step 2: Syntax check**

Run: `node --check featured-motion.js` → expected: exit 0.

- [ ] **Step 3: Verify tilt + neighbor dim in the browser**

Playwright script `tmp/check5.py`:

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":1440,"height":900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    pg.mouse.wheel(0, 700)
    pg.wait_for_timeout(2500)  # entrance settles
    box = pg.locator(".featured-tile").first.bounding_box()
    # hover near the tile's top-right corner -> expect rotation + sheen vars
    pg.mouse.move(box["x"] + box["width"] * 0.85, box["y"] + box["height"] * 0.2, steps=8)
    pg.wait_for_timeout(700)
    transform = pg.evaluate("document.querySelector('.featured-tile').style.transform")
    assert "rotate" in transform or "perspective" in transform, transform
    mx = pg.evaluate("document.querySelector('.featured-tile').style.getPropertyValue('--mx')")
    assert mx != "", "sheen position not set"
    # a sibling must be receded
    sib = pg.evaluate("document.querySelectorAll('.featured-tile')[1].style.transform")
    assert "0.985" in sib, sib
    pg.screenshot(path="tmp/t5-tilt.png")
    # leave -> everything returns to rest
    pg.mouse.move(box["x"] - 80, box["y"] - 80, steps=6)
    pg.wait_for_timeout(900)
    rest = pg.evaluate("document.querySelectorAll('.featured-tile')[1].style.transform")
    assert "0.985" not in rest, rest
    assert errs == [], errs
    b.close()
print("TASK5 OK")
```

Run: `python3 tmp/check5.py` → expected `TASK5 OK`. Inspect `tmp/t5-tilt.png`: hovered tile visibly tilted toward cursor with a warm sheen; other tiles slightly darker/smaller.

- [ ] **Step 4: Commit**

```bash
git add featured-motion.js
git commit -m "feat: pointer tilt, photo parallax, sheen and neighbor focus on featured tiles"
```

---

### Task 6: Scroll drift + final verification + docs

**Files:**
- Modify: `featured-motion.js` (replace the empty `initDrift` from Task 4)
- Modify: `AGENTS.md`

- [ ] **Step 1: Replace the empty `initDrift(tiles) {}` with the full implementation**

```javascript
    function initDrift(tiles) {
        /* Columns drift at slightly different speeds while the section scrolls
           by — depth without spectacle. Large tile (col 1) rises gently,
           middle column stays, right column sinks. */
        var drifts = [-3, 0, 3, -1.5, 0, 3, -1.5, 0];
        tiles.forEach(function (tile, index) {
            var tween = gsap.to(tile, {
                yPercent: drifts[index % drifts.length],
                ease: 'none',
                scrollTrigger: {
                    trigger: grid,
                    start: 'top 85%',
                    end: 'bottom 10%',
                    scrub: 0.8
                }
            });
            teardownFns.push(function () {
                if (tween.scrollTrigger) tween.scrollTrigger.kill();
                tween.kill();
            });
        });
    }
```

- [ ] **Step 2: Syntax check**

Run: `node --check featured-motion.js` → expected: exit 0.

- [ ] **Step 3: Full-page regression check**

Playwright script `tmp/check6.py`:

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":1440,"height":900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("http://localhost:8123/#/", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    pg.mouse.wheel(0, 700); pg.wait_for_timeout(1500)
    y_before = pg.evaluate("document.querySelector('.featured-tile').getBoundingClientRect().top")
    pg.mouse.wheel(0, 400); pg.wait_for_timeout(800)
    # drift: the large tile's viewport offset differs from pure scroll delta
    y_after = pg.evaluate("document.querySelector('.featured-tile').getBoundingClientRect().top")
    assert abs((y_before - y_after) - 400) > 2, "no differential drift detected"
    # fps probe while scrolling
    fps = pg.evaluate("""() => new Promise(res => {
        let n = 0; const t0 = performance.now();
        function tick(){ n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else res(n); }
        requestAnimationFrame(tick);
    })""")
    assert fps > 50, f"fps too low: {fps}"
    # tile click still navigates
    pg.locator(".featured-tile").first.click()
    pg.wait_for_timeout(600)
    assert pg.evaluate("location.hash") == "#/dance/kizomba"
    assert errs == [], errs
    # mobile: entrance only, no tilt listeners crash
    m = b.new_page(viewport={"width":390,"height":844})
    m.goto("http://localhost:8123/#/", wait_until="networkidle")
    m.wait_for_timeout(1500)
    m.mouse.wheel(0, 1200); m.wait_for_timeout(2000)
    m.screenshot(path="tmp/t6-mobile.png")
    b.close()
print("TASK6 OK")
```

Run: `python3 tmp/check6.py` → expected `TASK6 OK`. Inspect `tmp/t6-mobile.png`: tiles fully revealed on mobile.

- [ ] **Step 4: Document in `AGENTS.md`**

In the Architecture bullet list (after the `lineage-motion.js` bullet), add:

```markdown
- `featured-motion.js` — progressive-enhancement motion for the home featured grid ("Wejście na parkiet"): syncopated clip-path entrance (per-tile wipe directions + beat-pattern stagger), pointer-driven 3D tilt with inner-photo parallax and cursor-following sheen (`--mx`/`--my`, fine pointers only), neighbor focus dimming, and scrubbed column drift. Requires GSAP + ScrollTrigger; adds `.featured-motion-on` to `#featured-dances-container` (CSS in styles.css neutralizes the old hover lift only in that mode). The tile photo lives in an inner `.featured-tile-media` layer rendered by `renderFeaturedDances()` so it can transform independently. Exits under `prefers-reduced-motion` / missing CDN, leaving the static grid with its CSS hover.
```

- [ ] **Step 5: Final syntax sweep + commit**

Run: `node --check app.js && node --check featured-motion.js && node --check hero-motion.js` → expected: exit 0.

```bash
git add featured-motion.js AGENTS.md
git commit -m "feat: scroll drift for featured tiles; document featured-motion architecture"
```

---

## Acceptance checklist (run at the very end)

- [ ] Entrance: tiles wipe in from varied directions on a syncopated rhythm; photos settle from a slight zoom; text un-blurs. Nothing "rises and fades" uniformly.
- [ ] Hover (desktop): tile tilts toward cursor, photo counter-moves (depth), warm sheen follows cursor, siblings recede; on leave everything springs back.
- [ ] Scroll: gentle differential column drift; 50+ fps in the probe.
- [ ] Click/Enter/Space on a tile still navigates to the dance card.
- [ ] `prefers-reduced-motion`: no `.featured-motion-on`, static grid, CSS hover lift intact, content fully visible.
- [ ] GSAP CDN blocked (test by editing the script src to a bogus URL temporarily): page intact, static grid, CSS hover lift intact. Revert the edit.
- [ ] No console errors on `#/`, `#/dances`, `#/timeline`, `#/glossary`.
- [ ] Warm-documentary tone preserved: no neon, no glass blur, sheen is a subtle paper-warm light.
