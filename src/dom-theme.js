// Applies theme swaps to a live page: every <style> block, every style="" attribute,
// and SVG colour attributes. Editor-owned styles are never touched.

import { replaceColor, replaceFont, extractColors, extractFonts } from './theme.js';
import { ensureFontLink, fontStack } from './fonts.js';
import { planBrandSwaps, classifyPalette } from './brand.js';

const COLOR_ATTRIBUTES = ['fill', 'stroke', 'stop-color', 'color', 'bgcolor'];

function cssSources(doc) {
  const styles = [...doc.querySelectorAll('style:not([data-unslop-ui])')].map((el) => ({
    read: () => el.textContent,
    write: (text) => { el.textContent = text; },
  }));
  const inline = [...doc.querySelectorAll('[style]')].map((el) => ({
    read: () => el.getAttribute('style'),
    write: (text) => el.setAttribute('style', text),
  }));
  const attrs = COLOR_ATTRIBUTES.flatMap((name) =>
    [...doc.querySelectorAll(`[${name}]`)].map((el) => ({
      read: () => el.getAttribute(name),
      write: (text) => el.setAttribute(name, text),
    })));
  return [...styles, ...inline, ...attrs];
}

/** All page-owned CSS as one text, for extracting the palette and fonts. */
export function readThemeCss(doc) {
  return cssSources(doc).map((s) => s.read()).join('\n');
}

function rewriteAll(doc, transform) {
  let changed = 0;
  for (const source of cssSources(doc)) {
    const before = source.read();
    const after = transform(before);
    if (after !== before) {
      source.write(after);
      changed += 1;
    }
  }
  return changed;
}

/** Swaps one colour for another everywhere in the page. Returns how many places changed. */
export function swapColor(doc, from, to) {
  return rewriteAll(doc, (text) => replaceColor(text, from, to));
}

/** Swaps one font family for another everywhere, loading the new font when it is in the library. */
export function swapFont(doc, from, to) {
  const changed = rewriteAll(doc, (text) => replaceFont(text, from, to));
  if (changed > 0) ensureFontLink(doc, to);
  return changed;
}

const TEMP_COLOR_BASE = 0xfe0100;

function temporaryColors(count, usedColors) {
  const used = new Set(usedColors);
  const temps = [];
  for (let n = TEMP_COLOR_BASE; temps.length < count; n += 1) {
    const hex = `#${n.toString(16).padStart(6, '0')}`;
    if (!used.has(hex)) temps.push(hex);
  }
  return temps;
}

/**
 * Applies a set of colour and font swaps as if all happened at once, so "A->B, B->A" does not
 * collapse into one value. Each source goes to a temporary value first, then to its target.
 */
export function applySwapPlan(doc, plan, usedColors) {
  const temps = temporaryColors(plan.colors.length, usedColors);
  let changed = 0;
  plan.colors.forEach(([from], i) => { changed += swapColor(doc, from, temps[i]); });
  plan.colors.forEach(([, to], i) => { swapColor(doc, temps[i], to); });
  plan.fonts.forEach(([from], i) => { changed += rewriteAll(doc, (text) => replaceFont(text, from, `unslop-tmp-${i}`)); });
  plan.fonts.forEach(([, to], i) => { swapFont(doc, `unslop-tmp-${i}`, to); });
  return changed;
}

/** Adds brand font rules for what a page does not name itself: body text, headings, or both. */
function addFontRules(doc, brand, { body, headings }) {
  const rules = [];
  if (body) { ensureFontLink(doc, brand.bodyFont); rules.push(`body{font-family:${fontStack(brand.bodyFont)}}`); }
  if (headings) { ensureFontLink(doc, brand.headingFont); rules.push(`h1,h2,h3,h4,h5,h6{font-family:${fontStack(brand.headingFont)}}`); }
  if (!rules.length) return 0;
  const style = doc.createElement('style');
  style.textContent = rules.join('');
  (doc.head || doc.documentElement).appendChild(style);
  return rules.length;
}

/**
 * Puts a brand (or preset look) on a page: colours by role, fonts by use.
 * Works on the live edit document and on a DOMParser document alike.
 * Returns { changed, rolesFound, colors, fonts } where colors/fonts count what changed.
 */
export function applyBrandToDocument(doc, brand) {
  const css = readThemeCss(doc);
  const colors = extractColors(css);
  const fonts = extractFonts(css);
  const plan = planBrandSwaps(colors, fonts, brand);
  const needsBody = fonts.length === 0;
  const needsHeadings = fonts.length < 2 && !fonts.some((f) => f.family.toLowerCase() === brand.headingFont.toLowerCase());
  if (!plan.colors.length && !plan.fonts.length && !needsBody && !needsHeadings) {
    return { changed: false, rolesFound: Object.values(classifyPalette(colors)).some(Boolean), colors: 0, fonts: 0 };
  }
  applySwapPlan(doc, plan, colors.map((c) => c.color));
  const added = addFontRules(doc, brand, { body: needsBody, headings: needsHeadings });
  return { changed: true, rolesFound: true, colors: plan.colors.length, fonts: plan.fonts.length + added };
}
