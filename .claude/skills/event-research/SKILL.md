---
name: event-research
description: Use when researching and adding dance events (kizomba/semba/urban-kizz/tarraxo/kompa/kuduro family) to AfroPasso — finding upcoming socials, workshops, and festivals in Poland (especially Trójmiasto) and key European festivals, verifying them, and queueing them for publication. Triggers on "dodaj eventy", "zrób research eventów", "znajdź wydarzenia taneczne", recurring event-calendar updates.
---

# Event Research for AfroPasso

## Overview

Research dance events, verify them against multiple sources, and stage them for a human to publish. **You never write `data/events.json` directly** — you write candidates to `data/candidates.json`; a human runs `promote-candidate.js` to publish. Human-in-the-loop by design.

Full design: `docs/superpowers/specs/2026-07-21-event-research-pipeline-design.md`.

## The loop

```
read sources → two research passes → verify (2 sources + live link) → write candidates.json → report → [human promotes]
```

1. **Read the source registry first** — `tools/research-sources.json`. It lists where to look, tagged `access` (`agent` = public HTML you can read via WebSearch/WebFetch; `human` = FB/IG/OnlyDance, only reachable via paste-link) and `role` (discovery/verify).
2. **Two passes, always both:**
   - **Festival sweep** — aggregators (Latin Dance Calendar, Placetodance, Danceplace, kizomba-world, where-to-dance, kizombakatxupa) for key PL + European festivals in the target window.
   - **Near-term local sweep** — the next ~30–45 days in the target city (Trójmiasto is home base; also Warszawa, Wrocław, Kraków…), via `wydarzeniataneczne.pl` plus that city's local calendar (`trojmiasto.pl/imprezy` for Trójmiasto). If the target city has no local source in the registry, find one and **add it to `tools/research-sources.json`**. **Skipping this pass misses local events** (that is how VAMOS was missed on the first run).
3. **Verify each candidate** — see below.
4. **Dedup** against existing `data/events.json` AND `data/candidates.json` (same date + city + normalized title = duplicate).
5. **Write to `data/candidates.json`** with `sources[]`, `status`, `notes`. Never touch `events.json`.
6. **Report**: how many ready, how many need a second source, how many need a human paste-link.

## Verification (non-blocking confidence, not a gate)

One source can be enough — it just ships flagged "to confirm". Confidence resolves at promotion when the link is checked live.

| confidence | condition |
|---|---|
| `verified` | ≥2 **independent** sources agree on date + city, live link |
| `single-source` | 1 credible source, live link — publishable, flagged |
| `unverified` | dead link or sources conflict — fix first |

- **Independent** = different domains, not two mirrors of the same FB event. Prefer **1 official (own site or own FB/IG event) + 1 aggregator/ticketing**.
- **Watch date discrepancies across sources** — that is what double-checking is for (e.g. Tukina listed as `11` vs `11–14`). Flag the uncertain field in `notes`.

## Facebook is a first-class source

There is **no usable FB API** for third-party event discovery (Graph Search removed 2019; public Events API removed 2018; a logged-in scraper violates ToS). But most quality FB events are still reachable:
- **WebSearch indexes public FB events** — date/venue often show in the snippet.
- **Aggregators + ticketing** (kizombakatxupa, allevents, iwencik, Eventbrite, dizizid) launder FB data into fetchable HTML.
- **Human paste-link** — for closed groups / OnlyDance app, ask the user to paste the link; then `node tools/add-event.js <link>` reads its OG tags.

Never downgrade an event just because its source is Facebook.

## Candidate shape

Append objects to the `candidates` array in `data/candidates.json`. `sources` is an **array of URL strings**; leave `link_ok` as `null` (the human's `--promote` sets it by checking the link live). Styles must be slugs from `data/dances.json`.

```json
{
  "id": "kizomba-noc-wroclaw-2026-09-19",
  "title": "Kizomba Noc Wrocław",
  "type": "social",
  "styles": ["kizomba", "semba"],
  "city": "Wrocław",
  "date_start": "2026-09-19",
  "url": "https://www.facebook.com/events/1234567890",
  "summary_pl": "Jedno–trzy zdania własnego opisu (krótko, konkretnie, bez marketingu).",
  "organizer": "Kizomba Wrocław",
  "sources": ["https://www.facebook.com/events/1234567890", "https://wydarzeniataneczne.pl/..."],
  "link_ok": null,
  "status": "ready",
  "notes": "Data zgodna na 2 źródłach."
}
```

Optional fields: `date_end`, `time`, `venue`, `price`, `featured`, `image_src` (cover URL — downloaded + converted to WebP at promotion), `summary_pl` (own editorial blurb — 1–3 plain, concrete sentences in the user's voice; never copy the organizer's text). `status` ∈ `ready` / `needs_second_source` / `needs_manual` / `rejected`. Recurring weekly classes are NOT events — they belong in `data/schools.json` (currently ships empty; if you must add one, mirror the fields `app.js`'s `renderSchools` reads).

## Commands

```bash
node tools/promote-candidate.js --list                 # see the queue + confidence
node tools/promote-candidate.js --promote <id>         # human publishes one (re-checks link, converts cover to WebP)
node tools/promote-candidate.js --reject <id>
node tools/add-event.js <url>                           # human fast-path for a pasted FB/IG link
```

The human runs `--promote`; you only ever stage candidates. `add-event.js` is the human's fast-path for a pasted FB/IG link (reads its OG tags directly).

## Common mistakes

- **Only doing the festival sweep** → missing local socials. Always run the near-term local pass too.
- **Treating FB as unreachable** → dropping good events. Use search-index + aggregators + paste-link.
- **Hard-blocking on a single source** → confidence is a label, not a gate; ship single-source flagged.
- **Publishing recurring courses as events** → those are `schools.json` data.
- **Writing to `events.json` directly** → always stage in `candidates.json`; the human promotes.
- **Trusting one aggregator's date** → cross-check date + city on a second independent source.
