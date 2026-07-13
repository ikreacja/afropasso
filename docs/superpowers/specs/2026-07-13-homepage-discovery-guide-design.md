# Homepage Discovery Guide Design

## 1. Problem

The home page currently shows the dance library twice: the animated "Wejście na parkiet" featured-tiles grid (8 dances), and — right below it, past the "Perspektywa AfroPasso" pillars — a second section, "Zajrzyj do biblioteki tańców", with 6 smaller dance cards and a "Zobacz wszystkie tańce" button. Both sections point at the same destination (`#/dances` and individual dance detail pages). The second section adds no new information; it is a straight duplicate of the "Wszystkie tańce" library page one click away, and of the newly added "Passo" companion, which already offers a "Wszystkie tańce" quick link on every page.

Meanwhile the site has five other destinations (Społeczność, Etykieta, Korzenie, Porównaj, Glosariusz) that get no equivalent visual introduction on the home page — only small nav-bar text links and Passo's contextual one-liners.

## 2. Decision

Replace the duplicate library preview with a **discovery guide section** that teases the five non-library destinations. Move the "Zobacz wszystkie tańce" CTA up into the featured-tiles section, immediately below the grid it belongs to.

"Wszystkie tańce" itself does not get a tile in the new section — it is already covered by the relocated button, the main nav, and Passo. Adding a sixth tile for it would recreate the exact duplication this change removes.

## 3. Page structure (home view)

Order stays the same; section 4 (dances-grid preview) is replaced in place:

1. Hero
2. **Biblioteka tańców** (`.library-panel`) — featured-tiles grid (unchanged) + relocated "Zobacz wszystkie tańce" button directly below the grid
3. **Perspektywa AfroPasso** (`.dance-pillars`) — unchanged
4. **NEW: discovery guide section** (replaces the old `.dances-grid` preview) — 5 tiles: Społeczność, Etykieta, Korzenie, Porównaj, Glosariusz

## 4. Layout and visual language

Photographic tiles in the same family as featured-tiles (photo + dark gradient scrim + text), but a **separate CSS namespace** (`.guide-grid` / `.guide-tile` / `.guide-tile-media`), not `.featured-tile`. This keeps the new section decoupled from `featured-motion.js`, whose selectors are scoped to `#featured-dances-container` — no risk of it (or a future change to it) touching this section, and no repeat of the pseudo-element ghosting bug we just fixed there.

Asymmetric grid: **Społeczność is the large tile** (spans 2 rows, same mechanism as `.featured-large`), the other four are equal-sized. Społeczność is the most actionable "what do I do next" destination — real events to actually go dance at — and is the natural next step after browsing the dance library above it.

Responsive: single column on narrow viewports (reuse the same breakpoint pattern as `.featured-grid`).

## 5. Motion

Lighter than featured-tiles, deliberately:

- **Entrance:** add `.guide-grid` as a new group in `hero-motion.js`'s existing `setupReveals()` (the same generic IntersectionObserver reveal already used for `.dance-pillars` and section headings). No new JS file.
- **Hover:** plain CSS, reusing the exact fallback pattern already on `.featured-tile:hover` — `transform: translateY(-2px); filter: saturate(1.08) contrast(1.03);`. No tilt, no parallax, no sheen.
- Respects `prefers-reduced-motion` the same way the rest of the site does (the existing blanket transition/animation override already covers this).

## 6. Content

Tone matches Passo's existing one-line messages (short, warm, plain Polish, no marketing inflation) — reusing that established voice rather than inventing a new one:

| Tile | Title | Teaser | Links to |
|---|---|---|---|
| Społeczność (large) | Społeczność | Potańcówki, warsztaty i festiwale w Polsce — zawsze aktualne. | `#/events` |
| Etykieta | Etykieta | Zasady, gesty i kultura parkietu — jak tańczyć z szacunkiem. | `#/etykieta` |
| Korzenie | Korzenie | Nić rodowodu: jak tańce wędrowały przez kraje i epoki. | `#/timeline` |
| Porównaj | Porównaj | Zestaw dwa style obok siebie i zobacz, czym naprawdę się różnią. | `#/compare` |
| Glosariusz | Glosariusz | Nie znasz terminu? Sprawdź pełne wyjaśnienie. | `#/glossary` |

Section heading follows the existing site-wide pattern (kicker + h3), e.g. kicker "Odkryj AfroPasso", heading "Co jeszcze znajdziesz na stronie".

## 7. Images — generation prompts

