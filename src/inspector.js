// The right-hand panel: everything you can change about the selected element.

import { h, field, clear } from './ui.js';
import { normalizeColor } from './color.js';
import { FONT_LIBRARY, fontStack, ensureFontLink } from './fonts.js';
import { isTextElement } from './editor.js';

const TAG_NAMES = {
  H1: 'Heading 1', H2: 'Heading 2', H3: 'Heading 3', H4: 'Heading 4', H5: 'Heading 5', H6: 'Heading 6',
  P: 'Paragraph', A: 'Link', BUTTON: 'Button', IMG: 'Image', LI: 'List item', UL: 'List', OL: 'List',
  SECTION: 'Section', HEADER: 'Header', FOOTER: 'Footer', NAV: 'Navigation', DIV: 'Box', SPAN: 'Text',
  MAIN: 'Main area', ARTICLE: 'Article', BODY: 'Page', svg: 'Icon', TD: 'Table cell', TH: 'Table header',
};
const WEIGHTS = [300, 400, 500, 600, 700, 800, 900];

const describe = (el) => TAG_NAMES[el.tagName] || el.tagName.toLowerCase();

function hexOf(value, fallback = '#000000') {
  const hex = normalizeColor(value || '');
  return hex ? hex.slice(0, 7) : fallback;
}

