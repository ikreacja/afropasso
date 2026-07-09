# "Wszystkie tańce" Library Page Design

## 1. Feature Summary

Split the home page into two surfaces. The home page keeps its fixed, curated blocks (hero, featured photo tiles, pillars) and gains a small library preview. Search and filtering move to a new dedicated page, **Wszystkie tańce** (`#/dances`), which hosts the full, growing dance library as text cards.

## 2. Problem

Filters currently sit on the home page between curated sections. Their results render into the full-index grid almost two viewports below, so filtering appears to do nothing. A previous fix made the featured tiles react to filters, but the featured tiles are curated brand content and must stay static. The library will also grow well beyond 9 dances, which the current single-page layout does not accommodate.

## 3. Decisions Made (with user)

- **Structure:** separate library page plus a home preview (visual option B).
- **Library card style:** text cards, identical to the current full-index cards — no dependency on per-dance graphics (visual option B).
- **Navigation:** menu becomes **Wszystkie tańce · Korzenie · Porównaj · Słownik**; the "Biblioteka" item is removed and the AfroPasso logo becomes the home link.
- **Home preview:** the first 6 dances in `data/dances.json` order (curatorial control via file order), followed by a "Zobacz wszystkie tańce" button.
- **Pillars stay:** the "Taniec to więcej niż kroki" section (Korzenie · Muzyka · Społeczność) remains on the home page unchanged.

## 4. Home Page (after)

Section order:

1. Hero — unchanged, except the "Przeglądaj tańce" button now navigates to `#/dances` instead of the `#dances-title` anchor.
2. Featured photo tiles — static curated list again; the filter-reactivity added on 2026-07-09 is removed.
3. "Taniec to więcej niż kroki" pillars — unchanged.
4. Library preview — new section replacing the full "Wszystkie style w bibliotece" index: kicker "Z biblioteki AfroPasso", headline "Zajrzyj do biblioteki tańców", the first 6 text cards from `dances.json`, and a primary button "Zobacz wszystkie tańce" linking to `#/dances`.

Removed from home: the search input, all three filter selects, the "Wyczyść" button, the filter-status counter, and the full index grid with its no-results message.

## 5. "Wszystkie tańce" Page (new)

New view `#dances-view`, route `#/dances`:

- Section heading in the established editorial style (kicker + headline).
- The complete filter bar moved from home: search input, Pochodzenie / Epoka / Charakter selects, "Wyczyść" button, and the live result counter (`#filter-status`, `role="status"`, Polish pluralization: "1 styl pasuje…", "3 style pasują…", "9 stylów pasuje…").
- Full grid of text cards (same markup and styling as the current index cards), rendered from the filtered data set.
- No-results message ("Nie ma stylu pasującego…") lives here.

Filtering logic in `app.js` is reused unchanged; it now renders only into this page, so results always appear directly under the controls.

## 6. Implementation Outline

- `index.html`: add `#dances-view`; move filter markup and `#dances-container`/`#no-results` into it; add the preview section markup to `#home-view`; update nav items and wrap the logo in a home link.
- `app.js`: register the `dances` view and route; revert `renderFeaturedDances()` to the static curated list; point `renderDanceCards()` at the library page; add `renderLibraryPreview()` (first 6 dances) for home; keep `handleFilters`/`clearFilters`/`updateFilterStatus` targeting the library page elements.
- `styles.css`: styles for the preview section and the library page header; reuse existing card, filter, and status styles.
- `data/dances.json`: no changes. New dances added there appear automatically in the library and (if within the first 6) in the preview.

## 7. Error Handling

- Unknown routes keep redirecting to `/`.
- Zero filter matches: cards grid empties, no-results message and status counter ("Żaden styl nie pasuje do filtrów.") show on the library page.
- Data load failure: existing global error message behavior is unchanged.

## 8. Testing

Playwright suite (local server):

- Home: 8 static featured tiles, pillars section present, exactly 6 preview cards, no filter controls, "Zobacz wszystkie tańce" navigates to `#/dances`.
- Library page: 9 cards baseline; search "semba" → 3; country Haiti → 1; period/type filters work; clear restores; counter text and visibility correct; no-results state correct.
- Navigation: logo click returns home; nav has 4 items with correct active states; hero button reaches the library.
- No console/page errors; desktop and mobile screenshots inspected.
- `node --check app.js` and JSON parse of `data/dances.json` pass.
