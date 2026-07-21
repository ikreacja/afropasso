# Widok szczegółów eventu + karty jako hub — projekt

Data: 2026-07-21
Status: zatwierdzony do implementacji

## 1. Cel

Zamienić listę eventów na `#/events` z „tablicy linków wyprowadzających na zewnątrz"
w wewnętrzny hub: karty klikalne prowadzą do strony szczegółów eventu na AfroPasso,
z kompletem faktów, krótkim redakcyjnym opisem i linkami wewnętrznymi (style → karty
tańców, podobne wydarzenia). Cel produktowy: **ludzie zostają na AfroPasso** zamiast
od razu przechodzić do serwisów zewnętrznych — AfroPasso jako informator o wydarzeniach
tanecznych, przynajmniej dla Polski.

Poziom bogactwa: **fakty + kontekst redakcyjny** (świadomie NIE pełna agregacja cudzych
treści — patrz §8). Fakty nie podlegają prawom autorskim; opis piszemy własny; do
źródła linkujemy. Zero kopiowania plakatów/opisów organizatorów.

## 2. Architektura + routing

- Nowa sekcja `#event-detail-view` w `index.html`, wzorowana na istniejącej
  `#dance-view`.
- Nowa funkcja `showEventDetail(id)` w `app.js`, wzorowana na `showDanceDetail(slug)`:
  znajduje event w `eventsData` po `id`, renderuje do `#event-detail-view`.
- `handleRoute()` dostaje nowy przypadek `event` (route `#/event/<id>`), analogicznie do
  `dance`. Wstecz/naprzód i linki-kotwice działają przez `hashchange` (jak reszta routera).
- `elements.views.eventDetail = document.getElementById('event-detail-view')` w
  `initializeElements()`.

## 3. Model danych

Jedno nowe, opcjonalne pole eventu: **`summary_pl`** — redakcyjny opis (1–3 zdania,
styl: krótko, konkretnie, bez marketingowej waty; spójny z DESIGN.md). Wszystkie inne
dane już istnieją: `title`, `type`, `styles`, `city`, `venue`, `date_start`, `date_end`,
`time`, `price`, `url`, `organizer`, `image`, `confidence`.

Link do map budujemy w locie z `venue` + `city`
(`https://www.google.com/maps/search/?api=1&query=<venue>,<city>` — enkodowane), bez
nowych pól i bez embedu.

## 4. Strona szczegółów — układ

```
┌────────────────────────────────────────────┐
│ [cover WebP lub markowy fallback]          │
│  Festiwal · 19–23.11.2026 · Warszawa       │
│  Paris Kizomba Congress                    │
├────────────────────────────────────────────┤
│  📅 19–23.11  🕘 20:00   💶 od 70€          │
│  📍 Hilton Paris CDG  ·  otwórz w mapach ↗ │
│  Style: [Kizomba] [Urban-kizz]             │  ← chipy → #/dance/<slug>
│  Organizator: Paris Kizomba Congress       │
├────────────────────────────────────────────┤
│  O wydarzeniu                              │
│  <summary_pl>                              │  ← blok pomijany, gdy brak summary_pl
│                                            │
│  [ Kup bilet / Zapisz się ↗ ]  (event.url) │
│  ⚠ Termin do potwierdzenia                 │  ← tylko gdy confidence === "single-source"
├────────────────────────────────────────────┤
│  Podobne wydarzenia                        │
│  [kafel] [kafel] [kafel]                   │  ← §6
│  ← Wróć do wydarzeń                         │
└────────────────────────────────────────────┘
```

Zasady renderowania:
- Cover: `event.image` jako tło z brand-scrim (reużyj wzorca `.featured-event-tile`);
  brak grafiki → markowy fallback typograficzny.
- Bloki opcjonalne (`time`, `price`, `venue`, `summary_pl`) pomijane, gdy puste
  (wzorzec jak `eventRowHTML`/`showDanceDetail`).
