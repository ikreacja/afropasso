'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { isPast, partitionEvents } = require('./prune-events');

const today = new Date('2026-07-23T00:00:00');

test('isPast keeps events ending today or later, prunes earlier ones', () => {
    assert.strictEqual(isPast({ date_start: '2026-07-22' }, today), true);
    assert.strictEqual(isPast({ date_start: '2026-07-23' }, today), false); // today still upcoming
    assert.strictEqual(isPast({ date_start: '2026-07-24' }, today), false);
});

test('isPast uses inclusive date_end for multi-day events', () => {
    // festival started before today but still running today → not past
    assert.strictEqual(isPast({ date_start: '2026-07-20', date_end: '2026-07-23' }, today), false);
    assert.strictEqual(isPast({ date_start: '2026-07-18', date_end: '2026-07-21' }, today), true);
});

test('isPast leaves invalid dates in place rather than archiving them', () => {
    assert.strictEqual(isPast({ date_start: 'not-a-date' }, today), false);
});

test('partitionEvents splits into upcoming and past preserving order', () => {
    const events = [
        { id: 'old-a', date_start: '2026-01-01' },
        { id: 'future', date_start: '2026-08-01' },
        { id: 'old-b', date_start: '2026-06-30' },
        { id: 'today', date_start: '2026-07-23' },
    ];
    const { upcoming, past } = partitionEvents(events, today);
    assert.deepStrictEqual(upcoming.map(e => e.id), ['future', 'today']);
    assert.deepStrictEqual(past.map(e => e.id), ['old-a', 'old-b']);
});
