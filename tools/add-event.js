#!/usr/bin/env node
// AfroPasso curator tool: import an event from a public event URL into data/events.json.
// Usage: node tools/add-event.js <url>     (or with no URL for fully manual entry)
'use strict';

const fs = require('fs');
const path = require('path');

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
