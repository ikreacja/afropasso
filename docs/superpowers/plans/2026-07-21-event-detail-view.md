# Event Detail View + Cards-as-Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `#/events` list into an internal hub: cards click through to an on-site `#/event/<id>` detail page (facts + editorial `summary_pl` + internal cross-links), with hover/shadow interactions.

**Architecture:** New `#event-detail-view` section + `showEventDetail(id)` mirroring the existing `showDanceDetail(slug)`; router gains an `event` case. Event cards (`eventRowHTML`, `renderFeaturedEvents`) link internally instead of externally; the external "buy ticket" CTA moves onto the detail page. `summary_pl` flows through the research pipeline.

**Tech Stack:** Static HTML/CSS/vanilla JS (no build, no test framework for the site — verify with `node --check` + manual browser). `promote-candidate.js` uses `node:test`.

**Spec:** `docs/superpowers/specs/2026-07-21-event-detail-view-design.md`

**Verification note:** The site has no unit-test framework (per AGENTS.md). App code is verified with `node --check app.js`, JSON validation, and a manual browser checkpoint on `http://localhost:8123`. Only `promote-candidate.js` has unit tests.

**Existing anchors (current app.js):** router `handleRoute` L242 (switch L254), `showView` L308, `showDanceDetail` L518, `getUpcomingEvents` L1427, helpers `EVENT_TYPE_LABELS` L1417 / `parseEventDate` L1422 / `eventFullDateFormatter` L1420, `renderFeaturedEvents` L1495, `eventRowHTML` L1544, `escapeHTML` L1671 / `escapeAttribute` L1681. `initializeElements` views block L71-119.

---

## Task 1: Add the detail view section to index.html

**Files:** Modify `index.html` (after the `#dance-view` block, ~L521-525)

- [ ] **Step 1: Insert the section**

After the closing `</div>` of `<div id="dance-view" class="view">…</div>`, add:

```html
        <!-- Event Detail View -->
        <div id="event-detail-view" class="view">
            <div id="event-detail" class="event-detail">
                <!-- Event detail content populated by JavaScript -->
            </div>
        </div>
```

- [ ] **Step 2: Verify the id exists exactly once**

Run: `grep -c 'id="event-detail-view"' index.html`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add event detail view section"
```

---

## Task 2: Wire the router and element references

**Files:** Modify `app.js` (`initializeElements` L119 area; `handleRoute` switch L254; `showView` L308)

- [ ] **Step 1: Register the view + detail container**

In `initializeElements()`, right after the line `elements.views.events = document.getElementById('events-view');` (L119), add:

```javascript
    elements.views.event = document.getElementById('event-detail-view');
    elements.eventDetail = document.getElementById('event-detail');
```

- [ ] **Step 2: Add the route case**

In `handleRoute()`'s `switch (currentRoute)`, add this case immediately after the `case 'dance':` block (after its `break;`, ~L273):

```javascript
        case 'event':
            if (params[0]) {
                showEventDetail(params[0]);
            } else {
                navigateTo('/events');
            }
            break;
```

- [ ] **Step 3: Harden showView against a missing view**

Replace the body of `showView` (L309-311):

```javascript
    Object.values(elements.views).forEach(view => {
        view.classList.remove('active');
    });
```

with:

```javascript
    Object.values(elements.views).forEach(view => {
        if (view) view.classList.remove('active');
    });
```

- [ ] **Step 4: Syntax-check**

Run: `node --check app.js`
Expected: exit 0, no output. (`showEventDetail` is defined in Task 3; `node --check` only parses, so it passes now.)

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: route #/event/<id> to the detail view"
```

---

## Task 3: Implement showEventDetail + helpers

**Files:** Modify `app.js` (add functions near the other event functions, e.g. right after `eventRowHTML` ends at L1580)

- [ ] **Step 1: Add the helpers and the render function**

Insert after `eventRowHTML`'s closing brace (L1580):