const leadingFamily = (value) => (value || '').split(',')[0].trim().replace(/^["']|["']$/g, '');

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Builds the inspector for `el`. `commit()` records the change for undo and autosave. */
export function renderInspector(panel, el, { commit, actions }) {
  clear(panel);
  if (!el) {
    panel.appendChild(h('div', { class: 'empty-note' }, [
      h('p', { text: 'Click anything on the page to change it.' }),
      h('p', { class: 'muted', text: 'Click text to type straight into it. Enter finishes, Shift+Enter adds a line.' }),
    ]));
    return;
  }
  const doc = el.ownerDocument;
  const cs = doc.defaultView.getComputedStyle(el);
  const setStyle = (prop, value) => { el.style.setProperty(prop, value); commit(); };

  panel.appendChild(h('div', { class: 'inspector-head' }, [
    h('strong', { text: describe(el) }),
    h('div', { class: 'button-row' }, [
      h('button', { type: 'button', title: 'Select the box around this', text: '↑ Parent', onclick: actions.selectParent }),
      h('button', { type: 'button', title: 'Duplicate', text: 'Duplicate', onclick: actions.duplicate }),
      h('button', { type: 'button', title: 'Move up', text: '▲', onclick: () => actions.move(-1) }),
      h('button', { type: 'button', title: 'Move down', text: '▼', onclick: () => actions.move(1) }),
      h('button', { type: 'button', title: 'Hide this element', text: 'Hide', onclick: actions.hide }),
      h('button', { type: 'button', class: 'danger', title: 'Delete (Del key)', text: 'Delete', onclick: actions.remove }),
    ]),
  ]));

  if (isTextElement(el) || ['A', 'BUTTON'].includes(el.tagName)) panel.appendChild(textSection(el, cs, setStyle, doc, commit));
  if (el.tagName === 'IMG') panel.appendChild(imageSection(el, commit));
  const link = el.closest('a');
  if (link) panel.appendChild(linkSection(link, commit));
  panel.appendChild(boxSection(el, cs, setStyle));
}

function textSection(el, cs, setStyle, doc) {
  const current = leadingFamily(cs.fontFamily);
  const fontSelect = h('select', {
    onchange: (e) => { ensureFontLink(doc, e.target.value); setStyle('font-family', fontStack(e.target.value)); },
  }, [
    h('option', { value: current, text: `${current} (current)` }),
    ...[...new Set(FONT_LIBRARY.map((f) => f.category))].map((cat) =>
      h('optgroup', { label: cat }, FONT_LIBRARY.filter((f) => f.category === cat).map((f) => h('option', { value: f.family, text: f.family })))),
  ]);
  const size = h('input', { type: 'number', min: 6, max: 400, value: Math.round(parseFloat(cs.fontSize)), onchange: (e) => setStyle('font-size', `${e.target.value}px`) });
  const weight = h('select', { onchange: (e) => setStyle('font-weight', e.target.value) },
    WEIGHTS.map((w) => h('option', { value: w, text: String(w), selected: String(w) === cs.fontWeight })));
  const color = h('input', { type: 'color', value: hexOf(cs.color), oninput: (e) => el.style.setProperty('color', e.target.value), onchange: (e) => setStyle('color', e.target.value) });
  const align = h('div', { class: 'segmented' }, ['left', 'center', 'right'].map((a) =>
    h('button', { type: 'button', class: cs.textAlign === a ? 'active' : '', text: a[0].toUpperCase() + a.slice(1), onclick: () => setStyle('text-align', a) })));
  const italic = h('button', { type: 'button', class: cs.fontStyle === 'italic' ? 'active' : '', text: 'Italic', onclick: () => setStyle('font-style', cs.fontStyle === 'italic' ? 'normal' : 'italic') });
  return h('section', { class: 'panel-section' }, [
    h('h3', { text: 'Text' }),
    field('Font', fontSelect),
    h('div', { class: 'field-row' }, [field('Size (px)', size), field('Weight', weight)]),
    h('div', { class: 'field-row' }, [field('Colour', color), field('Style', italic)]),
    field('Align', align),
  ]);
}

function imageSection(img, commit) {
  const fileInput = h('input', {
    type: 'file', accept: 'image/*', class: 'visually-hidden',
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      img.setAttribute('src', await readImageFile(file));
      img.removeAttribute('srcset');
      commit();
    },
  });
  const url = h('input', { type: 'url', placeholder: 'https://…', value: img.getAttribute('src')?.startsWith('data:') ? '' : img.getAttribute('src') || '', onchange: (e) => { img.setAttribute('src', e.target.value); img.removeAttribute('srcset'); commit(); } });
  const alt = h('input', { type: 'text', value: img.getAttribute('alt') || '', placeholder: 'Describe the image', onchange: (e) => { img.setAttribute('alt', e.target.value); commit(); } });
  const fit = h('select', { onchange: (e) => { img.style.setProperty('object-fit', e.target.value); commit(); } },
    ['cover', 'contain', 'fill'].map((v) => h('option', { value: v, text: v, selected: img.style.objectFit === v })));
  return h('section', { class: 'panel-section' }, [
    h('h3', { text: 'Image' }),
    h('button', { type: 'button', class: 'primary', text: 'Replace image…', onclick: () => fileInput.click() }), fileInput,
    field('Or image URL', url),
    field('Alt text', alt, 'Screen readers and Google read this.'),
    field('Fit', fit),
  ]);
}

function linkSection(link, commit) {
  const href = h('input', { type: 'text', value: link.getAttribute('href') || '', placeholder: 'https://… or about.html', onchange: (e) => { link.setAttribute('href', e.target.value); commit(); } });
  const newTab = h('input', { type: 'checkbox', checked: link.getAttribute('target') === '_blank', onchange: (e) => {
    if (e.target.checked) { link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener'); } else { link.removeAttribute('target'); }
    commit();
  } });
  return h('section', { class: 'panel-section' }, [h('h3', { text: 'Link' }), field('Goes to', href), h('label', { class: 'check' }, [newTab, ' Open in a new tab'])]);
}

function boxSection(el, cs, setStyle) {
  const transparent = cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent';
  const bg = h('input', { type: 'color', value: transparent ? '#ffffff' : hexOf(cs.backgroundColor, '#ffffff'), oninput: (e) => el.style.setProperty('background-color', e.target.value), onchange: (e) => setStyle('background-color', e.target.value) });
  const noBg = h('button', { type: 'button', text: 'None', onclick: () => { el.style.setProperty('background', 'none'); setStyle('background-color', 'transparent'); } });
  const px = (v) => Math.round(parseFloat(v) || 0);
  const padding = h('input', { type: 'number', min: 0, max: 400, value: px(cs.paddingTop), onchange: (e) => setStyle('padding', `${e.target.value}px`) });
  const radius = h('input', { type: 'number', min: 0, max: 400, value: px(cs.borderTopLeftRadius), onchange: (e) => setStyle('border-radius', `${e.target.value}px`) });
  const opacity = h('input', { type: 'range', min: 0, max: 100, value: Math.round(parseFloat(cs.opacity) * 100), onchange: (e) => setStyle('opacity', String(e.target.value / 100)) });
  return h('section', { class: 'panel-section' }, [
    h('h3', { text: 'Box' }),
    field('Background', h('div', { class: 'inline' }, [bg, noBg])),
    h('div', { class: 'field-row' }, [field('Padding (px)', padding), field('Corners (px)', radius)]),
    field('Opacity', opacity),
  ]);
}
