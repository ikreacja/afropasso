# AfroPasso Agent Notes

## Project

AfroPasso is a static HTML/CSS/JavaScript site for GitHub Pages. It is a brand-led educational guide to African and Afro-diasporic dances, starting with the kizomba family.

Primary files:
- `index.html`: single-page app shell and static views.
- `styles.css`: full visual system and responsive layout.
- `app.js`: hash router, data loading, filtering, cards, detail views, timeline, comparison, glossary.
- `data/dances.json`: canonical dance and timeline data.
- `PRODUCT.md` and `DESIGN.md`: product and visual direction for future UI work.

## Brand Direction

Use the name **AfroPasso** and tagline **z pasji do tańców afrykańskich**.

The approved visual lane is warm cultural documentary: human, tactile, readable, and elegant. The hero concept is **Tańce, które łączą ludzi i historie**. Preserve a respectful educational tone and avoid exoticizing imagery or generic nightclub styling.

## Implementation Rules

- Keep the site deployable from the repository root on GitHub Pages.
- Do not introduce a build step unless explicitly requested.
- Prefer semantic HTML, accessible controls, visible focus states, and reduced-motion support.
- Use local JSON data and relative paths that work under `/afropasso/`.
- Avoid pure black, pure white, gradient text, glassmorphism, and colored side-stripe card accents.
- Do not commit `.DS_Store`, `.npm-cache/`, or generated local cache files.

## Verification

Before claiming completion:
- Run `node --check app.js`.
- Parse `data/dances.json`.
- If a local browser/server is available, inspect desktop and mobile layouts.
- Check `git status -sb` and keep unrelated local artifacts out of commits.
