import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyPalette, planBrandSwaps, sanitizeBrand, DEFAULT_BRAND } from '../../src/brand.js';

const page = [
  { color: '#faf5ff', count: 9 },
  { color: '#1f2937', count: 7 },
  { color: '#7c3aed', count: 6 },
  { color: '#6b7280', count: 4 },
  { color: '#db2777', count: 2 },
  { color: '#ffffff', count: 5 },
];

test('classifyPalette finds background, text and the two accents by role', () => {
  assert.deepEqual(classifyPalette(page), {
    background: '#faf5ff',
    text: '#1f2937',
    accent: '#7c3aed',
    accent2: '#db2777',
  });
});

test('classifyPalette ignores translucent colours and copes with tiny palettes', () => {
  const roles = classifyPalette([{ color: '#00000080', count: 9 }, { color: '#111111', count: 1 }]);
  assert.equal(roles.text, '#111111');
  assert.equal(roles.background, null);
  assert.equal(roles.accent, null);
});

test('planBrandSwaps maps each found role to the brand colour, skipping equal ones', () => {
  const brand = { ...DEFAULT_BRAND, background: '#fffdf7', text: '#1f2937', accent: '#0f766e', accent2: '#f59e0b' };
  const plan = planBrandSwaps(page, [], brand);
  assert.deepEqual(plan.colors, [
    ['#faf5ff', '#fffdf7'],
    ['#7c3aed', '#0f766e'],
    ['#db2777', '#f59e0b'],
  ]);
});

test('planBrandSwaps also moves leftover light tints to the brand background, but keeps pure white', () => {
  const tinted = [...page, { color: '#ede9fe', count: 3 }, { color: '#f5f0ff', count: 1 }];
  const brand = { ...DEFAULT_BRAND, background: '#f3f4f0', text: '#1f2937', accent: '#ff4b2b', accent2: '#c2410c' };
  const plan = planBrandSwaps(tinted, [], brand);
  assert.deepEqual(plan.colors.filter(([, to]) => to === '#f3f4f0').map(([from]) => from).sort(), ['#ede9fe', '#f5f0ff', '#faf5ff']);
  assert.equal(plan.colors.some(([from]) => from === '#ffffff'), false);
});

test('planBrandSwaps maps the most used font to body and the next to headings', () => {
  const brand = { ...DEFAULT_BRAND, bodyFont: 'Inter', headingFont: 'Fraunces' };
  const fonts = [{ family: 'Poppins', count: 5 }, { family: 'Playfair Display', count: 2 }];
  assert.deepEqual(planBrandSwaps([], fonts, brand).fonts, [['Poppins', 'Inter'], ['Playfair Display', 'Fraunces']]);
});

test('planBrandSwaps never maps two different page colours to the same source twice', () => {
  const plan = planBrandSwaps([{ color: '#7c3aed', count: 3 }], [], { ...DEFAULT_BRAND, accent: '#000001' });
  assert.equal(plan.colors.length, 1);
});

test('sanitizeBrand keeps valid fields and falls back for broken ones', () => {
  const brand = sanitizeBrand({ name: 'Mine', accent: 'rgb(15, 118, 110)', text: 'not a colour', headingFont: 42, extra: 'x' });
  assert.equal(brand.name, 'Mine');
  assert.equal(brand.accent, '#0f766e');
  assert.equal(brand.text, DEFAULT_BRAND.text);
  assert.equal(brand.headingFont, DEFAULT_BRAND.headingFont);
  assert.equal('extra' in brand, false);
});
