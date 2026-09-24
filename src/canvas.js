// The page frames. Two sandboxes, never mixed:
//  - Edit:    sandbox="allow-same-origin" with NO scripts. The editor can reach the DOM; the page's code cannot run.
//  - Preview: sandbox="allow-scripts" with NO same-origin. The page runs, sealed off from the editor.

import { buildPreviewHtml, runtimeStyles } from './probe.js';

const EDIT_SANDBOX = 'allow-same-origin';
const PREVIEW_SANDBOX = 'allow-scripts';
const PROBE_TIMEOUT_MS = 5000;
const PROBE_VIEWPORT = { width: 1280, height: 900 };

const EDITOR_CSS = `
[data-unslop-hover]{outline:2px dashed #8b5cf6 !important;outline-offset:2px !important;cursor:pointer !important}
[data-unslop-selected]{outline:2px solid #7c3aed !important;outline-offset:2px !important}
[data-unslop-editing]{outline:2px solid #10b981 !important;outline-offset:2px !important;cursor:text !important}
html[data-unslop-reveal] [data-unslop-hidden]{display:block !important;outline:2px dashed #f59e0b !important;outline-offset:-2px !important}
`;

function newToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function makeFrame(sandbox, title) {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', sandbox);
  frame.setAttribute('title', title);
  frame.setAttribute('referrerpolicy', 'no-referrer');
  return frame;
}

const loaded = (frame) => new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));

function addStyle(doc, css, marker) {
  const style = doc.createElement('style');
  style.setAttribute('data-unslop-ui', marker);
  style.textContent = css;
  (doc.head || doc.documentElement).appendChild(style);
}

/** Text a visitor would see without JavaScript (scripts, styles and templates excluded). */
export function staticTextLength(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript, template').forEach((el) => el.remove());
  return (doc.body?.textContent || '').trim().length;
}

export function sourceStyles(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('style')].map((s) => s.textContent);
}

/**
 * Runs the page once, invisibly, in the preview sandbox and reports what JavaScript produced:
 * { runtimeCss, renderedText, renderedHtml } or null if the page never answered.
 */
export function probePage(html) {
  return new Promise((resolve) => {
    const token = newToken();
    const frame = makeFrame(PREVIEW_SANDBOX, 'Page probe');
    Object.assign(frame.style, {
      position: 'fixed', left: '-20000px', top: '0', border: '0',
      width: `${PROBE_VIEWPORT.width}px`, height: `${PROBE_VIEWPORT.height}px`, visibility: 'hidden',
    });
    const finish = (result) => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      frame.remove();
      resolve(result);
    };
    const onMessage = (event) => {
      const data = event.data;
      if (event.source !== frame.contentWindow || !data || data.unslop !== token || data.type !== 'probe') return;
      const styles = Array.isArray(data.styles) ? data.styles.filter((s) => typeof s === 'string') : [];
      finish({
        runtimeCss: runtimeStyles(sourceStyles(html), styles),
        renderedText: Number(data.text) || 0,
        renderedHtml: typeof data.html === 'string' ? data.html : '',
      });
    };
    const timer = setTimeout(() => finish(null), PROBE_TIMEOUT_MS);
    window.addEventListener('message', onMessage);
    document.body.appendChild(frame);
    frame.srcdoc = buildPreviewHtml(html, token);
  });
}

/** The visible stage: shows one frame at a time and reports link clicks made in preview. */
export function createCanvas(stage, { onNavigate }) {
  let frame = null;
  let token = null;

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!frame || event.source !== frame.contentWindow || !data || data.unslop !== token) return;
    if (data.type === 'nav' && typeof data.href === 'string') onNavigate(data.href);
  });

  function mount(next) {
    if (frame) frame.remove();
    frame = next;
    frame.className = 'canvas-frame';
    stage.appendChild(frame);
    return frame;
  }

  async function showEdit(html, runtimeCss) {
    token = null;
    const f = mount(makeFrame(EDIT_SANDBOX, 'Editable page'));
    const ready = loaded(f);
    f.srcdoc = html;
    await ready;
    const doc = f.contentDocument;
    if (runtimeCss) addStyle(doc, runtimeCss, 'runtime');
    addStyle(doc, EDITOR_CSS, 'editor');
    return doc;
  }

  function showPreview(html) {
    token = newToken();
    const f = mount(makeFrame(PREVIEW_SANDBOX, 'Live preview'));
    f.srcdoc = buildPreviewHtml(html, token);
  }

  function setWidth(px) {
    stage.style.setProperty('--canvas-width', px ? `${px}px` : '100%');
  }

  return { showEdit, showPreview, setWidth };
}
