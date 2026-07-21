# Pole `country` + filtr kraju — projekt

Data: 2026-07-22
Status: zatwierdzony do implementacji

## Cel

Dodać do eventów pole `country` (kraj) — zapisywane, walidowane i **wyszukiwalne**,
bo po kraju szuka się najczęściej. Nowy filtr „Kraj" na stronie wydarzeń obok
istniejących (Miasto/Styl/Typ). Uzupełnić 5 opublikowanych eventów.

## Decyzje

- **Reprezentacja**: polska nazwa kraju jako string — `"Polska"`, `"Francja"`,
  `"Portugalia"` (spójne z `city`, który też jest zwykłym stringiem).
- **Filtr**: nowy `<select id="event-country-filter">` **jako pierwszy** (przed
  „Miasto"). Opcje z nadchodzących eventów, łączony AND z pozostałymi — dokładnie
  wzorzec `city`/`style`/`type`.
- **Wyświetlanie**: kraj tylko w **filtrze** i na **stronie szczegółów** (kicker +
  linia 📍 jako „miasto, Kraj"). Karty listy zostają zwięzłe (samo miasto).
- **Walidacja**: `country` **opcjonalne** w `validateEvent` (nie psuć istniejących),
  ale pipeline/skill zawsze je wypełnia.

## Zmiany

- `data/events.json` — dodać `country` do 5 eventów: VAMOS → Polska, elSol → Polska,
  Paris → Francja, Nantes → Francja, Tukina → Portugalia.
- `index.html` — nowa `.filter-group` z selectem `event-country-filter` (label „Kraj")
  przed grupą „Miasto".
- `app.js`:
  - `elements.events.countryFilter = document.getElementById('event-country-filter')`
  - listener `change → handleEventFilters`
  - `handleEventFilters` — czyta `country`, dodaje `(!country || event.country === country)`
  - `populateEventFilterOptions` — generuje opcje krajów z `getUpcomingEvents()`, zachowuje wybór
  - `clearEventFilters` — zeruje `country`
  - `renderEventsList` „hasFilters" — uwzględnia `country`
  - `showEventDetail` — kicker i linia 📍 pokazują „miasto, Kraj" gdy `country` obecne
- `tools/promote-candidate.js` (+test) — `candidateToEvent` przenosi `country`.
- `tools/add-event.js` — pyta o kraj (opcjonalne pole).
- `.claude/skills/event-research/SKILL.md` — `country` w „Candidate shape" + optional fields.

## Poza zakresem

Kraj na kartach listy (świadomie — zwięzłość), kaskadowe filtrowanie miast po kraju
(v1: filtry niezależne, AND), migracja `city`→struktura z krajem (zostają osobne stringi).

## Weryfikacja

`node --check app.js`; walidacja `data/events.json`; `node --test tools/promote-candidate.test.js`
(rozszerzyć `candidateToEvent` o `country`); ręcznie: filtr „Kraj" na `#/events` zawęża listę,
strona szczegółów pokazuje „miasto, Kraj".
