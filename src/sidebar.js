// The left-hand panel: pages, the page's colours and fonts (swap them everywhere), and its sections.

import { h, clear } from './ui.js';
import { extractColors, extractFonts } from './theme.js';
import { readThemeCss } from './dom-theme.js';
import { FONT_LIBRARY } from './fonts.js';

const MAX_SWATCHES = 18;
const SECTION_SELECTOR = 'header, nav, main, section, article, aside, footer, [id]:not(script):not(style):not(link):not(meta)';
const MAX_SECTIONS = 40;

function sectionLabel(el) {
  const heading = el.querySelector('h1, h2, h3, h4');
  const text = (heading?.textContent || el.textContent || '').trim().replace(/\s+/g, ' ');
  const name = el.id ? `#${el.id}` : el.tagName.toLowerCase();
  return text ? `${name} · ${text.slice(0, 38)}${text.length > 38 ? '…' : ''}` : name;
}

const SKIP_HIDDEN = 'script, style, template, noscript, link, meta, title, svg *, option, datalist';

/**
 * Parts of the page that CSS hides and that hold text: other "pages" in a one-file site, inactive tabs,
 * wizard steps, collapsed panels. Only the outermost hidden element of each part is returned.
 */
export function findHiddenParts(doc) {
  const view = doc.defaultView;
  const found = [];
  for (const el of doc.body.querySelectorAll('*')) {
    if (el.matches(SKIP_HIDDEN) || found.some((outer) => outer.contains(el))) continue;
    const hidden = el.hasAttribute('data-unslop-hidden') || view.getComputedStyle(el).display === 'none';
    if (hidden && (el.textContent || '').trim()) found.push(el);
  }
  found.forEach((el) => el.setAttribute('data-unslop-hidden', ''));
  return found;
}

/** Top-level sections plus every hidden part, in page order, for the Sections list. */
export function findSections(doc) {
  const all = [...doc.body.querySelectorAll(SECTION_SELECTOR)];
  const topLevel = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
  const hiddenParts = findHiddenParts(doc);
  const items = [...new Set([...topLevel, ...hiddenParts])]
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return items.slice(0, MAX_SECTIONS).map((el) => ({ el, hidden: hiddenParts.includes(el), label: sectionLabel(el) }));
}

export function renderPages(list, pages, current, { onOpen, onRemove }) {
  clear(list);
  pages.forEach((page, i) => {
    list.appendChild(h('li', { class: i === current ? 'active' : '' }, [
      h('button', { type: 'button', class: 'page-link', text: page.name, 'aria-current': i === current ? 'page' : null, onclick: () => onOpen(i) }),
      pages.length > 1 ? h('button', { type: 'button', class: 'icon', title: `Remove ${page.name}`, 'aria-label': `Remove ${page.name}`, text: '×', onclick: () => onRemove(i) }) : null,
    ]));
  });
}

export function renderTheme(host, doc, { onColor, onFont, hasRuntimeCss }) {
  clear(host);
  const css = readThemeCss(doc);
  const colors = extractColors(css).slice(0, MAX_SWATCHES);
  const fonts = extractFonts(css);

  host.appendChild(h('h3', { text: 'Colours' }));
  if (!colors.length) host.appendChild(h('p', { class: 'muted', text: 'No colours found in the page styles.' }));
  const swatches = h('div', { class: 'swatches' });
  for (const { color, count } of colors) {
    const picker = h('input', { type: 'color', value: color.slice(0, 7), class: 'swatch-input', 'aria-label': `Change ${color} everywhere`, onchange: (e) => onColor(color, e.target.value) });
    swatches.appendChild(h('label', { class: 'swatch', title: `${color} · used ${count}× · click to change everywhere` }, [
      h('span', { class: 'swatch-chip', style: { background: color } }), picker,
    ]));
  }
  host.appendChild(swatches);
  if (hasRuntimeCss) host.appendChild(h('p', { class: 'muted small', text: 'Some colours come from Tailwind-style classes. To change those, select the element and use the right panel.' }));

  host.appendChild(h('h3', { text: 'Fonts' }));
  if (!fonts.length) host.appendChild(h('p', { class: 'muted', text: 'No named fonts found. Select text to set one.' }));
  for (const { family } of fonts) {
    const select = h('select', { 'aria-label': `Replace ${family} everywhere`, onchange: (e) => e.target.value && onFont(family, e.target.value) }, [
      h('option', { value: '', text: `${family} → change to…` }),
      ...FONT_LIBRARY.map((f) => h('option', { value: f.family, text: `${f.family} (${f.category})` })),
    ]);
    host.appendChild(h('div', { class: 'font-row' }, [select]));
  }
}

export function renderSections(host, doc, { onPick, revealOn, onReveal }) {
  clear(host);
  const sections = findSections(doc);
  const hiddenCount = sections.filter((s) => s.hidden).length;
  const toggle = h('input', { type: 'checkbox', checked: revealOn, onchange: (e) => onReveal(e.target.checked) });
  host.appendChild(h('label', { class: 'check reveal' }, [toggle, ` Show hidden parts${hiddenCount ? ` (${hiddenCount})` : ''}`]));
  const list = h('ul', { class: 'section-list' });
  for (const s of sections) {
    list.appendChild(h('li', {}, [h('button', { type: 'button', class: s.hidden ? 'is-hidden' : '', text: s.hidden ? `◌ ${s.label}` : s.label, onclick: () => onPick(s.el) })]));
  }
  host.appendChild(list);
}
