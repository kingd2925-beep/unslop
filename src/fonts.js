// A curated Google Fonts library, including Indian-script faces, plus helpers to load a font into a page.

import { quoteFont } from './theme.js';

const W = [400, 500, 600, 700];
const WIDE = [300, 400, 500, 600, 700, 800];

export const FONT_LIBRARY = Object.freeze([
  { family: 'Inter', category: 'Sans', weights: WIDE },
  { family: 'Manrope', category: 'Sans', weights: WIDE },
  { family: 'DM Sans', category: 'Sans', weights: W },
  { family: 'Plus Jakarta Sans', category: 'Sans', weights: WIDE },
  { family: 'Poppins', category: 'Sans', weights: WIDE },
  { family: 'Outfit', category: 'Sans', weights: WIDE },
  { family: 'Figtree', category: 'Sans', weights: WIDE },
  { family: 'Work Sans', category: 'Sans', weights: WIDE },
  { family: 'IBM Plex Sans', category: 'Sans', weights: W },
  { family: 'Space Grotesk', category: 'Sans', weights: W },
  { family: 'Nunito', category: 'Sans', weights: WIDE },
  { family: 'Rubik', category: 'Sans', weights: WIDE },
  { family: 'Instrument Sans', category: 'Sans', weights: W },
  { family: 'Playfair Display', category: 'Serif', weights: W },
  { family: 'Fraunces', category: 'Serif', weights: WIDE },
  { family: 'Lora', category: 'Serif', weights: W },
  { family: 'Merriweather', category: 'Serif', weights: [300, 400, 700] },
  { family: 'Source Serif 4', category: 'Serif', weights: W },
  { family: 'Libre Baskerville', category: 'Serif', weights: [400, 700] },
  { family: 'Cormorant Garamond', category: 'Serif', weights: W },
  { family: 'DM Serif Display', category: 'Serif', weights: [400] },
  { family: 'Instrument Serif', category: 'Serif', weights: [400] },
  { family: 'Bricolage Grotesque', category: 'Display', weights: WIDE },
  { family: 'Syne', category: 'Display', weights: W },
  { family: 'Archivo Black', category: 'Display', weights: [400] },
  { family: 'Bebas Neue', category: 'Display', weights: [400] },
  { family: 'Abril Fatface', category: 'Display', weights: [400] },
  { family: 'JetBrains Mono', category: 'Mono', weights: W },
  { family: 'Space Mono', category: 'Mono', weights: [400, 700] },
  { family: 'IBM Plex Mono', category: 'Mono', weights: W },
  { family: 'Martian Mono', category: 'Mono', weights: W },
  { family: 'Caveat', category: 'Handwriting', weights: W },
  { family: 'Hind', category: 'Indian scripts', weights: [300, 400, 500, 600, 700] },
  { family: 'Mukta', category: 'Indian scripts', weights: WIDE },
  { family: 'Noto Sans Devanagari', category: 'Indian scripts', weights: W },
  { family: 'Tiro Devanagari Hindi', category: 'Indian scripts', weights: [400] },
]);

const FALLBACK = { Sans: 'sans-serif', Serif: 'serif', Display: 'sans-serif', Mono: 'monospace', Handwriting: 'cursive' };

export function findFont(family) {
  const key = family.trim().toLowerCase();
  return FONT_LIBRARY.find((f) => f.family.toLowerCase() === key) || null;
}

export function fontStack(family) {
  const font = findFont(family);
  return `${quoteFont(family)}, ${FALLBACK[font?.category] || 'sans-serif'}`;
}

export function googleFontsHref(font) {
  const name = font.family.replace(/ /g, '+');
  const axis = font.weights.length > 1 ? `:wght@${font.weights.join(';')}` : '';
  return `https://fonts.googleapis.com/css2?family=${name}${axis}&display=swap`;
}

/** Adds the Google Fonts stylesheet for a library font to the page once. Unknown fonts are left alone. */
export function ensureFontLink(doc, family) {
  const font = findFont(family);
  if (!font) return;
  const href = googleFontsHref(font);
  const already = [...doc.querySelectorAll('link[rel~="stylesheet"]')].some((l) => l.getAttribute('href') === href);
  if (already) return;
  const link = doc.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', href);
  (doc.head || doc.documentElement).appendChild(link);
}
