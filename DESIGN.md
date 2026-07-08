---
name: AfroPasso
description: Z pasji do tańców afrykańskich
colors:
  warm-paper: "#fbf5ea"
  soft-sand: "#f3dfbf"
  clay-red: "#b9472f"
  ember-red: "#8f2f24"
  ochre: "#d49a2a"
  palm-green: "#496b46"
  ink-brown: "#251a14"
  muted-brown: "#6f5a49"
  line-sand: "#dfc7a4"
typography:
  display:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "clamp(3.35rem, 7.2vw, 7.1rem)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 4rem)"
    fontWeight: 500
    lineHeight: 1.05
  body:
    fontFamily: "Avenir, Avenir Next, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: "4px"
  md: "8px"
  lg: "14px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
  xl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.clay-red}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.md}"
    padding: "14px 22px"
  chip:
    backgroundColor: "{colors.soft-sand}"
    textColor: "{colors.ink-brown}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
---

# Design System: AfroPasso

## 1. Overview

**Creative North Star: "The Warm Dance Atlas"**

AfroPasso should feel like a contemporary cultural guide: tactile, rhythmic, readable, and welcoming. The winning direction is visual probe #1, centered on the line "Tańce, które łączą ludzi i historie": a warm hero, human movement, refined serif typography, photographic dance tiles, and enough structure to make learning easy.

The system rejects template-like card grids, heavy nightclub visuals, and decorative cultural patterning without meaning. It should feel designed, but never distant from the dance community.

**Key Characteristics:**
- Warm documentary tone with strong educational structure.
- Light, elegant serif hero typography paired with calm body text.
- Clay, ochre, palm, warm paper, and brown as the core palette.
- Maps, timelines, and lineage modules as signature educational graphics.
- Wide flagship layout with a max content width around 1720px on large screens.
- Subtle ornamental background motif, never a technical grid overlay.

## 2. Colors

The palette is sunlit, earthy, and cultural without becoming dusty or beige.

### Primary
- **Clay Red** (`#b9472f`): primary action color, active navigation, important rhythm markers.
- **Ember Red** (`#8f2f24`): depth state for buttons, footer accents, dark warm surfaces.

### Secondary
- **Ochre** (`#d49a2a`): highlight color for lineage, origin markers, and educational emphasis.
- **Palm Green** (`#496b46`): balancing color for map routes, secondary chips, and calmer sections.

### Neutral
- **Warm Paper** (`#fbf5ea`): main page background.
- **Soft Sand** (`#f3dfbf`): panels, filters, map surface, secondary backgrounds.
- **Ink Brown** (`#251a14`): primary text, never pure black.
- **Muted Brown** (`#6f5a49`): secondary text.
- **Line Sand** (`#dfc7a4`): borders and dividers.

### Named Rules

**The Warmth Rule.** Neutrals must stay tinted. Do not use pure black or pure white.

**The Culture Is Not Decoration Rule.** Patterns and map marks must explain rhythm, place, or lineage, not just fill empty space.

**The No Draft Grid Rule.** Do not ship technical alignment grids as background decoration. Use soft ornamental motifs inspired by the brand direction instead.

## 3. Typography

**Display Font:** system serif stack, using `Iowan Old Style`, `Palatino Linotype`, `Palatino`, `Georgia`, serif
**Body Font:** system humanist sans stack, using `Avenir`, `Avenir Next`, `Segoe UI`, system-ui, sans-serif

**Character:** The type should feel close to the approved concept: elegant, lighter, editorial, and highly readable rather than heavy or blocky.

### Hierarchy
- **Display** (500, `clamp(3.35rem, 7.2vw, 7.1rem)`, 1.04): hero and major brand moments.
- **Headline** (500, `clamp(2rem, 4vw, 4rem)`, 1.05): section openers.
- **Title** (500, `1.25rem` to `1.75rem`, 1.15): dance names and card titles.
- **Body** (400, `1rem`, 1.65): descriptions, source notes, timeline copy. Keep long lines under 75ch.
- **Label** (700, `0.78rem`, 0.08em): short metadata, filters, eras, and map labels.

### Named Rules

**The Plain Polish Rule.** Educational copy should be direct and natural. Avoid inflated marketing language.

## 4. Elevation

AfroPasso uses tonal layering first and soft shadows second. Surfaces should feel like paper, posters, and field notes, not floating SaaS panels.

### Shadow Vocabulary
- **Soft Lift** (`0 20px 50px rgba(64, 35, 18, 0.12)`): large hero media, featured panels, active cards.
- **Pressed Paper** (`0 8px 24px rgba(64, 35, 18, 0.08)`): compact interactive cards.

### Named Rules

**The No Floating Dashboard Rule.** Shadows should support touch and depth, not make every section hover.

## 5. Components

### Buttons
- **Shape:** rounded rectangular, confident but not pill-like (`12px`).
- **Primary:** clay red background, warm paper text, compact padding.
- **Hover / Focus:** darker ember state, slight translate, visible outline.
- **Secondary:** warm transparent surface with ink text and sand border.

### Chips
- **Style:** small tactile labels with sand, ochre, or palm tones.
- **State:** selected filters should feel pressed and obvious.

### Cards / Containers
- **Corner Style:** medium to large radius depending on scale.
- **Background:** warm paper or sand, with full borders instead of colored side stripes.
- **Shadow Strategy:** soft lift only for hover or featured surfaces.
- **Internal Padding:** varied, not uniform across every section.

### Inputs / Fields
- **Style:** warm paper fields with sand borders and clear labels.
- **Focus:** clay outline and subtle warm glow.
- **Empty / Error:** messages should be plain, helpful, and visible without alerts.

### Navigation
- **Style:** transparent or warm paper navigation over the hero, with clear active states.
- **Behavior:** sticky navigation is acceptable, but it should feel light and editorial.

## 6. Do's and Don'ts

Do lead with people, rhythm, and history. Do make maps and timelines visually memorable. Do keep filters and comparison tools practical.

Do not use gradient text, glassmorphism, side-stripe card accents, generic icon grids, pure black, pure white, or decorative cultural motifs that do not carry meaning.
