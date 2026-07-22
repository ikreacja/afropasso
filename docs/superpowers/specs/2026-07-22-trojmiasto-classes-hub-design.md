# Hub stałych zajęć w Trójmieście — projekt (feature C)

Data: 2026-07-22
Status: zatwierdzony do implementacji

## Cel

Zamienić podstawowy katalog szkół na `#/events` w **tygodniowy grafik zbiorczy**
stałych zajęć kizomba/afro w Trójmieście — „co się dzieje lokalnie w ciągu
tygodnia". Zajęcia ze wszystkich szkół w jednym miejscu, pogrupowane po dniach.
To pokrywa lokalny content, którego eventowy research (FB-only) nie łapie.

Grafik jest **cykliczny** (dzień tygodnia, nie konkretne daty) — mniejsze utrzymanie
niż eventy jednorazowe.

## Model danych — `data/schools.json`

Rozbudowa istniejącej struktury (dziś: `name`, `city`, `schedule_pl`, `styles`,
`url`). Nowe: tablica `classes` na szkołę.

```json
{
    "schools": [
        {
            "id": "sosalsa",
            "name": "so!salsa",
            "city": "Gdańsk",
            "url": "https://sosalsa.pl",
            "styles": ["kizomba", "urban-kizz"],
            "classes": [
                { "styles": ["kizomba"], "day": 2, "time": "20:00", "level": "początkujący", "location": "Gdańsk" }
            ]
        }
    ]
}
```

- `day` — 1–7 (poniedziałek–niedziela), do sortowania/grupowania.
- `time` — start „HH:MM".
- `level` — `początkujący` / `średniozaawansowany` / `zaawansowany` / `otwarte`.
- `location` — opcjonalne (miasto/adres zajęć; domyślnie `school.city`).
- `styles` — slugi z `dances.json`.
- Pola `schedule_pl` (stary wolny tekst) już nie jest potrzebne w nowym renderze —
  zostaje opcjonalne/ignorowane.

## Prezentacja — `renderWeeklySchedule()` (zastępuje `renderSchools`)

Renderuje do istniejącego `#schools-container`:
1. Spłaszcza: `schoolsData.flatMap(s => (s.classes||[]).map(c => ({...c, schoolName: s.name, schoolUrl: s.url, place: c.location || s.city})))`.
2. Grupuje po `day` (1–7), sortuje w dniu po `time`.
3. Dla każdego dnia: nagłówek (polska nazwa dnia) + wiersze zajęć:
   `HH:MM · Style PL · poziom · Szkoła (miasto) → zapisy` (link do `schoolUrl`).
4. Pod grafikiem: zwięzła **legenda szkół** (nazwa + link).
5. Pusty stan (`schoolsData` pusty/null): dotychczasowy komunikat „Wkrótce dodamy…".

Stała `WEEKDAYS_PL = ['', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela']`
(1-indeks). Nazwy stylów przez `dancesData` (jak w reszcie). Cała treść przez
`escapeHTML`/`escapeAttribute`. Linki `target="_blank" rel="noopener"`.

## Sekcja `#/events`

`index.html` sekcja `.schools-section` (L341–347): kicker „Regularne zajęcia",
tytuł na **„Zajęcia w Trójmieście"**, `#schools-container` renderuje grafik.

## Skill `class-schedule` (osobny)

Nowy skill w `.claude/skills/class-schedule/` — zbiera grafiki zajęć kizomba/afro ze
**stron szkół** (publiczny HTML, np. `sosalsa.pl/grafik`, `danceatelier.pl`,
Akademia P. Rompczyk, Energy Club Gdynia, Rytm Sopot). Zasady:
- Grafik to **fakty** (dzień/godzina/styl/poziom) — nie podlega prawom autorskim;
  linkujemy do zapisów szkoły.
- Próg: **1 oficjalne źródło wystarcza** (własna strona szkoły z grafikiem).
- Filtruje do stylów kizomba-family/afro (pomija salsę/bachatę-nie-afro/inne).
- Zapisuje/aktualizuje `data/schools.json`; **człowiek przegląda `git diff` i commituje**
  (git = brama akceptacji). Odświeżenie co semestr.
- Tworzony wg dyscypliny `writing-skills` (baseline → skill → weryfikacja).

## Zakres v1

5 szkół: so!salsa, Dance Atelier, Akademia Tańca Pauliny Rompczyk, Energy Club
(Gdynia), Rytm (Sopot). Style kizomba-family + afro. Tylko Trójmiasto.

## Poza zakresem

Filtry grafiku (styl/miasto — ewentualnie później), konkretne daty, rezerwacje/płatności,
inne miasta, osobny widok w nawigacji, migracja pola `schedule_pl`.

## Weryfikacja

`node --check app.js`; walidacja `data/schools.json`; ręcznie na `#/events`: grafik
grupuje zajęcia po dniach, sortuje po godzinie, linki do szkół działają, pusty stan
gdy brak danych; desktop + mobile.
