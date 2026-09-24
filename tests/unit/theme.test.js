import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractColors, replaceColor, extractFonts, replaceFont } from '../../src/theme.js';

const css = `
  body { color: #333; background: #FFFFFF; font-family: 'Inter', sans-serif; }
  h1 { color: #333333; font-family: "Playfair Display", serif; }
  .btn { background: rgb(99, 102, 241); border: 1px solid #6366F1; }
  .card { font-family: Inter, system-ui; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
`;

test('extractColors groups equivalent colours and sorts by count', () => {
  const colors = extractColors(css);
  assert.deepEqual(colors.slice(0, 2), [
    { color: '#333333', count: 2 },
    { color: '#6366f1', count: 2 },
  ]);
  assert.ok(colors.some((c) => c.color === '#ffffff' && c.count === 1));
  assert.ok(colors.some((c) => c.color === '#0000001a'));
});

test('extractColors ignores hex-looking ids and urls', () => {
  const colors = extractColors('a[href="#top"] { color: #fff } .x { background: url(img#abc.png) }');
  assert.deepEqual(colors, [{ color: '#ffffff', count: 1 }]);
});

test('replaceColor swaps every spelling of the same colour', () => {
  const out = replaceColor(css, '#6366f1', '#e11d48');
  assert.ok(!/6366f1/i.test(out));
  assert.ok(!out.includes('rgb(99, 102, 241)'));
  assert.equal((out.match(/#e11d48/g) || []).length, 2);
});

test('replaceColor leaves other colours untouched', () => {
  const out = replaceColor(css, '#6366f1', '#e11d48');
  assert.ok(out.includes('#333;'));
  assert.ok(out.includes('#FFFFFF'));
});

test('replaceColor returns the same text when nothing matches', () => {
  assert.equal(replaceColor(css, '#123456', '#654321'), css);
});

test('extractFonts returns the first family of each stack with counts', () => {
  assert.deepEqual(extractFonts(css), [
    { family: 'Inter', count: 2 },
    { family: 'Playfair Display', count: 1 },
  ]);
});

test('extractFonts skips generic families', () => {
  assert.deepEqual(extractFonts('p { font-family: sans-serif; }'), []);
});

test('replaceFont swaps the family everywhere, quoting when needed', () => {
  const out = replaceFont(css, 'Inter', 'DM Serif Display');
  assert.equal((out.match(/'DM Serif Display'/g) || []).length, 2);
  assert.ok(out.includes('"Playfair Display", serif'));
  assert.ok(!/\bInter\b/.test(out));
});
