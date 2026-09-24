// Start-up: wires the page's buttons, drag and drop, paste and shortcuts to the editor.

import { createApp } from './app.js';
import { filesFromDrop, filesFromInput, loadDroppedFiles } from './loader.js';
import { loadProject } from './persist.js';
import { SAMPLE_PAGES } from './sample-site.js';
import { toast, storageGet, storageSet } from './ui.js';
import { mountShowcase } from './showcase.js';

const HINT_KEY = 'unslop:hint-dismissed';
const DEVICE_WIDTHS = { desktop: null, tablet: 820, mobile: 390 };
const $ = (id) => document.getElementById(id);

const app = createApp({
  stage: $('stage'),
  pagesList: $('pages-list'),
  themeHost: $('theme'),
  brandHost: $('brand'),
  sectionsHost: $('sections'),
  inspector: $('inspector'),
  undoButton: $('undo'),
  redoButton: $('redo'),
  showWelcome: (on) => {
    $('welcome').hidden = !on;
    document.body.classList.toggle('has-project', !on);
  },
  setBusy: (on) => $('stage').classList.toggle('busy', on),
  setMode: (mode) => {
    for (const b of document.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    document.body.dataset.mode = mode;
  },
});

async function openItems(items) {
  if (!items.length) return;
  try {
    const { pages, skipped } = await loadDroppedFiles(items);
    if (!pages.length) {
      toast('No .html file found. Drop an HTML page, or a folder that contains one.', 'warn');
      return;
    }
    await app.load(pages, { append: app.hasProject() });
    if (skipped.length) toast(`Skipped ${skipped.length} file${skipped.length === 1 ? '' : 's'} that are not HTML, CSS, JS or images.`);
  } catch (err) {
    console.error('unslop: could not open files', err);
    toast('Those files could not be opened. Try one .html file first.', 'error');
  }
}

function wireOpening() {
  const fileInput = $('file-input');
  const folderInput = $('folder-input');
  fileInput.addEventListener('change', () => { openItems(filesFromInput(fileInput.files)); fileInput.value = ''; });
  folderInput.addEventListener('change', () => { openItems(filesFromInput(folderInput.files)); folderInput.value = ''; });
  for (const b of document.querySelectorAll('[data-action="open-files"]')) b.addEventListener('click', () => fileInput.click());
  for (const b of document.querySelectorAll('[data-action="open-folder"]')) b.addEventListener('click', () => folderInput.click());
  for (const b of document.querySelectorAll('[data-action="sample"]')) b.addEventListener('click', () => app.load(SAMPLE_PAGES, { append: false }));
  for (const b of document.querySelectorAll('[data-action="paste"]')) b.addEventListener('click', () => { $('paste-text').value = ''; $('paste-dialog').showModal(); });

  $('paste-form').addEventListener('submit', (e) => {
    const html = $('paste-text').value.trim();
    if (e.submitter?.value !== 'open') return;
    if (!html.includes('<')) {
      e.preventDefault();
      toast('That does not look like HTML. Paste the full code of your page.', 'warn');
      return;
    }
    app.load([{ name: 'index.html', html }], { append: app.hasProject() });
  });

  const saved = loadProject();
  const restore = $('restore');
  if (saved) {
    restore.hidden = false;
    restore.textContent = `Restore last session (${saved.pages.length} page${saved.pages.length === 1 ? '' : 's'})`;
    restore.addEventListener('click', () => app.load(saved.pages, { append: false }));
  }
}

function wireDragAndDrop() {
  let depth = 0;
  const overlay = $('drop-overlay');
  window.addEventListener('dragenter', (e) => { e.preventDefault(); depth += 1; overlay.hidden = false; });
  window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) overlay.hidden = true; });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    depth = 0;
    overlay.hidden = true;
    openItems(await filesFromDrop(e.dataTransfer));
  });
}

function wireToolbar() {
  for (const b of document.querySelectorAll('[data-mode]')) b.addEventListener('click', () => app.setMode(b.dataset.mode));
  for (const b of document.querySelectorAll('[data-device]')) {
    b.addEventListener('click', () => {
      app.setDevice(DEVICE_WIDTHS[b.dataset.device]);
      for (const other of document.querySelectorAll('[data-device]')) other.setAttribute('aria-pressed', String(other === b));
    });
  }
  $('undo').addEventListener('click', app.undo);
  $('redo').addEventListener('click', app.redo);
  $('export-page').addEventListener('click', app.exportPage);
  $('export-all').addEventListener('click', app.exportAll);
  $('copy-html').addEventListener('click', app.copyHtml);
  document.addEventListener('keydown', app.handleKey);
}

function wireHint() {
  const hint = $('hint');
  if (storageGet(HINT_KEY) === '1') hint.hidden = true;
  $('hint-close').addEventListener('click', () => { hint.hidden = true; storageSet(HINT_KEY, '1'); });
  $('hint-show').addEventListener('click', () => { hint.hidden = false; });
}

mountShowcase($('showcase'));
wireOpening();
wireDragAndDrop();
wireToolbar();
wireHint();