```javascript
function eventMapsUrl(event) {
    const query = [event.venue, event.city].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function similarEvents(event) {
    return getUpcomingEvents()
        .filter(e => e.id !== event.id &&
            (e.city === event.city || (e.styles || []).some(s => (event.styles || []).includes(s))))
        .slice(0, 3);
}

function showEventDetail(id) {
    const event = (eventsData || []).find(e => e.id === id);
    if (!event) {
        navigateTo('/events');
        return;
    }

    const start = parseEventDate(event.date_start);
    const end = event.date_end && event.date_end !== event.date_start ? parseEventDate(event.date_end) : null;
    const fullDate = end
        ? `${eventFullDateFormatter.format(start)} – ${eventFullDateFormatter.format(end)}`
        : eventFullDateFormatter.format(start);
    const typeLabel = EVENT_TYPE_LABELS[event.type] || event.type;

    const styleChips = (event.styles || []).map(slug => {
        const dance = dancesData.find(d => d.slug === slug);
        const name = dance ? dance.names.pl : slug;
        return dance
            ? `<a class="event-style-chip" href="#/dance/${escapeAttribute(slug)}">${escapeHTML(name)}</a>`
            : `<span class="event-style-chip">${escapeHTML(name)}</span>`;
    }).join('');

    const facts = [
        event.time ? `🕘 ${escapeHTML(event.time)}` : '',
        event.price ? `💶 ${escapeHTML(event.price)}` : ''
    ].filter(Boolean).join('  ·  ');

    const venueLine = event.venue
        ? `<p class="event-detail-venue">📍 ${escapeHTML(event.venue)} · <a href="${escapeAttribute(eventMapsUrl(event))}" target="_blank" rel="noopener">otwórz w mapach ↗</a></p>`
        : `<p class="event-detail-venue">📍 <a href="${escapeAttribute(eventMapsUrl(event))}" target="_blank" rel="noopener">${escapeHTML(event.city)} w mapach ↗</a></p>`;

    const similar = similarEvents(event);
    const similarHTML = similar.length
        ? `<section class="detail-section event-similar">
                <h3>Podobne wydarzenia</h3>
                <div class="events-list">${similar.map(eventRowHTML).join('')}</div>
            </section>`
        : '';

    elements.eventDetail.innerHTML = `
        <header class="event-detail-header featured-event-tile ${event.image ? 'has-detail-image' : ''}"
                ${event.image ? `style="--tile-image: url('${escapeAttribute(event.image)}')"` : ''}>
            <div class="event-detail-head-content">
                <button class="detail-back-link" onclick="navigateTo('/events')" type="button">Wróć do wydarzeń</button>
                <p class="event-detail-kicker">${escapeHTML(typeLabel)} · ${escapeHTML(fullDate)} · ${escapeHTML(event.city)}</p>
                <h2 class="event-detail-title">${escapeHTML(event.title)}</h2>
            </div>
        </header>
        <div class="event-detail-body">
            <section class="detail-section event-facts">
                <p class="event-detail-dateline">📅 ${escapeHTML(fullDate)}${facts ? '  ·  ' + facts : ''}</p>
                ${venueLine}
                ${styleChips ? `<p class="event-detail-styles">Style: ${styleChips}</p>` : ''}
                ${event.organizer ? `<p class="event-detail-organizer">Organizator: ${escapeHTML(event.organizer)}</p>` : ''}
            </section>
            ${event.summary_pl ? `
            <section class="detail-section">
                <h3>O wydarzeniu</h3>
                <p class="event-detail-summary">${escapeHTML(event.summary_pl)}</p>
            </section>` : ''}
            <section class="detail-section event-cta-section">
                <a class="event-cta" href="${escapeAttribute(event.url)}" target="_blank" rel="noopener">Kup bilet / Zapisz się ↗</a>
                ${event.confidence === 'single-source' ? `<p class="event-confidence-note">⚠ Termin do potwierdzenia — sprawdź u organizatora.</p>` : ''}
            </section>
            ${similarHTML}
        </div>
    `;
}
```

- [ ] **Step 2: Syntax-check**

Run: `node --check app.js`
Expected: exit 0.

- [ ] **Step 3: Manual browser checkpoint**

Run: `python3 -m http.server 8123` and open `http://localhost:8123/#/event/paris-kizomba-congress-2026-11-19`. Confirm the detail page renders: title, date, venue + maps link, style chips, CTA, and (if other events exist) a "Podobne wydarzenia" block. Click a style chip → lands on the dance card. Click "Wróć do wydarzeń" → back to `#/events`. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: render event detail page with facts, summary, cross-links"
```

---

## Task 4: Make event cards link internally

**Files:** Modify `app.js` (`renderFeaturedEvents` L1495-1508; `eventRowHTML` return L1565-1579)

- [ ] **Step 1: Featured tiles → internal detail**

In `renderFeaturedEvents`, replace the opening `<a ...>` tag (L1498-1499):

```javascript
        <a class="featured-tile featured-event-tile" href="${escapeAttribute(event.url)}" target="_blank" rel="noopener"
           ${event.image ? `style="--tile-image: url('${escapeAttribute(event.image)}')"` : ''}>
```

with:

```javascript
        <a class="featured-tile featured-event-tile" href="#/event/${escapeAttribute(event.id)}"
           ${event.image ? `style="--tile-image: url('${escapeAttribute(event.image)}')"` : ''}>
