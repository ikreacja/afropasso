'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { computeConfidence, dedupeKey, isDuplicate, candidateToEvent } = require('./promote-candidate');

test('computeConfidence labels by source count and link', () => {
    assert.strictEqual(computeConfidence({ sources: ['a', 'b'], link_ok: true }), 'verified');
    assert.strictEqual(computeConfidence({ sources: ['a'], link_ok: true }), 'single-source');
    assert.strictEqual(computeConfidence({ sources: ['a', 'b'], link_ok: false }), 'unverified');
    assert.strictEqual(computeConfidence({ sources: [], link_ok: true }), 'unverified');
});

test('isDuplicate matches by id or by date+city', () => {
    const existing = [{ id: 'x', date_start: '2026-11-19', city: 'Warszawa' }];
    assert.strictEqual(isDuplicate({ id: 'x', date_start: '2026-01-01', city: 'Gdańsk' }, existing), true);
    assert.strictEqual(isDuplicate({ id: 'y', date_start: '2026-11-19', city: 'warszawa' }, existing), true);
    assert.strictEqual(isDuplicate({ id: 'y', date_start: '2026-12-01', city: 'Gdańsk' }, existing), false);
});

test('isDuplicate allows distinct titles on the same date and city', () => {
    const existing = [{ id: 'a', title: 'Kizomba Social Night', date_start: '2026-09-12', city: 'Warszawa' }];
    assert.strictEqual(isDuplicate({ id: 'b', title: 'Semba Potańcówka', date_start: '2026-09-12', city: 'Warszawa' }, existing), false);
    assert.strictEqual(isDuplicate({ id: 'c', title: 'Kizomba Social Night', date_start: '2026-09-12', city: 'warszawa' }, existing), true);
});

test('candidateToEvent strips staging fields and marks single-source', () => {
    const event = candidateToEvent({
        id: 'e1', title: 'T', type: 'festiwal', styles: ['kizomba'], city: 'Lizbona',
        date_start: '2026-12-11', url: 'https://x', organizer: 'Org',
        sources: ['a'], link_ok: true, status: 'ready', image_src: 'https://img'
    });
    assert.strictEqual(event.confidence, 'single-source');
    assert.strictEqual(event.featured, false);
    assert.strictEqual(event.source, 'research');
    assert.ok(!('sources' in event));
    assert.ok(!('link_ok' in event));
    assert.ok(!('image_src' in event));
});

test('candidateToEvent omits confidence when verified', () => {
    const event = candidateToEvent({
        id: 'e2', title: 'T', type: 'festiwal', styles: ['kizomba'], city: 'Paris',
        date_start: '2026-11-19', url: 'https://x', sources: ['a', 'b'], link_ok: true
    });
    assert.ok(!('confidence' in event));
});
