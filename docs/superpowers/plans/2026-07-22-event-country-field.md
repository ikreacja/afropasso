# Event `country` Field — Implementation Plan

> Execute inline (small, well-specified). Verify with `node --check` + `node --test` + JSON validation + manual browser.

**Goal:** Add a searchable `country` field to events with a "Kraj" filter, shown in the filter and on the detail page.

**Spec:** `docs/superpowers/specs/2026-07-22-event-country-field-design.md`

## Task A1 — index.html country filter
Add a `.filter-group` with `<select id="event-country-filter">` (label "Kraj") immediately BEFORE the "Miasto" filter-group in `.events-filters-container`.

## Task A2 — app.js wiring + detail display
- `initializeElements`: add `elements.events.countryFilter = document.getElementById('event-country-filter');` before `cityFilter`.
- `setupEventListeners`: add `elements.events.countryFilter.addEventListener('change', handleEventFilters);` before the cityFilter listener.
- `handleEventFilters`: read `const country = elements.events.countryFilter.value;`, add `(!country || event.country === country) &&` to the predicate, and include `country` in the `updateEventFilterStatus(Boolean(...))` arg.
- `clearEventFilters`: add `elements.events.countryFilter.value = '';`.
- `populateEventFilterOptions`: derive countries from upcoming events (filter falsy), populate `countryFilter`, preserve selection.
- `renderEventsList` hasFilters: add `elements.events.countryFilter.value ||`.
- `showEventDetail`: add `const placeLabel = event.country ? \`${event.city}, ${event.country}\` : event.city;`; use `escapeHTML(placeLabel)` in the kicker (replacing `escapeHTML(event.city)`) and in the venue fallback line (`${escapeHTML(placeLabel)} w mapach`).

## Task A3 — events.json backfill
Add `country` to the 5 events: VAMOS → Polska, elSol → Polska, Paris → Francja, Nantes → Francja, Tukina → Portugalia.

## Task A4 — promote-candidate.js carry country (+test)
In `candidateToEvent`, after the `city` assignment area (optional fields block), add `if (candidate.country) event.country = candidate.country;`. Add a test asserting country carries through.

## Task A5 — add-event.js prompt
Add a `const country = await ask('Kraj', 'Polska');` prompt and `if (country) event.country = country;` (optional field, default Polska).

## Task A6 — SKILL.md candidate shape
Add `country` to the example JSON (`"country": "Polska"`) and to the optional/required field notes.

## Verify
`node --check app.js`; `node --check tools/*.js`; `node --test tools/promote-candidate.test.js`; validate events.json; manual: Kraj filter narrows list, detail shows "miasto, Kraj".