```

- [ ] **Step 2: List rows → clickable internal card**

Replace the entire `return \`...\`;` block of `eventRowHTML` (L1565-1579) with:

```javascript
    return `
        <a class="event-row" href="#/event/${escapeAttribute(event.id)}">
            <div class="event-date-block" aria-hidden="true">
                <span class="event-day">${escapeHTML(dayLabel)}</span>
                <span class="event-weekday">${escapeHTML(weekday)}</span>
            </div>
            <div class="event-row-body">
                <span class="sr-only">${escapeHTML(fullDate)}</span>
                <h4 class="event-title">${escapeHTML(event.title)}</h4>
                <p class="event-meta">${escapeHTML(meta)}</p>
                ${details ? `<p class="event-details">${escapeHTML(details)}</p>` : ''}
            </div>
            <span class="event-row-arrow" aria-hidden="true">→</span>
        </a>
    `;
```

- [ ] **Step 3: Syntax-check**

Run: `node --check app.js`
Expected: exit 0.

- [ ] **Step 4: Manual browser checkpoint**

Serve on 8123, open `http://localhost:8123/#/events`. Confirm: clicking any list row navigates to that event's detail page; clicking a featured tile does the same (no longer opens an external tab). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: event cards link to internal detail page"
```

---

## Task 5: Styles for detail page + card hover

**Files:** Modify `styles.css` (append near the existing event styles, after `.featured-event-tile` block ~L2380)

- [ ] **Step 1: Add the styles**

Append:

```css
/* Event cards as links */
.event-row {
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    transition: transform 160ms var(--ease-micro), box-shadow 160ms var(--ease-micro);
}
.event-row:hover,
.event-row:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px oklch(30% 0.03 60 / 0.14);
    outline: none;
}
.event-row:focus-visible {
    box-shadow: 0 0 0 2px var(--clay);
}
.event-row-arrow {
    margin-left: auto;
    align-self: center;
    color: var(--clay);
    font-size: 1.1rem;
    transition: transform 160ms var(--ease-micro);
}
.event-row:hover .event-row-arrow {
    transform: translateX(3px);
}

/* Event detail page */
.event-detail-header {
    display: flex;
    align-items: end;
    min-height: 220px;
    padding: clamp(1.35rem, 3vw, 2.5rem);
    border-radius: var(--radius-md);
    color: var(--paper);
    margin-bottom: var(--space-4);
}
.event-detail-kicker {
    font-size: 0.9rem;
    letter-spacing: 0.04em;
    opacity: 0.92;
}
.event-detail-title {
    font-family: var(--font-display, Georgia, serif);
    font-size: clamp(1.6rem, 4vw, 2.4rem);
    margin-top: var(--space-1);
}
.event-detail-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}
.event-facts p { margin: 0 0 var(--space-2); }
.event-style-chip {
    display: inline-block;
    margin: 0 6px 6px 0;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--sand);
    color: var(--ink);
    text-decoration: none;
    font-size: 0.9rem;
}
a.event-style-chip:hover,
a.event-style-chip:focus-visible {
    background: var(--ochre, oklch(78% 0.09 74));
    outline: none;
}
.event-cta {
    display: inline-block;
    padding: 12px 22px;
    border-radius: var(--radius-sm);
    background: var(--clay);
    color: var(--paper);
    text-decoration: none;
    font-weight: 600;
}
.event-cta:hover,
.event-cta:focus-visible {
    filter: brightness(1.06);
    outline: none;
}
.event-confidence-note {
    margin-top: var(--space-2);
    font-size: 0.88rem;
    color: var(--muted);
}
.event-similar .events-list { margin-top: var(--space-2); }

@media (prefers-reduced-motion: reduce) {
    .event-row,
    .event-row-arrow { transition: none; }
    .event-row:hover,
    .event-row:focus-visible { transform: none; }
    .event-row:hover .event-row-arrow { transform: none; }
}
```

Note: if any CSS variable above (`--ease-micro`, `--radius-sm`, `--sand`, `--clay`, `--muted`, `--paper`, `--ochre`, `--font-display`) is not defined in `:root`, the browser falls back gracefully; verify visually in Step 2 and swap for an existing variable if a color looks wrong.

- [ ] **Step 2: Manual browser checkpoint**

Serve on 8123. On `#/events`: rows lift + shadow on hover, arrow nudges right, keyboard focus shows an outline. On `#/event/<id>`: header, chips, CTA button, confidence note (open a single-source event like `nantes-kizomba-festival-2026-12-03`) all look on-brand. Toggle OS reduced-motion and confirm no transform. Check mobile width. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: event card hover + detail page styling"
```

---

## Task 6: Carry summary_pl through promotion

**Files:** Modify `tools/promote-candidate.js` (`candidateToEvent` L30 area); `tools/promote-candidate.test.js`

- [ ] **Step 1: Add a failing test**

In `tools/promote-candidate.test.js`, add:

```javascript
test('candidateToEvent carries summary_pl when present', () => {
    const event = candidateToEvent({
        id: 'e3', title: 'T', type: 'festiwal', styles: ['kizomba'], city: 'Gdańsk',
        date_start: '2026-10-01', url: 'https://x', sources: ['a', 'b'], link_ok: true,
        summary_pl: 'Krótki opis.'
    });
    assert.strictEqual(event.summary_pl, 'Krótki opis.');
});

