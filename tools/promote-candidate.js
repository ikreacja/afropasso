#!/usr/bin/env node
// AfroPasso curator tool: promote a verified candidate from data/candidates.json into data/events.json.
// Usage: node tools/promote-candidate.js --list | --promote <id> | --reject <id> [--force]
'use strict';

const fs = require('fs');
const path = require('path');
const { validateEvent, insertEventSorted } = require('./add-event');
const { downloadAndConvertCover } = require('./cover-image');

const DATA_DIR = path.join(__dirname, '..', 'data');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'events');

function computeConfidence(candidate) {
    if (!candidate.link_ok) return 'unverified';
    const count = (candidate.sources || []).filter(Boolean).length;
    if (count >= 2) return 'verified';
    if (count >= 1) return 'single-source';
    return 'unverified';
}

function normalizeTitle(title) {
    return (title || '').toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim();
}

function dedupeKey(event) {
    return `${event.date_start}|${(event.city || '').toLowerCase()}|${normalizeTitle(event.title)}`;
}

function isDuplicate(event, existingEvents) {
    return existingEvents.some(e => e.id === event.id || dedupeKey(e) === dedupeKey(event));
}

function candidateToEvent(candidate) {
    const event = {
        id: candidate.id,
        title: candidate.title,
        type: candidate.type,
        styles: candidate.styles || [],
        city: candidate.city,
        date_start: candidate.date_start,
        url: candidate.url,
        featured: Boolean(candidate.featured),
        organizer: candidate.organizer || '',
        source: candidate.source || 'research'
    };
    if (candidate.venue) event.venue = candidate.venue;
    if (candidate.date_end) event.date_end = candidate.date_end;
    if (candidate.time) event.time = candidate.time;
    if (candidate.price) event.price = candidate.price;
    if (candidate.image) event.image = candidate.image;
    if (candidate.summary_pl) event.summary_pl = candidate.summary_pl;
    if (computeConfidence(candidate) === 'single-source') event.confidence = 'single-source';
    return event;
}

module.exports = { computeConfidence, dedupeKey, isDuplicate, candidateToEvent };

async function checkLink(url) {
    try {
        const res = await fetch(url, {
            method: 'GET', redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AfroPassoBot/1.0)' }
        });
        return res.ok;
    } catch (error) {
        return false;
    }
}

function listCandidates(candidates) {
    if (!candidates.length) { console.log('Poczekalnia pusta.'); return; }
    for (const c of candidates) {
        const conf = computeConfidence(c);
        const dates = c.date_end && c.date_end !== c.date_start ? `${c.date_start}–${c.date_end}` : c.date_start;
        console.log(`[${c.status || 'candidate'} · ${conf}] ${c.id}`);
        console.log(`    ${c.title} — ${c.city} — ${dates}`);
        console.log(`    url: ${c.url}  (źródła: ${(c.sources || []).length})`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const candidatesFile = path.join(DATA_DIR, 'candidates.json');
    const eventsFile = path.join(DATA_DIR, 'events.json');
    const store = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));
    const candidates = store.candidates || [];
    const force = args.includes('--force');

    if (args.length === 0 || args.includes('--list')) {
        listCandidates(candidates);
        return;
    }

    const rejectIdx = args.indexOf('--reject');
    if (rejectIdx !== -1) {
        const id = args[rejectIdx + 1];
        const candidate = candidates.find(x => x.id === id);
        if (!candidate) { console.error(`Nie znaleziono kandydata: ${id}`); process.exit(1); }
        candidate.status = 'rejected';
        fs.writeFileSync(candidatesFile, JSON.stringify(store, null, 4) + '\n');
        console.log(`Odrzucono ${id}.`);
        return;
    }

    const promoteIdx = args.indexOf('--promote');
    if (promoteIdx === -1) {
        console.error('Użycie: promote-candidate.js --list | --promote <id> | --reject <id> [--force]');
        process.exit(1);
    }

    const id = args[promoteIdx + 1];
    const candidate = candidates.find(x => x.id === id);
    if (!candidate) { console.error(`Nie znaleziono kandydata: ${id}`); process.exit(1); }

    candidate.link_ok = await checkLink(candidate.url);
    const confidence = computeConfidence(candidate);
    console.log(`Link: ${candidate.link_ok ? 'żywy' : 'MARTWY'} · pewność: ${confidence}`);
    if (confidence === 'unverified' && !force) {
        console.error('Kandydat unverified (martwy link lub brak źródeł) — nie publikuję. Użyj --force by wymusić.');
        process.exit(1);
    }

    const eventsJson = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
    if (isDuplicate(candidate, eventsJson.events) && !force) {
        console.error('Wygląda na duplikat istniejącego eventu — nie publikuję. Użyj --force.');
        process.exit(1);
    }

    if (candidate.image_src && !candidate.image) {
        try {
            candidate.image = await downloadAndConvertCover(candidate.image_src, candidate.id, IMAGES_DIR);
            console.log(`Grafika: ${candidate.image}`);
        } catch (error) {
            console.warn(`Grafika pominięta: ${error.message}`);
        }
    }

    const event = candidateToEvent(candidate);
    const dances = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dances.json'), 'utf8')).dances;
    const knownStyleSlugs = dances.map(d => d.slug);
    const errors = validateEvent(event, knownStyleSlugs, eventsJson.events.map(e => e.id));
    if (errors.length > 0) {
        console.error('Błędy walidacji — nic nie zapisano:');
        errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
    }

    eventsJson.events = insertEventSorted(eventsJson.events, event);
    fs.writeFileSync(eventsFile, JSON.stringify(eventsJson, null, 4) + '\n');
    store.candidates = candidates.filter(x => x.id !== id);
    fs.writeFileSync(candidatesFile, JSON.stringify(store, null, 4) + '\n');
    console.log(`\nOpublikowano "${event.title}" do data/events.json. Sprawdź diff, potem: git add data/events.json assets/events && git commit`);
}

if (require.main === module) {
    main().catch(error => { console.error(error); process.exit(1); });
}
