# AfroPasso Agent Notes

## Project

AfroPasso is a static HTML/CSS/JavaScript site (no build step, no framework, no package.json) deployed to GitHub Pages from the repository root. It is a Polish-language educational guide to African and Afro-diasporic dances, starting with the kizomba family. Do not introduce a build step unless explicitly requested.

## Commands

There are no build, lint, or test commands. Verification before claiming completion:

```bash
node --check app.js                                # syntax-check the JS
node -e "JSON.parse(require('fs').readFileSync('data/dances.json'))"  # validate data
python3 -m http.server 8000                        # serve locally (fetch() requires HTTP, not file://)
```

If a local browser is available, inspect desktop and mobile layouts. Also check `git status -sb` and keep unrelated local artifacts (`.DS_Store`, `.npm-cache/`, `tmp/`, the loose research `.md`/`.txt` notes in the root) out of commits.

## Architecture

Single-page app with a hash router. All views live as `<section>` elements inside `index.html`; `app.js` shows/hides them.

- `index.html` — app shell and static markup for all views (home, Wszystkie tańce library, dance detail, timeline, compare, glossary).
- `app.js` — everything dynamic: global state at the top (`dancesData`, `filteredDances`, `currentRoute`), an `elements` object caching all DOM references (populated in `initializeElements()`), hash routing via `handleRoute()` (`#/`, `#/dances`, `#/dance/<slug>`, `#/timeline`, `#/compare`, `#/glossary`), data loading, search/filtering, and card/detail/timeline/comparison/glossary rendering. Home (`#/`) shows a static 8-tile featured set plus a static 6-card library preview (`renderLibraryPreview`); search and filtering live on the Wszystkie tańce page (`#/dances`), which renders the full index via `renderDanceCards`. Both preview and library reuse the shared `danceCardHTML()` template.
- `styles.css` — the full visual system and responsive layout.
- `data/dances.json` — canonical dance and timeline data, fetched at startup. Each dance has `id`/`slug`, `names`, `origin`, `classification`, `family`, `music`, Polish-language text fields (`*_pl`), `influences`, `differences_pl`, `controversies_pl`, and `videos`. Content changes usually mean editing this file, not JS.
- `assets/` — brand marks, hero, pillar icons, and one image per dance in `assets/dances/`.

Use relative paths only (site must work under a `/afropasso/` subpath on GitHub Pages).

## Design constraints

`PRODUCT.md` and `DESIGN.md` define the product and visual direction — read them before UI work. Key hard rules:

- Palette lives in `DESIGN.md` frontmatter (warm paper, clay red, ochre, palm green, ink brown…). Never pure black or pure white.
- Forbidden: gradient text, glassmorphism, colored side-stripe card accents, generic icon grids, technical grid overlays as decoration, nightclub/neon styling, exoticizing imagery.
- Typography: serif display stack (Iowan Old Style/Palatino/Georgia), humanist sans body (Avenir/Segoe UI/system-ui).
- Tone: warm cultural documentary — respectful, educational, direct Polish copy without marketing inflation.
- Accessibility: target WCAG 2.1 AA — semantic HTML, keyboard navigation, visible focus states, reduced-motion support.

Brand: name **AfroPasso**, tagline **z pasji do tańców afrykańskich**, hero concept **Tańce, które łączą ludzi i historie**.