test('candidateToEvent omits summary_pl when absent', () => {
    const event = candidateToEvent({
        id: 'e4', title: 'T', type: 'festiwal', styles: ['kizomba'], city: 'Gdańsk',
        date_start: '2026-10-01', url: 'https://x', sources: ['a'], link_ok: true
    });
    assert.ok(!('summary_pl' in event));
});
```

- [ ] **Step 2: Run — confirm FAIL**

Run: `node --test tools/promote-candidate.test.js`
Expected: the new `carries summary_pl` test FAILS (event has no `summary_pl`).

- [ ] **Step 3: Implement**

In `tools/promote-candidate.js`, in `candidateToEvent`, add after the `if (candidate.image) event.image = candidate.image;` line:

```javascript
    if (candidate.summary_pl) event.summary_pl = candidate.summary_pl;
```

- [ ] **Step 4: Run — confirm PASS**

Run: `node --test tools/promote-candidate.test.js`
Expected: all tests PASS (7 total).

- [ ] **Step 5: Commit**

```bash
git add tools/promote-candidate.js tools/promote-candidate.test.js
git commit -m "feat: carry summary_pl from candidate to event"
```

---

## Task 7: Teach the research skill to draft summary_pl

**Files:** Modify `.claude/skills/event-research/SKILL.md`

- [ ] **Step 1: Add summary_pl to the candidate shape**

In the "Candidate shape" section, in the example JSON, add after the `"url"` line:

```json
  "summary_pl": "Jedno–trzy zdania własnego opisu (krótko, konkretnie, bez marketingu).",
```

And in the "Optional fields" sentence right below the JSON block, append to the list of optional fields: `, \`summary_pl\` (own editorial blurb — 1–3 plain, concrete sentences in the user's voice; never copy the organizer's text)`.

- [ ] **Step 2: Verify the edit**

Run: `grep -c 'summary_pl' .claude/skills/event-research/SKILL.md`
Expected: at least `2`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/event-research/SKILL.md
git commit -m "docs: event-research skill drafts summary_pl"
```

---

## Task 8 (operator, optional): backfill summary_pl for the 5 live events

Editorial — needs the owner's voice; not a code task. For each of the 5 published events in `data/events.json`, optionally add a `summary_pl` (1–3 plain sentences). Then `git commit -m "content: add editorial summaries to events"`. Skippable — the detail page omits the "O wydarzeniu" block when `summary_pl` is absent.

---

## Self-Review

**Spec coverage:**
- §2 routing/`showEventDetail` → Tasks 1, 2, 3. ✓
- §3 `summary_pl` + maps link → Task 3 (`eventMapsUrl`), Tasks 6, 7. ✓
- §4 detail layout (cover, facts, editorial, CTA, confidence note, similar) → Task 3 + Task 5 styling. ✓
- §5 card interactions (internal link, hover/shadow, a11y focus, reduced-motion) → Tasks 4, 5. ✓
- §6 internal cross-links (style chips → dance cards; similar events) → Task 3 (`similarEvents`, chips). ✓
- §7 pipeline/skill (`summary_pl` passthrough + skill) → Tasks 6, 7. ✓
- §8 out-of-scope (no scraping, no map embed) → honored (maps via link only). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; every command has expected output. ✓

**Type/name consistency:** `showEventDetail`, `eventMapsUrl`, `similarEvents` defined in Task 3 and referenced by the router in Task 2 (forward reference is fine — all hoisted `function` declarations in one file; `node --check` passes at each step). `elements.views.event` (set Task 2) is read by `showView` via `currentRoute==='event'`; `elements.eventDetail` (set Task 2) is written by `showEventDetail` (Task 3). `#/event/<id>` links (Task 4) match the router case `'event'` (Task 2) and `showEventDetail`'s `eventsData.find(e => e.id === id)`. `summary_pl` field name consistent across Tasks 3, 6, 7. ✓
