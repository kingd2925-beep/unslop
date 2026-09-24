// My Brand Kit: a person's own colours and fonts, applied to any page by colour *role*
// (background, text, accent, second accent) rather than by exact value.

import { normalizeColor } from './color.js';

export const DEFAULT_BRAND = Object.freeze({
  name: 'My brand',
  background: '#ffffff',
  text: '#111827',
  accent: '#2563eb',
  accent2: '#f59e0b',
  headingFont: 'Fraunces',
  bodyFont: 'Inter',
});

export const COLOR_ROLES = Object.freeze(['background', 'text', 'accent', 'accent2']);

const LIGHT_MIN = 0.8;
const DARK_MAX = 0.2;
const MUTED_MAX_SATURATION = 0.35;
const NEAR_BLACK = 0.03;
const TINT_MIN_SATURATION = 0.15;
const MAX_NAME = 40;
const FONT_NAME = /^[A-Za-z][A-Za-z0-9 _-]{0,59}$/;

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = channels(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(hex) {
  const values = channels(hex);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const lightness = (max + min) / 2;
  if (max === min) return 0;
  return (max - min) / (1 - Math.abs(2 * lightness - 1));
}

const isOpaque = (color) => /^#[0-9a-f]{6}$/.test(color);

/** WCAG contrast ratio between two opaque hex colours (1 to 21). */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Ready-made looks for a first try. Every one is checked for readable contrast in the tests. */
export const BRAND_PRESETS = Object.freeze([
  Object.freeze({ name: 'Studio', background: '#f3f4f0', text: '#111318', accent: '#ff4b2b', accent2: '#c2410c', headingFont: 'Bricolage Grotesque', bodyFont: 'Instrument Sans' }),
  Object.freeze({ name: 'Electric', background: '#f5f7ff', text: '#0b0d1a', accent: '#3f5bff', accent2: '#0e8a7e', headingFont: 'Space Grotesk', bodyFont: 'Inter' }),
  Object.freeze({ name: 'Editorial', background: '#fbf8f1', text: '#1a1714', accent: '#1f4d3a', accent2: '#2f6b4f', headingFont: 'Instrument Serif', bodyFont: 'DM Sans' }),
  Object.freeze({ name: 'Sunset', background: '#fff8f2', text: '#1c1210', accent: '#d9480f', accent2: '#a61e4d', headingFont: 'Syne', bodyFont: 'Manrope' }),
]);

/** Picks which page colour plays each role. Input: [{ color, count }] sorted by use. */
export function classifyPalette(colors) {
  const opaque = colors.filter((c) => isOpaque(c.color))
    .map((c) => ({ ...c, lum: luminance(c.color), sat: saturation(c.color) }));
  const byUse = (list) => [...list].sort((a, b) => b.count - a.count);
  const background = byUse(opaque.filter((c) => c.lum >= LIGHT_MIN))[0]?.color ?? null;
  const text = byUse(opaque.filter((c) => c.lum < DARK_MAX && (c.sat < MUTED_MAX_SATURATION || c.lum < NEAR_BLACK)))[0]?.color ?? null;
  const accents = byUse(opaque.filter((c) =>
    c.lum < LIGHT_MIN && c.lum >= NEAR_BLACK && c.sat >= MUTED_MAX_SATURATION && c.color !== text));
  return { background, text, accent: accents[0]?.color ?? null, accent2: accents[1]?.color ?? null };
}

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The swaps that would put `brand` on a page: { colors: [[from, to]], fonts: [[from, to]] }. */
export function planBrandSwaps(pageColors, pageFonts, brand) {
  const roles = classifyPalette(pageColors);
  const roleSwaps = COLOR_ROLES
    .filter((role) => roles[role] && brand[role] && roles[role] !== brand[role])
    .map((role) => [roles[role], brand[role]]);
  // Leftover light tints of the old theme (the lavender cast of a purple page) follow the background.
  const tintSwaps = pageColors
    .filter((c) => isOpaque(c.color) && c.color !== '#ffffff' && c.color !== roles.background && c.color !== brand.background)
    .filter((c) => luminance(c.color) >= LIGHT_MIN && saturation(c.color) >= TINT_MIN_SATURATION)
    .map((c) => [c.color, brand.background]);
  const colors = [...roleSwaps, ...tintSwaps];
  const targets = [brand.bodyFont, brand.headingFont];
  const fonts = pageFonts.slice(0, 2)
    .map((f, i) => [f.family, targets[i]])
    .filter(([from, to]) => to && !sameName(from, to));
  return { colors, fonts };
}

/** Accepts anything (e.g. an imported file) and returns a well-formed brand. */
export function sanitizeBrand(input) {
  const source = input && typeof input === 'object' ? input : {};
  const brand = { ...DEFAULT_BRAND };
  if (typeof source.name === 'string' && source.name.trim()) brand.name = source.name.trim().slice(0, MAX_NAME);
  for (const role of COLOR_ROLES) {
    const color = normalizeColor(typeof source[role] === 'string' ? source[role] : '');
    if (color) brand[role] = color.slice(0, 7);
  }
  for (const key of ['headingFont', 'bodyFont']) {
    if (typeof source[key] === 'string' && FONT_NAME.test(source[key].trim())) brand[key] = source[key].trim();
  }
  return Object.freeze(brand);
}

/** A brand built from a page's current look, filling gaps from the defaults. */
export function brandFromPage(pageColors, pageFonts) {
  const roles = classifyPalette(pageColors);
  const picked = Object.fromEntries(COLOR_ROLES.filter((r) => roles[r]).map((r) => [r, roles[r]]));
  return sanitizeBrand({
    name: 'My brand',
    ...picked,
    bodyFont: pageFonts[0]?.family,
    headingFont: pageFonts[1]?.family || pageFonts[0]?.family,
  });
}
