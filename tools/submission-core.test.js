const { test } = require('node:test');
const assert = require('node:assert');
const { validateSubmission, mapSubmissionToEvent } = require('./submission-core.js');

const KNOWN = ['kizomba', 'semba', 'tarraxo'];
const VALID = {
    title: 'Kizomba Social', type: 'social', city: 'Warszawa',
    date_start: '2030-09-12', styles: ['kizomba'], url: 'https://fb.com/e/1',
    contactEmail: 'ktos@example.com', organizer: 'Studio X',
    notes: 'zaproszenie', _hp: '', status: 'pending'
};

test('validateSubmission accepts a complete valid submission', () => {
    assert.deepEqual(validateSubmission(VALID, KNOWN), []);
});

test('validateSubmission rejects missing title, bad type, bad date, unknown style, empty styles, bad email', () => {
    const errs = validateSubmission(
        { title: '', type: 'koncert', city: 'X', date_start: '12.09.2030',
          styles: [], url: 'https://x', contactEmail: 'nope' }, KNOWN);
    assert.ok(errs.some(e => e.includes('title')));
    assert.ok(errs.some(e => e.includes('type')));
    assert.ok(errs.some(e => e.includes('date_start')));
    assert.ok(errs.some(e => e.toLowerCase().includes('styl')));
    assert.ok(errs.some(e => e.toLowerCase().includes('e-mail')));
});

test('validateSubmission rejects an unknown style slug', () => {
    const errs = validateSubmission({ ...VALID, styles: ['tango'] }, KNOWN);
    assert.ok(errs.some(e => e.includes('tango')));
});

test('mapSubmissionToEvent strips private fields and sets source/featured/id', () => {
    const ev = mapSubmissionToEvent(VALID);
    assert.equal(ev.source, 'zgloszenie');
    assert.equal(ev.featured, false);
    assert.equal(ev.id, 'kizomba-social-warszawa-2030-09-12');
    assert.equal(ev.contactEmail, undefined);
    assert.equal(ev.notes, undefined);
    assert.equal(ev._hp, undefined);
    assert.equal(ev.status, undefined);
    assert.equal(ev.organizer, 'Studio X');
});

test('mapSubmissionToEvent keeps optional fields only when present', () => {
    const ev = mapSubmissionToEvent({ ...VALID, date_end: '2030-09-14', time: '21:00', venue: 'Klub', price: '30 zł' });
    assert.equal(ev.date_end, '2030-09-14');
    assert.equal(ev.time, '21:00');
    assert.equal(ev.venue, 'Klub');
    assert.equal(ev.price, '30 zł');
    const bare = mapSubmissionToEvent(VALID);
    assert.equal('date_end' in bare, false);
    assert.equal('time' in bare, false);
});
