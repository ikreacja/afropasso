# Trójmiasto Classes Hub — Implementation Plan (feature C)

> Execute inline / subagents. Verify with `node --check app.js` + JSON validation + manual browser.

**Goal:** Weekly recurring class timetable for Trójmiasto dance schools on `#/events`.

**Spec:** `docs/superpowers/specs/2026-07-22-trojmiasto-classes-hub-design.md`

## C1 — app.js: renderWeeklySchedule
- Add `const WEEKDAYS_PL = ['', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];` near the event constants.
- Replace `function renderSchools()` (L1810) with `renderWeeklySchedule()`: flatten `schoolsData` classes → group by `day` 1–7 → sort by `time` → render day sections + class rows (`time · styles PL · level · school (place) → zapisy`) + a schools legend. Empty state preserved.
- Update the call in `renderEventsPage` (`renderSchools()` → `renderWeeklySchedule()`).

## C2 — index.html: section heading
Change `#schools-title` text to "Zajęcia w Trójmieście" (kicker "Regularne zajęcia" stays).

## C3 — styles.css: timetable styles
Add `.schedule-day`, `.schedule-day-name`, `.schedule-list`, `.schedule-item` (flex: time · body · link), `.schedule-time`, `.schedule-style`, `.schedule-level`, `.schedule-school`, `.schedule-link`, `.schools-legend`. On-brand, responsive.

## C4 — seed schools.json (research)
Research the 5 school sites (sosalsa.pl, danceatelier.pl, Akademia P. Rompczyk, Energy Club Gdynia, Rytm Sopot) for kizomba/afro class schedules. Seed `data/schools.json` with school metadata + `classes`. Note: autumn 2026 grafik may be unpublished in July — seed what's verifiable, mark gaps for later. Human reviews the diff.

## C5 — class-schedule skill
Create `.claude/skills/class-schedule/SKILL.md` via writing-skills: gather kizomba/afro class schedules from Trójmiasto school sites (public HTML), 1 official source suffices, filter to relevant styles, write `schools.json`, human reviews diff. Refresh per semester.

## Verify
`node --check app.js`; validate `data/schools.json`; manual `#/events`: timetable groups by day, sorts by time, school links work, empty state when no data.
