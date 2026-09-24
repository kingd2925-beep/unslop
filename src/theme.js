// Theme scanning on CSS text: find a site's colours and fonts, and swap one for another everywhere.
// Pure string functions, so they are tested in Node and reused by the browser code.

import { normalizeColor } from './color.js';

const COLOR_TOKEN = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
const PROTECTED = /url\([^)]*\)|"[^"]*"|'[^']*'/g;
const FONT_DECL = /(font-family\s*:\s*)([^;{}]+)/gi;
const GENERIC_FONTS = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif',
  'ui-monospace', 'ui-rounded', '-apple-system', 'blinkmacsystemfont', 'emoji', 'math', 'fangsong',
  'inherit', 'initial', 'unset', 'revert',
]);

function protectedRanges(text) {
  return [...text.matchAll(PROTECTED)].map((m) => [m.index, m.index + m[0].length]);
}

function isProtected(index, ranges) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

/** Every colour token outside quotes and url(), with its canonical value. */
function colorTokens(text) {
  const ranges = protectedRanges(text);
  return [...text.matchAll(COLOR_TOKEN)]
    .filter((m) => !isProtected(m.index, ranges))
    .map((m) => ({ index: m.index, raw: m[0], color: normalizeColor(m[0]) }))
    .filter((t) => t.color !== null);
}

function tally(keys) {
  const counts = new Map();
  for (const key of keys) counts.set(key, (counts.get(key) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Colours used in the CSS, most used first: [{ color: "#rrggbb", count }]. */
export function extractColors(text) {
  return tally(colorTokens(text).map((t) => t.color)).map(([color, count]) => ({ color, count }));
}

/** Replaces every spelling of `from` with `to`. Returns the text unchanged when nothing matches. */
export function replaceColor(text, from, to) {
  const target = normalizeColor(from);
  if (!target) return text;
  const hits = colorTokens(text).filter((t) => t.color === target);
  let out = text;
  for (const hit of hits.reverse()) {
    out = out.slice(0, hit.index) + to + out.slice(hit.index + hit.raw.length);
  }
  return out;
}

const unquote = (name) => name.trim().replace(/^["']|["']$/g, '').trim();

export function quoteFont(name) {
  return /^[A-Za-z_-][\w-]*$/.test(name) ? name : `'${name.replace(/'/g, "\\'")}'`;
}

function firstFamily(stack) {
  return unquote(stack.split(',')[0]);
}

/** Named fonts used as the first choice in font-family declarations, most used first. */
export function extractFonts(text) {
  const families = [...text.matchAll(FONT_DECL)]
    .map((m) => firstFamily(m[2]))
    .filter((name) => name && !GENERIC_FONTS.has(name.toLowerCase()));
  const spelling = new Map();
  for (const name of families) if (!spelling.has(name.toLowerCase())) spelling.set(name.toLowerCase(), name);
  return tally(families.map((n) => n.toLowerCase())).map(([key, count]) => ({ family: spelling.get(key), count }));
}

/** Replaces the font family `from` with `to` inside every font-family declaration. */
export function replaceFont(text, from, to) {
  const target = from.trim().toLowerCase();
  return text.replace(FONT_DECL, (whole, prefix, stack) => {
    const parts = stack.split(',').map((part) => {
      const name = unquote(part);
      if (name.toLowerCase() !== target) return part;
      return part.replace(part.trim(), quoteFont(to));
    });
    return prefix + parts.join(',');
  });
}
