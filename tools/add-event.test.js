// tools/add-event.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { parseOgTags, validateEvent, insertEventSorted, slugifyEvent } = require('./add-event.js');

test('parseOgTags extracts title, image, description in both attribute orders', () => {
    const html = `
        <meta property="og:title" content="Kizomba Night &amp; Social"/>
        <meta content="https://cdn.example.com/e.jpg" property="og:image">
        <meta property="og:description" content="Zapraszamy!">`;
    const tags = parseOgTags(html);
    assert.equal(tags.title, 'Kizomba Night & Social');
    assert.equal(tags.image, 'https://cdn.example.com/e.jpg');
    assert.equal(tags.description, 'Zapraszamy!');
});

test('parseOgTags returns empty object for HTML without OG tags', () => {
    assert.deepEqual(parseOgTags('<html><body>nic</body></html>'), {});
});

test('validateEvent accepts a complete valid entry', () => {
    const errors = validateEvent(
        { id: 'social-warszawa-2030-07-12', title: 'X', type: 'social', styles: ['kizomba'],
          city: 'Warszawa', date_start: '2030-07-12', url: 'https://fb.com/e/1',
          featured: false, organizer: 'Y', source: 'kurator' },
        ['kizomba', 'semba'], []);
    assert.deepEqual(errors, []);
});

test('validateEvent rejects bad date, unknown style, bad type, duplicate id, missing fields', () => {
    const errors = validateEvent(
        { id: 'dup', title: '', type: 'koncert', styles: ['tango'], city: '',
          date_start: '12.07.2030', url: '', featured: false, organizer: '', source: 'kurator' },
        ['kizomba'], ['dup']);
    assert.ok(errors.some(e => e.includes('date_start')));
    assert.ok(errors.some(e => e.includes('tango')));
    assert.ok(errors.some(e => e.includes('type')));
    assert.ok(errors.some(e => e.includes('id')));
    assert.ok(errors.some(e => e.includes('title')));
    assert.ok(errors.some(e => e.includes('city')));
    assert.ok(errors.some(e => e.includes('url')));
});

test('insertEventSorted keeps chronological order', () => {
    const events = [{ id: 'a', date_start: '2030-01-01' }, { id: 'c', date_start: '2030-03-01' }];
    const result = insertEventSorted(events, { id: 'b', date_start: '2030-02-01' });
    assert.deepEqual(result.map(e => e.id), ['a', 'b', 'c']);
});

test('slugifyEvent builds ascii slug from Polish title, city, date', () => {
    assert.equal(
        slugifyEvent('Potańcówka Łódź – Kizomba & Semba!', 'Łódź', '2030-07-12'),
        'potancowka-lodz-kizomba-semba-lodz-2030-07-12');
});
