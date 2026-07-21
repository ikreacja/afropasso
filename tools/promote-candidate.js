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

function dedupeKey(event) {
    return `${event.date_start}|${(event.city || '').toLowerCase()}`;
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
    if (computeConfidence(candidate) === 'single-source') event.confidence = 'single-source';
    return event;
}

module.exports = { computeConfidence, dedupeKey, isDuplicate, candidateToEvent };
