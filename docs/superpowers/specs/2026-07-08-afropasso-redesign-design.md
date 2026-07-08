# AfroPasso Redesign Design Brief

## 1. Feature Summary

Redesign the existing static kizomba-family guide into **AfroPasso**, a warmer and more memorable educational brand site. The first release keeps the current SPA structure and data, but upgrades the visual identity, homepage, cards, detail pages, timeline, comparison view, and glossary to match the approved "Warm cultural documentary" direction.

## 2. Primary User Action

Visitors should immediately understand that AfroPasso connects dances, people, origins, and histories, then start exploring the dance library through search, filters, cards, timeline, or comparison.

## 3. Design Direction

Color strategy: committed warm palette. The surface uses warm paper, clay red, ochre, palm green, sand, and brown with enough color to feel distinctive while staying readable.

Theme scene sentence: A Polish dancer opens AfroPasso in daylight after class or before a workshop, looking for context that feels human, respectful, and easy to share.

Anchor references: contemporary cultural festival guide, museum education page, tactile dance field notes.

Chosen visual direction: probe #1, "Warm cultural documentary". Carry forward the phrase **Tańce, które łączą ludzi i historie**, a large welcoming hero, warm people-centered imagery, refined filters, varied dance previews, and clear educational hierarchy.

## 4. Scope

Fidelity: production-ready redesign for the current static site.
Breadth: whole surface, including homepage, detail view, timeline, comparison, glossary, navigation, and footer.
Interactivity: shipped-quality vanilla JavaScript using current hash routing and JSON data.
Time intent: polish enough for GitHub Pages publication and future iteration.

## 5. Layout Strategy

The homepage starts with a dominant welcome screen: brand, tagline, strong headline, short mission, two clear actions, and a warm hero graphic. The dance library becomes a more editorial archive: filters remain practical, but cards are less generic, with origin, era, family, and short descriptions surfaced clearly.

The timeline view gains a map/lineage explanation showing Angola, Haiti, Portugal/Europe, France, and diaspora routes for massemba, semba, kizomba, urban kizz, tarraxo, and kompa. Detail pages should feel like focused cultural notes rather than plain records.

## 6. Key States

- Default: hero, filters, all dance cards, navigation, footer.
- Loading: visible but calm loading state while JSON loads.
- Empty search: helpful no-results message with clear reset action.
- Data error: inline error instead of disruptive alert where practical.
- Detail route missing: return to home gracefully.
- Comparison empty: guided prompt until two dances are selected.
- Responsive: mobile uses one-column flow, large touch targets, stable text wrapping.
- Reduced motion: motion is minimized.

## 7. Interaction Model

Navigation remains hash-based. Cards are clickable and keyboard accessible. Filters update results immediately. The map module is explanatory first, not a complex GIS tool. Hover and focus states should feel tactile: slight lift, color shift, and clear outlines without layout jump.

## 8. Content Requirements

Use brand name **AfroPasso** everywhere. Use tagline **z pasji do tańców afrykańskich**. Main hero headline: **Tańce, które łączą ludzi i historie**.

Keep the current Polish educational content and JSON data. Update labels and page copy to feel more brand-led and less generic. Keep cultural specificity and source attribution visible.

## 9. Recommended References

- `reference/spatial-design.md`
- `reference/typography.md`
- `reference/color-and-contrast.md`
- `reference/responsive-design.md`
- `reference/motion-design.md`
- `reference/ux-writing.md`

## 10. Open Questions

Future iteration can decide whether AfroPasso expands into event listings, quizzes, newsletter, or a broader dance atlas. This redesign should not add backend features or a build step.
