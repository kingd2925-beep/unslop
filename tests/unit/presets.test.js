import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRAND_PRESETS, sanitizeBrand, contrastRatio } from '../../src/brand.js';
import { findFont } from '../../src/fonts.js';

const MIN_LARGE_TEXT_CONTRAST = 3;
const MIN_BODY_TEXT_CONTRAST = 4.5;

test('contrastRatio matches the WCAG reference values', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff') * 10) / 10, 21);
  assert.equal(contrastRatio('#777777', '#777777'), 1);
  assert.equal(Math.round(contrastRatio('#767676', '#ffffff') * 100) / 100, 4.54);
});

test('there are at least four presets, each with a unique name', () => {
  assert.ok(BRAND_PRESETS.length >= 4);
  assert.equal(new Set(BRAND_PRESETS.map((p) => p.name)).size, BRAND_PRESETS.length);
});

for (const preset of BRAND_PRESETS) {
  test(`preset "${preset.name}" is a valid brand with library fonts`, () => {
    assert.deepEqual({ ...sanitizeBrand(preset) }, { ...preset });
    assert.ok(findFont(preset.headingFont), `${preset.headingFont} missing from the font library`);
    assert.ok(findFont(preset.bodyFont), `${preset.bodyFont} missing from the font library`);
  });

  test(`preset "${preset.name}" keeps text readable`, () => {
    assert.ok(contrastRatio(preset.text, preset.background) >= MIN_BODY_TEXT_CONTRAST, 'body text on background');
    assert.ok(contrastRatio('#ffffff', preset.accent) >= MIN_LARGE_TEXT_CONTRAST, 'white on main accent');
    assert.ok(contrastRatio('#ffffff', preset.accent2) >= MIN_LARGE_TEXT_CONTRAST, 'white on second accent');
    assert.ok(contrastRatio(preset.accent, '#ffffff') >= MIN_LARGE_TEXT_CONTRAST, 'accent text on white cards');
  });
}
