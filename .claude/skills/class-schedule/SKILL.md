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
    { "styles": ["kizomba"], "day": 2, "time": "20:00", "level": "początkujący", "location": "Gdańsk" }
  ]
}
```

- `day` — 1–7 (poniedziałek–niedziela). `time` — "HH:MM". `location` — optional (defaults to `school.city`).
- `level` — `początkujący` / `średniozaawansowany` / `zaawansowany` / `otwarte`.
- `styles` — slugs from `data/dances.json`.

## The loop

1. For each school, open its **official site's grafik/schedule page** (public HTML). The school's own page is authoritative — **1 official source suffices** (lighter than event verification).
2. Extract only **kizomba-family / afro** classes (kizomba, semba, urban-kiz, tarraxo, kompa, kuduro, afro). **Skip salsa / bachata / zouk / fitness** — this is an African-dance guide.
3. Convert each class to a `{styles, day, time, level, location}` entry.
4. Write/update `data/schools.json`. **The human reviews the `git diff` and commits** — git is the approval gate.
5. Report per school: how many classes found, which schools had no fetchable/published schedule.

## When the schedule isn't fetchable

Common and expected — do NOT fabricate times:
- **JS schedulers** (efitness, online grafik widgets) don't render for WebFetch → data isn't in the HTML.
- **Summer / between semesters** → autumn schedule not published yet.
- **Only on Facebook/Instagram** → not fetchable.

In all these cases: seed the school's **metadata with `classes: []`**, note it, and **ask the human** for the day/times (they know the local scene) or wait until the school publishes. Never invent a class time to fill the grid.

## Confirm the school actually teaches these styles

Before adding a school, verify its site lists kizomba/afro — not just salsa/bachata. If unconfirmed, ask the human rather than assuming. (During the first pass, Akademia Rompczyk and Rytm Sopot showed only bachata/salsa — don't list them as kizomba schools without confirmation.)

## Common mistakes

- **Fabricating class times** because the grafik was behind a JS scheduler → seed `classes: []` and ask instead.
- **Including salsa/bachata classes** → filter to kizomba-family/afro only.
- **Using specific dates** → classes are weekly-recurring; use `day` 1–7, never a date.
- **Listing a school that doesn't teach kizomba** → confirm the style first.
- **Writing without review** → the human reviews the diff and commits; never push schedule data unreviewed.

## Refresh

Re-run at the **start of each semester** (roughly September and February) when schools publish new grafik.