- Cała treść przez `escapeHTML`/`escapeAttribute` (jak reszta renderów).
- CTA otwiera `event.url` w nowej karcie (`target="_blank" rel="noopener"`).
- Ostrzeżenie „Termin do potwierdzenia" tylko dla `confidence === "single-source"`.

## 5. Interakcje kart

- **Wiersze listy** (`eventRowHTML` → `.event-row`) i **kafle wyróżnione**
  (`renderFeaturedEvents` → `.featured-event-tile`): cały element prowadzi do
  `#/event/<id>` (wewnętrznie), zamiast dotychczasowego zewnętrznego linku „Szczegóły".
  Zewnętrzny link do zapisów przenosi się na stronę szczegółów (CTA).
- Element klikalny jako `<a href="#/event/<id>">` (naturalna dostępność + działa z
  routerem `hashchange`), z widocznym stanem focus.
- Hover: subtelny lift + cień + płynne przejście (spójne z kartami tańców). Reduced-motion:
  bez ruchu, sam cień/kontur.
- WCAG AA: fokusowalne, obsługa klawiatury (Enter), czytelny kontrast.

## 6. Linki wewnętrzne (mechanika hubu)

- **Chipy stylów** → `#/dance/<slug>` (slug z `event.styles`, nazwa PL z `dancesData`).
- **Podobne wydarzenia**: z `getUpcomingEvents()`, ten sam styl (część wspólna
  `styles`) **lub** to samo `city`, z wykluczeniem bieżącego `id`, posortowane po dacie,
  max 3. Renderowane tym samym szablonem co kafle/wiersze (reużycie).

## 7. Pipeline + skill researchu

- `summary_pl` dodane do „Candidate shape" (opcjonalne) i przenoszone przez
  `candidateToEvent()` w `tools/promote-candidate.js` (jak inne opcjonalne pola).
- `tools/promote-candidate.js`: `--list`/promocja bez zmian logiki; tylko przenosi pole.
- `event-research` SKILL.md: instrukcja, że agent pisze `summary_pl` w stylu użytkownika
  (krótko, konkretnie, bez marketingu) podczas researchu; człowiek poprawia przy promocji.
- `validateEvent` (w `add-event.js`): `summary_pl` opcjonalne, brak walidacji treści.

## 8. Poza zakresem (świadomie)

- Scrapowanie pełnych opisów / plakatów / lineupów / galerii ze źródeł (prawa autorskie
  + nakład utrzymania). Prezentujemy fakty + własny opis + link do źródła.
- Embed map (zewnętrzna zależność + prywatność) — tylko link „otwórz w mapach".
- Monetyzacja „płatne wyróżnienie" — osobna, wcześniej ustalona przyszła spec; `featured`
  zostaje redakcyjne.

## 9. Testowanie / weryfikacja

- `node --check app.js`; walidacja `data/events.json`.
- `node --test tools/promote-candidate.test.js` (po dodaniu przenoszenia `summary_pl` —
  rozszerzyć test `candidateToEvent`).
- Serw lokalny na 8123, sprawdzić: `#/event/<id>` renderuje się dla realnego eventu
  (np. `paris-kizomba-congress-2026-11-19`), karty klikają się do szczegółów, hover/focus
  działają, chipy stylów i „podobne wydarzenia" linkują poprawnie, desktop + mobile,
  reduced-motion.

## 10. Podsumowanie artefaktów

Zmieniane:
- `index.html` — nowa sekcja `#event-detail-view`.
- `app.js` — `showEventDetail()`, case `event` w routerze, `elements.views.eventDetail`,
  karty (`eventRowHTML`, `renderFeaturedEvents`) klikalne do `#/event/<id>`, szablon
  „podobnych wydarzeń".
- `styles.css` — układ strony szczegółów eventu, hover/cień kart, chipy stylów.
- `data/events.json` — opcjonalne `summary_pl` na eventach (dopisywane sukcesywnie).
- `tools/promote-candidate.js` (+ test) — przeniesienie `summary_pl`.
- `.claude/skills/event-research/SKILL.md` — draftowanie `summary_pl`.