No existing photo assets fit these five (abstract) concepts, and this session has no image-generation tool. The prompts below are handed off separately (OpenAI/ChatGPT image generation) and are written to match the established photography style of `assets/dances/*.png`: candid documentary photography, warm golden/ambient lighting, real skin tones and contemporary casual clothing, wood-floor studio or sunlit courtyard settings, muted earthy color grading (clay/ochre/warm brown), no text or logos in frame, 16:9.

1. **Społeczność** — *"Warm-lit social dance evening, a diverse group of couples dancing close together on a polished wooden floor, more people chatting, clapping and watching at the edges of the room, string/pendant lights overhead, golden-hour warm color grading, candid documentary photography style, contemporary casual clothing, relaxed community dance-studio or courtyard atmosphere, 16:9, no text."*
2. **Etykieta** — *"Close-up candid photograph of a man politely extending his hand to invite a woman to dance at a warm-lit social dance event, genuine warm smiles, wooden dance floor softly blurred in the background, documentary photography style, warm earthy color grading, 16:9, no text."*
3. **Korzenie** — *"Warm documentary photograph evoking cultural heritage and lineage: an older musician playing a traditional hand drum while younger dancers watch and learn nearby, sunlit outdoor courtyard with weathered ochre walls, candid style, warm earthy tones, 16:9, no text."*
4. **Porównaj** — *"Two dance couples in the same warm-lit wooden-floor studio, performing visibly different dance holds side by side — one pair in a close, intimate embrace, the other in a more open, dynamic stance — natural photographic contrast between the two styles, documentary photography, warm earthy color grading, 16:9, no text."*
5. **Glosariusz** — *"Candid documentary photograph of a dance instructor demonstrating a small footwork detail to attentive students gathered in a circle, focus on hands and feet mid-explanation, warm-lit wooden studio, warm earthy color grading, 16:9, no text."*

Until real images exist, each tile's `background-image` 404s silently and the tile shows its solid dark fallback color (`oklch(14% 0.04 48)`, the same tone `.featured-tile` itself falls back to) with the heading/teaser text still fully readable — CSS has no way to substitute a different image on a 404 the way an `<img onerror>` handler could, so this dark-tile state (not the `assets/hero-dance-workshop.png` hero photo) is what actually ships until the five files exist. Either way the section ships complete and never shows a broken-image icon.

## 8. Technical changes

- **`index.html`:**
  - Remove the `<section class="dances-grid" aria-labelledby="library-preview-title">` block (old preview + button) from the home view.
  - Add `<a class="btn-primary" href="#/dances">Zobacz wszystkie tańce</a>` inside `.library-panel`, directly after `#featured-dances-container`.
  - Add the new discovery guide `<section class="guide-panel">` with hardcoded markup for the 5 tiles (static site-structure content, not data-driven — same reasoning as the hardcoded `.dance-pillars`).
- **`app.js`:**
  - Remove `renderLibraryPreview()` and its call sites, and the now-unused `elements.home.previewContainer` reference. `library-preview-container` no longer exists in the DOM.
  - No changes to `danceCardHTML()` or other shared card logic — `.dances-grid`/`.cards-grid` CSS classes stay, since `#/dances` (the real library page) still uses them.
- **`styles.css`:**
  - New `.guide-grid` / `.guide-tile` / `.guide-tile-media` / `.guide-large` rules, modeled on `.featured-grid`/`.featured-tile`/`.featured-tile-media` but without the motion-support hooks (`.featured-motion-on`, `.tile-arrow` sheen, etc.) — those stay scoped to featured-tiles only. Reuse the `.tile-arrow` CTA-arrow pattern (plain text arrow, baseline-aligned) already fixed on featured-tiles for the "Przejdź do..." links here too, for visual consistency.
  - Keep the `.library-preview-action` rule — the relocated "Zobacz wszystkie tańce" button reuses this exact class in its new position under the featured-tiles grid. Keep everything `.dances-grid`/`.cards-grid` related too — the `#/dances` library page still depends on it.
- **`hero-motion.js`:**
  - Add one entry to the `groups` array in `setupReveals()` targeting `#home-view .guide-panel`, following the exact same shape as the existing `.dance-pillars` group (heading + each grid child).
- **`AGENTS.md`:**
  - Update the home-page description bullet to reflect the new section and the removed preview.

## 9. Out of scope

- No new JS motion file — this explicitly reuses existing generic reveal plumbing.
- No changes to the destination pages themselves (`#/events`, `#/etykieta`, `#/timeline`, `#/compare`, `#/glossary`).
- No CMS/data-file for the guide tiles — five static destinations don't warrant a JSON source of truth.
