---
name: class-schedule
description: Use when gathering or updating regular weekly dance-class schedules for the AfroPasso "Zajęcia w Trójmieście" hub — kizomba/semba/urban-kiz/afro classes at local schools (so!salsa, Dance Atelier, Energy Club, etc.) into data/schools.json. Triggers on "dodaj zajęcia", "grafik szkół", "zaktualizuj zajęcia w Trójmieście", start-of-semester schedule refresh.
---

# Class Schedule Gathering for AfroPasso

## Overview

Gather **regular weekly classes** (recurring, day-of-week — NOT dated events) from dance
schools into `data/schools.json`, rendered as a weekly timetable on `#/events`. Schedules
are **facts** (day/time/style/level) — not copyrightable; link to the school for sign-up.

This is a sibling of [[event-research]] but for recurring classes, not one-off events.

## Data model — `data/schools.json`

```json
{
  "id": "sosalsa",
  "name": "so!salsa",
  "city": "Gdańsk",
  "url": "https://sosalsa.pl/...",
  "styles": ["kizomba", "urban-kizz"],
  "classes": [
    { "styles": ["kizomba"], "day": 2, "time": "20:00", "level": "początkujący", "location": "Gdańsk" },
    { "styles": ["kizomba"], "day": 2, "time": "21:00", "level": "otwarte", "type": "practice", "location": "Gdańsk" }
  ]
}
```

- `day` — 1–7 (poniedziałek–niedziela). `time` — "HH:MM". `location` — optional (defaults to `school.city`).
- `level` — `początkujący` / `średniozaawansowany` / `zaawansowany` / `otwarte`.
- `type` — optional; omit for a normal class, set `"practice"` for a practice/praktis session. Practices are **separately filterable** on the hub (someone may want only the practice, not the lesson), so always tag them — do not merge a practice into the preceding class.
- `instructor` — optional; the person leading the class, shown in the grid card. Populate it when you actually have the **name** (schools often expose only an opaque instructor ID — e.g. so!salsa's idancesoft cells carry `ins_info` numbers, not names — so leave it out rather than storing an ID). Add names when the human provides them.
- `styles` — slugs from `data/dances.json`.

The hub renders these as a **calendar grid** (hours down the rows, days across the columns): the full week on desktop with empty slots shown as gaps, and only the days that actually have classes as columns on narrow screens.

## Normalize style spelling → canonical slug

Schools write the same style many ways — **Urban Kiz / UrbanKiz / Urban Kizz / Urban Kiss / urbankizz**, sometimes even misspelled by the school itself (e.g. Dance Atelier's Fitssey says "UrbanKiz"). Always map the messy source text to the **canonical `data/dances.json` slug** (`urban-kizz`), never store the school's spelling. Do the same for other families: `Kizomba Fusion` → `kizomba-fusion`, `Semba`/`Massemba`, `Tarraxo`/`Tarraxinha`, `Kompa`/`Konpa`, `Kuduro`. Match case-insensitively and ignore spaces/hyphens when detecting the style — treat `urban kiz`, `UrbanKiz`, `Urban-Kizz`, `urban kiss` as the same style. When a class name pairs two styles (`Kizomba/Urban Kiz P1`), record both slugs in `styles`.

## The loop

Primary mechanism: **find and fetch each school's live, published grafik online.** Manual/paste entry is a last resort, never the default.

1. **Locate the grafik** — start at the school's "Grafik"/"Zapisy" page; it often 301-redirects to a scheduler host (follow the redirect).
2. **Fetch it with the right technique** (see below — most schedules ARE reachable).
3. **Extract only kizomba-family / afro** classes (kizomba, semba, urban-kiz, tarraxo, kompa, kuduro, afro). Skip salsa / bachata / zouk / fitness — this is an African-dance guide.
4. Convert each to `{styles, day, time, level, location}` (`day` 1–7). The school's own page is authoritative — **1 official source suffices**.
5. Write/update `data/schools.json`. **The human reviews the `git diff` and commits** — git is the approval gate.
6. Report per school: classes found, and which fallback (if any) you used.

## Fetching schedules — what actually works

- **efitness calendars** (`*.cms.efitness.com.pl/kalendarz-zajec`): append an **in-semester date** — `?day=YYYY-MM-DD` (e.g. a mid-September date). The page then **server-renders that week** → fetchable. Without the param it's an empty shell. (This is how Energy Club's kizomba class was found.)
- **Season / "nabory" articles** (e.g. `.../nowe-jesienne-nabory...`): schools announce new-term courses with day + time **in prose** — fetchable, and often the earliest source. (This is how so!salsa's class was found.)
- **Follow redirects**: `/grafik/` frequently 301s to a scheduler host (fitssey, efitness) — re-fetch the target URL.
- **idancesoft embed** (so!salsa `sosalsa.pl/grafik,4,pl`): the page itself is a shell, but it loads the grafik from `idancesoft.com`. In the page HTML find the call `make_module('schedule_lessons', <PARTNER>, ...)` (so!salsa's `<PARTNER>` is `126266`), then fetch the iframe directly — it **server-renders one day** and is fully parseable:
  `https://idancesoft.com/embed?m=schedule_lessons&partner=<PARTNER>&mon=<MM>&rok=<YYYY>&day=<DD>&lok=<LOK>` (so!salsa `lok=689`). `day` is **day-of-month**, so loop the 7 dates of one in-term week to get the whole timetable. Each occupied cell is a `<td class='event_click …'>` carrying hidden `time_info`/`day_info`/`mon_info` inputs plus the weekday word and course name — parse those; skip the filter-checkbox legend (`id='course_…'`). This is a real fetch, not a fallback — so!salsa is **not** an SPA case.
- **Search-indexed FB/IG** course announcements — day/time often show in the snippet.

## When the grafik is a pure-JS SPA (not in the HTML)

Some schedulers render only via JavaScript — **Fitssey `app.fitssey.com/<studio>/frontoffice`** (Dance Atelier, Rytm Dance Studio) is the main one — so WebFetch sees an empty page. Do **not** fabricate times. In order:
1. Use the school's **season/nabory article** or **FB/IG announcement** for the same term.
2. Ask the human to paste the specific class times (they follow the local scene).
3. If it becomes routine, a small **headless-browser curator tool** could render these — opt-in, since it adds a dependency to `tools/` (the served site stays dependency-free).

Seed such a school's metadata with `classes: []` until real times arrive — never invent them to fill the grid.

## Confirm the school actually teaches these styles

Before adding a school, verify its site lists kizomba/afro — not just salsa/bachata. If unconfirmed, ask the human rather than assuming. (During the first pass, Akademia Rompczyk and Rytm Sopot showed only bachata/salsa. Since confirmed: **Rytm Dance Studio (Sopot)** does run a Thursday kizomba class 20:00 + practice 21:00 — its Fitssey grafik is an SPA, so those times came human-verified. **Akademia Rompczyk** still has no kizomba-family classes — do not add it.)

## Common mistakes

- **Fabricating class times** because the grafik was behind a JS scheduler → seed `classes: []` and ask instead.
- **Including salsa/bachata classes** → filter to kizomba-family/afro only.
- **Using specific dates** → classes are weekly-recurring; use `day` 1–7, never a date.
- **Listing a school that doesn't teach kizomba** → confirm the style first.
- **Writing without review** → the human reviews the diff and commits; never push schedule data unreviewed.

## Refresh

Re-run at the **start of each semester** (roughly September and February) when schools publish new grafik.
