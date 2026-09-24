// The "My brand" card: save your own colours and fonts once, apply them to any AI-made page in one click.

import { h, clear, field, toast } from './ui.js';
import { COLOR_ROLES, sanitizeBrand, brandFromPage } from './brand.js';
import { loadBrandData, saveBrandData } from './persist.js';
import { FONT_LIBRARY } from './fonts.js';
import { downloadText } from './exporter.js';

const ROLE_LABELS = { background: 'Background', text: 'Text', accent: 'Main accent', accent2: 'Second accent' };
const MAX_IMPORT_BYTES = 20000;

export function currentBrand() {
  const data = loadBrandData();
  return data ? sanitizeBrand(data) : null;
}

function persist(brand) {
  if (!saveBrandData(brand)) toast('Your browser blocked saving. Export the brand file to keep it.', 'warn');
}

function fontSelect(value, onChange) {
  const known = FONT_LIBRARY.some((f) => f.family === value);
  return h('select', { onchange: (e) => onChange(e.target.value) }, [
    known ? null : h('option', { value, text: value, selected: true }),
    ...FONT_LIBRARY.map((f) => h('option', { value: f.family, text: `${f.family} (${f.category})`, selected: f.family === value })),
  ]);
}

function editDialog(brand, onSave) {
  let draft = { ...brand };
  const dialog = h('dialog', { class: 'brand-dialog' });
  const set = (key, value) => { draft = { ...draft, [key]: value }; };
  const form = h('form', { method: 'dialog' }, [
    h('h2', { text: 'My brand' }),
    h('p', { class: 'muted', text: 'Saved in this browser only. Apply it to any page with one click.' }),
    field('Name', h('input', { type: 'text', value: draft.name, maxlength: 40, oninput: (e) => set('name', e.target.value) })),
    h('div', { class: 'field-row' }, COLOR_ROLES.map((role) =>
      field(ROLE_LABELS[role], h('input', { type: 'color', value: draft[role], oninput: (e) => set(role, e.target.value) })))),
    h('div', { class: 'field-row' }, [
      field('Heading font', fontSelect(draft.headingFont, (v) => set('headingFont', v))),
      field('Body font', fontSelect(draft.bodyFont, (v) => set('bodyFont', v))),
    ]),
    h('div', { class: 'button-row end' }, [
      h('button', { type: 'submit', value: 'cancel', text: 'Cancel' }),
      h('button', { type: 'submit', value: 'save', class: 'primary', text: 'Save brand' }),
    ]),
  ]);
  form.addEventListener('submit', (e) => { if (e.submitter?.value === 'save') onSave(sanitizeBrand(draft)); });
  dialog.appendChild(form);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.appendChild(dialog);
  dialog.showModal();
}

function importBrand(onLoaded) {
  const input = h('input', { type: 'file', accept: '.json,application/json' });
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { toast('That file is too big to be a brand file.', 'warn'); return; }
    try {
      onLoaded(sanitizeBrand(JSON.parse(await file.text())));
    } catch {
      toast('That file is not a valid brand file.', 'warn');
    }
  });
  input.click();
}

/** Renders the card. `pageLook()` returns { colors, fonts } of the open page; `onApply(brand)` applies it. */
export function renderBrandCard(host, { pageLook, onApply }) {
  clear(host);
  const brand = currentBrand();
  const rerender = () => renderBrandCard(host, { pageLook, onApply });
  const save = (next) => { persist(next); rerender(); toast(`Saved "${next.name}".`, 'success'); };

  host.appendChild(h('h3', { text: 'My brand' }));
  if (!brand) {
    host.appendChild(h('p', { class: 'muted small', text: 'Save your colours and fonts once. Then put them on any AI-made page in one click.' }));
    host.appendChild(h('div', { class: 'button-row' }, [
      h('button', { type: 'button', text: 'Use this page\'s look', onclick: () => { const look = pageLook(); save(brandFromPage(look.colors, look.fonts)); } }),
      h('button', { type: 'button', text: 'Create…', onclick: () => editDialog(sanitizeBrand({}), save) }),
      h('button', { type: 'button', text: 'Import…', onclick: () => importBrand(save) }),
    ]));
    return;
  }
  host.appendChild(h('div', { class: 'brand-card' }, [
    h('div', { class: 'brand-chips' }, COLOR_ROLES.map((role) => h('span', { class: 'swatch-chip small-chip', title: `${ROLE_LABELS[role]}: ${brand[role]}`, style: { background: brand[role] } }))),
    h('div', { class: 'small' }, [h('b', { text: brand.name }), h('span', { class: 'muted', text: ` · ${brand.headingFont} / ${brand.bodyFont}` })]),
  ]));
  host.appendChild(h('div', { class: 'button-row' }, [
    h('button', { type: 'button', class: 'primary', text: 'Apply my brand', onclick: () => onApply(brand) }),
    h('button', { type: 'button', text: 'Edit', onclick: () => editDialog(brand, save) }),
  ]));
  host.appendChild(h('div', { class: 'button-row' }, [
    h('button', { type: 'button', class: 'link-button', text: 'Use this page\'s look', onclick: () => { const look = pageLook(); save(brandFromPage(look.colors, look.fonts)); } }),
    h('button', { type: 'button', class: 'link-button', text: 'Export', onclick: () => downloadText('my-brand.json', JSON.stringify(brand, null, 2), 'application/json') }),
    h('button', { type: 'button', class: 'link-button', text: 'Import', onclick: () => importBrand(save) }),
  ]));
}
