// Turns the edited page back into clean HTML: everything the editor added is removed.

import { createZip } from './zip.js';

const EDITOR_ATTR_PREFIX = 'data-unslop-';

function doctypeString(doc) {
  const dt = doc.doctype;
  if (!dt) return '';
  const pub = dt.publicId ? ` PUBLIC "${dt.publicId}"` : '';
  const sys = dt.systemId ? `${dt.publicId ? '' : ' SYSTEM'} "${dt.systemId}"` : '';
  return `<!DOCTYPE ${dt.name}${pub}${sys}>\n`;
}

function stripEditorAttributes(el) {
  for (const attr of [...el.attributes]) {
    if (attr.name.startsWith(EDITOR_ATTR_PREFIX)) el.removeAttribute(attr.name);
  }
}

/** Clean HTML for a document that is (or was) open in the editor. */
export function serializePage(doc) {
  const clone = doc.documentElement.cloneNode(true);
  clone.querySelectorAll('[data-unslop-ui]').forEach((el) => el.remove());
  clone.querySelectorAll('[data-unslop-editing]').forEach((el) => el.removeAttribute('contenteditable'));
  stripEditorAttributes(clone);
  clone.querySelectorAll('*').forEach(stripEditorAttributes);
  return doctypeString(doc) + clone.outerHTML;
}

function saveBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(fileName, text, type = 'text/plain') {
  saveBlob(fileName, new Blob([text], { type: `${type};charset=utf-8` }));
}

export const downloadHtml = (fileName, html) => downloadText(fileName, html, 'text/html');

/** One page downloads as .html; several download as one website.zip. */
export function downloadSite(pages) {
  if (pages.length === 1) {
    downloadHtml(pages[0].name, pages[0].html);
    return;
  }
  const zip = createZip(pages.map((p) => ({ name: p.name, text: p.html })));
  saveBlob('website.zip', new Blob([zip], { type: 'application/zip' }));
}
