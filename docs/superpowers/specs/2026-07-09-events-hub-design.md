# AfroPasso Events Hub Design

## 1. Vision and Problem

AfroPasso today is a read-once guide: a visitor reads about the dances and leaves. The goal is retention and community: AfroPasso becomes the information hub for Afro / Afro-diasporic dance life in Poland. The niche scene coordinates through Facebook, where events routinely get lost and are hard to discover. AfroPasso solves discovery: a curated, always-current index of events that links back to the original sources.

Success means dancers return weekly ("what's happening this weekend?"), subscribe to the calendar or newsletter, and organizers submit events themselves because being listed matters.

## 2. Decisions Made (with user)

- **Sourcing model:** curator + submissions. The site owner (and trusted helpers) add events semi-automatically; organizers submit via an external form with moderation. No unsupervised crawling.
- **Infrastructure:** fully static (GitHub Pages). Event data lives in JSON in the repo, updated via commits. No backend, no accounts.
- **Event types:** socials/potańcówki, workshops/bootcamps, festivals (Poland + key foreign ones Polish dancers attend), and recurring courses — the last as a separate directory format, not dated events.
- **Events page layout:** hybrid — 2–3 large featured photo tiles on top (festivals/specials), compact chronological list grouped by month below. `featured` is a paid-promotion slot in the future monetization model; standard entries get list placement only.
- **Retention mechanics (later phases):** ICS calendar subscription, weekly newsletter, city/style filters with localStorage memory and favorites, organizer profiles.

## 3. Constraints and Honest Limits

- Facebook's Events API is closed to new apps and scraping violates FB ToS. The legal, stable path is reading the public link-preview metadata (Open Graph tags) of a public event URL — which yields title, image, and description, but often not structured dates or venue. The curator tool therefore fetches what it can and interactively asks for the rest.
- "Searching Google" for events is out of scope for now. With curator + submissions at niche scale, a watched list of known sources (school pages, portals) can be added in Phase 2+ if needed.
- Everything must stay deployable from the repo root on GitHub Pages with relative paths (per AGENTS.md).

## 4. Roadmap

Three phases, each independently shippable, each with its own implementation plan:

- **Phase 1 — Events hub (MVP):** events page, events data, curator import tool, submission form link, recurring-courses directory.
- **Phase 2 — Distribution and automation:** ICS feed + calendar subscription, per-event "add to calendar", newsletter with generated weekly digest draft, automatic archiving of past events via GitHub Actions.
- **Phase 3 — Community and monetization:** organizer profiles, localStorage personalization (city, favorites), paid featured slots.

Prerequisite: the approved "Wszystkie tańce" library page (spec 2026-07-09-wszystkie-tance-library-page-design.md) ships first — the events page reuses its filter-bar pattern.

## 5. Phase 1 in Detail

### 5.1 Events page (`#/events`)

New SPA view and nav item **Wydarzenia** in the existing hash router.

- **Filter bar:** miasto · styl tańca · typ wydarzenia selects + "Wyczyść" + live result counter, following the library page's filter mechanism. City and style options are derived from the loaded data, not hardcoded.
- **Featured section:** events with `featured: true` and a future date render as large photo tiles (reusing the featured-tile visual language), max 3, soonest first.
- **List section:** all future events (including featured ones) in chronological order, grouped under month headings ("Lipiec 2026"). Each row: date block (day number + weekday, or range for multi-day), title, city, type, styles, time, price if known, and an outbound link to the source (usually the Facebook event).
- Past events are excluded client-side by comparing `date_end ?? date_start` with today.
- Empty state: "Nie znamy nadchodzących wydarzeń. Zgłoś swoje!" with the submission link.
- A "Zgłoś wydarzenie" button links to the external form.

### 5.2 Data: `data/events.json`

Same pattern as `dances.json` — canonical JSON in the repo. Entry fields:

- `id` (slug), `title`
- `type`: `social` | `warsztaty` | `festiwal`
- `styles[]`: dance slugs matching `dances.json` (links events to the dance library)
- `city`, `venue` (optional free text)
- `date_start` (ISO `YYYY-MM-DD`), `date_end` (optional, for multi-day), `time` (optional, free text like "21:00")
- `price` (optional free text), `url` (source link, usually FB event), `image` (optional, relative path under `assets/events/`)
- `featured` (boolean), `organizer` (free text), `source`: `fb` | `zgloszenie` | `kurator`

Validation lives in the curator tool, not the site; the site renders defensively (missing optional fields simply don't render).

### 5.3 Recurring courses: `data/schools.json` + "Gdzie tańczyć regularnie"

A separate section (on the events page, below the list) rendered from `schools.json`: school/organizer name, city, styles, weekday(s), and a signup link. No dates — updated per semester. Kept out of `events.json` because the lifecycle differs.

### 5.4 Curator tool: `tools/add-event.js`

Local Node script, run as `node tools/add-event.js <url>`:

1. Fetches the URL and parses Open Graph/meta tags (title, image, description) — works for public FB events and most other event pages.
2. Interactively prompts for every remaining field (dates, city, type, styles, price…), pre-filling anything it could parse.
3. Downloads the image to `assets/events/<id>.<ext>` when available and consented.
4. Validates the entry (required fields, date format, style slugs exist in `dances.json`, unique id) and appends it to `data/events.json`, keeping the file sorted by `date_start`.

No dependencies beyond Node built-ins (fetch, readline). Publishing stays git-native: review the diff, commit, push.

### 5.5 Submissions

External Google Form (owner already lives in the Google ecosystem; switchable later without code changes since it is just a link) asking for the same fields as the data model plus contact. The site links to it; the curator reviews responses and imports with the same tool (manual copy or `--from-answers` prompts). No automation in Phase 1.

## 6. Phase 2 in Detail (summary level)

- **ICS feed:** a GitHub Action regenerates `afropasso.ics` from `events.json` on every push; the events page offers "Subskrybuj kalendarz AfroPasso". Per-event "Dodaj do kalendarza" generates a single-event ICS client-side.
- **Archiving:** the same Action moves past events to `data/events-archive.json` monthly.
- **Newsletter:** external service (e.g., Buttondown) signup embedded on the site; `tools/digest.js` renders the upcoming-events digest draft from JSON for manual editing and sending.

## 7. Phase 3 in Detail (summary level)

- **Organizer profiles:** `data/organizers.json`, profile route with the organizer's upcoming events; event entries gain `organizer_id`.
- **Personalization:** remembered city filter and starred events in localStorage.
- **Monetization:** `featured` slots sold to organizers (pinned tile with graphic); process is manual (curator sets the flag), no payment infrastructure on the site.

## 8. Error Handling

- Missing/invalid `events.json`: events page shows the existing global data-load error pattern; the rest of the site is unaffected (separate fetch from `dances.json`).
- Events with malformed dates are skipped at render with a console warning (curator tool prevents them at entry).
- OG fetch failures in the tool degrade to fully manual entry prompts.

## 9. Testing

- Curator tool: Node test run against fixture HTML (OG parsing), validation rejection cases (bad date, unknown style slug, duplicate id).
- Site: Playwright — events page renders fixtures correctly (featured max 3, month grouping, past events hidden, filters and counter work, empty state), nav integration, no console errors, desktop + mobile screenshots.
- Standard repo checks: `node --check app.js`, JSON parse of all data files.

## 10. Out of Scope (explicit)

User accounts, comments/chat, automated FB scraping beyond public link metadata, general Google crawling, payment processing, admin web panel.
