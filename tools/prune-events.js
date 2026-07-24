#!/usr/bin/env node
// AfroPasso curator tool: move past events out of data/events.json into data/events-archive.json.
// The site already hides past events at render time (app.js getUpcomingEvents); this keeps the
// served data file tidy. Archive is retained so nothing is ever lost.
// Usage: node tools/prune-events.js [--dry-run]
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Mirror app.js getUpcomingEvents: an event stays "upcoming" while its end date >= today
// (00:00 local). date_end is inclusive; fall back to date_start for single-day events.
function parseEventDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isPast(event, today) {
    const end = parseEventDate(event.date_end || event.date_start);
    if (!end) return false; // invalid date → leave it in place, don't silently archive
    return end < today;
}

// Split events into { upcoming, past }, preserving input order within each bucket.
function partitionEvents(events, today) {
    const upcoming = [];
    const past = [];
    for (const event of events) {
        (isPast(event, today) ? past : upcoming).push(event);
    }
    return { upcoming, past };
}

function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

module.exports = { parseEventDate, isPast, partitionEvents };

function main() {
    const dryRun = process.argv.includes('--dry-run');
    const eventsFile = path.join(DATA_DIR, 'events.json');
    const archiveFile = path.join(DATA_DIR, 'events-archive.json');

    const eventsJson = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
    const { upcoming, past } = partitionEvents(eventsJson.events || [], startOfToday());

    if (past.length === 0) {
        console.log('Brak wydarzeń po terminie — nic do przycięcia.');
        return;
    }

    console.log(`Do archiwum (${past.length}):`);
    for (const e of past) {
        const dates = e.date_end && e.date_end !== e.date_start ? `${e.date_start}–${e.date_end}` : e.date_start;
        console.log(`  - ${e.id}  (${e.title} — ${e.city} — ${dates})`);
    }

    if (dryRun) {
        console.log('\n--dry-run: nic nie zapisano.');
        return;
    }

    // Merge into the archive (create it on first run), keep chronological by start date.
    const archiveJson = fs.existsSync(archiveFile)
        ? JSON.parse(fs.readFileSync(archiveFile, 'utf8'))
        : { events: [] };
    const seen = new Set(archiveJson.events.map(e => e.id));
    for (const e of past) {
        if (!seen.has(e.id)) archiveJson.events.push(e);
    }
    archiveJson.events.sort((a, b) => a.date_start.localeCompare(b.date_start));

    eventsJson.events = upcoming;

    fs.writeFileSync(eventsFile, JSON.stringify(eventsJson, null, 4) + '\n');
    fs.writeFileSync(archiveFile, JSON.stringify(archiveJson, null, 4) + '\n');
    console.log(`\nPrzeniesiono ${past.length} do data/events-archive.json. Sprawdź diff, potem: git add data/events.json data/events-archive.json && git commit`);
}

if (require.main === module) {
    main();
}
