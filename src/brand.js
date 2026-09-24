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
  const colors = COLOR_ROLES
    .filter((role) => roles[role] && brand[role] && roles[role] !== brand[role])
    .map((role) => [roles[role], brand[role]]);
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
