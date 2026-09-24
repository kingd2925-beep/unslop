import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeColor } from '../../src/color.js';

test('expands 3-digit hex to 6-digit lowercase', () => {
  assert.equal(normalizeColor('#ABC'), '#aabbcc');
});

test('keeps 6-digit hex, lowercased', () => {
  assert.equal(normalizeColor('#1A2B3C'), '#1a2b3c');
});

test('converts rgb() to hex', () => {
  assert.equal(normalizeColor('rgb(255, 0, 128)'), '#ff0080');
});

test('converts rgba() with alpha to 8-digit hex', () => {
  assert.equal(normalizeColor('rgba(0,0,0,0.5)'), '#00000080');
});

test('drops a fully opaque alpha', () => {
  assert.equal(normalizeColor('rgba(10, 20, 30, 1)'), '#0a141e');
});

test('returns null for things that are not colours', () => {
  assert.equal(normalizeColor('transparent'), null);
  assert.equal(normalizeColor('#12'), null);
  assert.equal(normalizeColor('rgb(300, 0, 0)'), null);
});
