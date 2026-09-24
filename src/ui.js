// Tiny DOM helpers for the editor's own interface. Text always goes in as textContent, never innerHTML,
// so names and text taken from a dropped page can never inject markup into the editor.

export function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'text') el.textContent = value;
    else if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

const TOAST_MS = 4200;

export function toast(message, tone = 'info') {
  const host = document.getElementById('toasts');
  if (!host) return;
  const note = h('div', { class: `toast toast-${tone}`, role: 'status', text: message });
  host.appendChild(note);
  setTimeout(() => note.remove(), TOAST_MS);
}

export function field(label, control, hint) {
  return h('label', { class: 'field' }, [h('span', { class: 'field-label', text: label }), control, hint ? h('span', { class: 'field-hint', text: hint }) : null]);
}

export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

export function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function storageSet(key, value) {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}

export function storageRemove(key) {
  try { window.localStorage.removeItem(key); } catch { /* storage unavailable: nothing to remove */ }
}
