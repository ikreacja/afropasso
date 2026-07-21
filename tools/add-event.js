#!/usr/bin/env node
// AfroPasso curator tool: import an event from a public event URL into data/events.json.
// Usage: node tools/add-event.js <url>     (or with no URL for fully manual entry)
'use strict';

const fs = require('fs');
const path = require('path');
const { downloadAndConvertCover } = require('./cover-image');

const EVENT_TYPES = ['social', 'warsztaty', 'festiwal'];
const DATA_DIR = path.join(__dirname, '..', 'data');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'events');

function decodeEntities(value) {
    return value
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function parseOgTags(html) {
    const tags = {};
    const metaRegex = /<meta\b[^>]*>/gi;
    for (const [meta] of html.matchAll(metaRegex)) {
        const property = meta.match(/property=["']og:([^"']+)["']/i);
        const content = meta.match(/content=["']([^"']*)["']/i);
        if (property && content && !(property[1] in tags)) {
            tags[property[1]] = decodeEntities(content[1]);
        }
    }
    return tags;
}

function validateEvent(event, knownStyleSlugs, existingIds) {
    const errors = [];
    for (const field of ['id', 'title', 'city', 'url']) {
        if (!event[field] || !String(event[field]).trim()) errors.push(`Brak wymaganego pola: ${field}`);
    }
    if (!EVENT_TYPES.includes(event.type)) errors.push(`Nieznany type: "${event.type}" (dozwolone: ${EVENT_TYPES.join(', ')})`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date_start || '') || Number.isNaN(new Date(`${event.date_start}T00:00:00`).getTime())) {
        errors.push(`Niepoprawne date_start: "${event.date_start}" (format RRRR-MM-DD)`);
    }
    if (event.date_end && (!/^\d{4}-\d{2}-\d{2}$/.test(event.date_end) || event.date_end < event.date_start)) {
        errors.push(`Niepoprawne date_end: "${event.date_end}"`);
    }
    for (const slug of event.styles || []) {
        if (!knownStyleSlugs.includes(slug)) errors.push(`Nieznany styl: "${slug}" (slug musi istnieć w dances.json)`);
    }
    if (existingIds.includes(event.id)) errors.push(`Wydarzenie o id "${event.id}" już istnieje`);
    return errors;
}

function insertEventSorted(events, entry) {
    return [...events, entry].sort((a, b) => a.date_start.localeCompare(b.date_start));
}

function slugifyEvent(title, city, dateStart) {
    const ascii = (value) => value.toLowerCase()
        .replace(/[ąćęłńóśźż]/g, ch => ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }[ch]))
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${ascii(title)}-${ascii(city)}-${dateStart}`;
}

module.exports = { parseOgTags, validateEvent, insertEventSorted, slugifyEvent };

async function fetchOgTags(url) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AfroPassoBot/1.0)' },
            redirect: 'follow'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return parseOgTags(await response.text());
    } catch (error) {
        console.warn(`Nie udało się pobrać metadanych (${error.message}) — wpiszesz dane ręcznie.`);
        return {};
    }
}

async function downloadImage(imageUrl, id) {
    try {
        return await downloadAndConvertCover(imageUrl, id, IMAGES_DIR);
    } catch (error) {
        console.warn(`Nie udało się pobrać grafiki: ${error.message}`);
        return '';
    }
}

async function main() {
    const readline = require('readline/promises');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = async (label, preset = '') => {
        const answer = (await rl.question(preset ? `${label} [${preset}]: ` : `${label}: `)).trim();
        return answer || preset;
    };

    const url = process.argv[2] || await ask('Link do wydarzenia (np. Facebook)');
    const og = process.argv[2] ? await fetchOgTags(url) : {};
    if (og.title) console.log(`Znaleziono: "${og.title}"`);

    const dances = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dances.json'), 'utf8')).dances;
    const knownStyleSlugs = dances.map(dance => dance.slug);
    const eventsFile = path.join(DATA_DIR, 'events.json');
    const eventsJson = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));

    const title = await ask('Tytuł', og.title || '');
    const type = await ask(`Typ (${EVENT_TYPES.join(' / ')})`, 'social');
    const city = await ask('Miasto');
    const country = await ask('Kraj', 'Polska');
    const date_start = await ask('Data rozpoczęcia (RRRR-MM-DD)');
    const date_end = await ask('Data zakończenia (enter = jednodniowe)', '');
    const time = await ask('Godzina (np. 21:00, enter = pomiń)', '');
    const price = await ask('Cena (np. 30 zł, enter = pomiń)', '');
    const stylesRaw = await ask(`Style (slugi po przecinku; dostępne: ${knownStyleSlugs.join(', ')})`, 'kizomba');
    const organizer = await ask('Organizator', '');
    const featured = (await ask('Wyróżnione? (t/n)', 'n')).toLowerCase().startsWith('t');
    const source = await ask('Źródło (fb / zgloszenie / kurator)', 'fb');
    const id = await ask('Id', slugifyEvent(title, city, date_start));

    const event = {
        id, title, type,
        styles: stylesRaw.split(',').map(s => s.trim()).filter(Boolean),
        city, country, date_start, url, featured, organizer, source
    };
    const venue = await ask('Miejsce (enter = pomiń)', '');
    if (venue) event.venue = venue;
    if (date_end) event.date_end = date_end;
    if (time) event.time = time;
    if (price) event.price = price;

    if (og.image && (await ask(`Pobrać grafikę? ${og.image} (t/n)`, 't')).toLowerCase().startsWith('t')) {
        const imagePath = await downloadImage(og.image, id);
        if (imagePath) event.image = imagePath;
    }

    const errors = validateEvent(event, knownStyleSlugs, eventsJson.events.map(e => e.id));
    if (errors.length > 0) {
        console.error('\nBłędy — nic nie zapisano:');
        errors.forEach(error => console.error(`  - ${error}`));
        rl.close();
        process.exit(1);
    }

    eventsJson.events = insertEventSorted(eventsJson.events, event);
    fs.writeFileSync(eventsFile, JSON.stringify(eventsJson, null, 4) + '\n');
    console.log(`\nZapisano "${title}" do data/events.json. Sprawdź diff, potem: git add data/events.json assets/events && git commit`);
    rl.close();
}

if (require.main === module) {
    main().catch(error => { console.error(error); process.exit(1); });
}
