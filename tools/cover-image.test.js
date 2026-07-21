'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { sourceExtension, coverOutputPath } = require('./cover-image');

test('sourceExtension lowercases and strips query', () => {
    assert.strictEqual(sourceExtension('https://x/poster.PNG'), 'png');
    assert.strictEqual(sourceExtension('https://x/y.jpg?v=2'), 'jpg');
    assert.strictEqual(sourceExtension('https://x/z.JPEG'), 'jpeg');
    assert.strictEqual(sourceExtension('https://x/no-ext'), 'jpg');
});

test('coverOutputPath returns webp path under assets/events', () => {
    assert.strictEqual(coverOutputPath('vamos-2026'), 'assets/events/vamos-2026.webp');
});
