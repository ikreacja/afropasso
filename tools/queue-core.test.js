'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { targetFileForKind, validateQueueDoc, mapQueueDocToRecord } = require('./queue-core');

const STYLES = ['kizomba', 'semba', 'urban-kizz', 'kuduro'];

function validEventDoc(extra = {}) {
  return Object.assign({
    kind: 'event', source: 'cli', trust: 'public',
    title: 'Kizomba Night Gdańsk', type: 'social', city: 'Gdańsk',
    date_start: '2026-09-12', styles: ['kizomba'],
    url: 'https://example.com/e', contactEmail: 'org@example.com'
  }, extra);
}

test('targetFileForKind maps kinds to files', () => {
  assert.strictEqual(targetFileForKind('event'), 'data/events.json');
  assert.strictEqual(targetFileForKind('school'), 'data/schools.json');
  assert.strictEqual(targetFileForKind('class'), 'data/schools.json');
  assert.throws(() => targetFileForKind('nope'));
});

test('validateQueueDoc accepts a valid event doc', () => {
  assert.deepStrictEqual(validateQueueDoc(validEventDoc(), STYLES), []);
});

test('validateQueueDoc rejects bad kind/source/trust', () => {
  const errs = validateQueueDoc({ kind: 'x', source: 'y', trust: 'z' }, STYLES);
  assert.ok(errs.length >= 3, 'expected at least 3 meta errors');
});

test('validateQueueDoc rejects an event with a bad date', () => {
  const errs = validateQueueDoc(validEventDoc({ date_start: '12-09-2026' }), STYLES);
  assert.ok(errs.length >= 1);
});

test('mapQueueDocToRecord maps an event payload to a record', () => {
  const rec = mapQueueDocToRecord(validEventDoc());
  assert.strictEqual(rec.title, 'Kizomba Night Gdańsk');
  assert.strictEqual(rec.city, 'Gdańsk');
});

test('mapQueueDocToRecord refuses non-event kinds in P1', () => {
  assert.throws(() => mapQueueDocToRecord(validEventDoc({ kind: 'school' })));
});
