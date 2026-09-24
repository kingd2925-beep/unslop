// The editor controller: pages, undo history, edit/preview modes, theme swaps and export.

import { createHistory, record, undo, redo, canUndo, canRedo } from './history.js';
import { createCanvas, probePage, staticTextLength } from './canvas.js';
import { attachEditor } from './editor.js';
import { renderInspector } from './inspector.js';
import { renderPages, renderTheme, renderSections } from './sidebar.js';
import { serializePage, downloadHtml, downloadSite } from './exporter.js';
import { swapColor, swapFont, readThemeCss, applySwapPlan } from './dom-theme.js';
import { extractColors, extractFonts } from './theme.js';
import { planBrandSwaps } from './brand.js';
import { renderBrandCard } from './brand-panel.js';
import { ensureFontLink, fontStack } from './fonts.js';
import { resolvePageLink, uniquePageName } from './pages.js';
import { saveProject } from './persist.js';
import { h, clear, toast } from './ui.js';

const JS_RENDERED = { maxStaticText: 20, minRenderedText: 100 };
const SAVE_DELAY_MS = 800;
const EDITOR_MARKS = ['data-unslop-selected', 'data-unslop-hover', 'data-unslop-editing', 'contenteditable'];

/** Turns a page that JavaScript builds into plain HTML: the rendered result, without its scripts. */
function flattenRendered(renderedHtml) {
  const doc = new DOMParser().parseFromString(renderedHtml, 'text/html');
  doc.querySelectorAll('script').forEach((s) => s.remove());
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

function isTypingTarget(target) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export function createApp(els) {
  let pages = [];
  let histories = [];
  let runtime = [];
  let current = 0;
  let mode = 'edit';
  let revealOn = false;
  let doc = null;
  let editor = null;
  let saveTimer = null;
  let renderSeq = 0;
  let saveWarned = false;

  const canvas = createCanvas(els.stage, { onNavigate });
  const setPageHtml = (i, html) => { pages = pages.map((p, j) => (j === i ? { ...p, html } : p)); };

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!saveProject(pages, current) && !saveWarned) {
        saveWarned = true;
        toast('Autosave is off here (browser storage is full or blocked). Download your work to keep it.', 'warn');
      }
    }, SAVE_DELAY_MS);
  }

  function updateUndoButtons() {
    const h0 = histories[current];
    els.undoButton.disabled = !h0 || !canUndo(h0);
    els.redoButton.disabled = !h0 || !canRedo(h0);
  }

  function commit() {
    if (!doc) return;
    const html = serializePage(doc);
    if (html === pages[current].html) return;
    setPageHtml(current, html);
    histories[current] = record(histories[current], html);
    updateUndoButtons();
    scheduleSave();
  }

  async function prepare(i) {
    if (runtime[i] !== undefined) return;
    const html = pages[i].html;
    const snap = await probePage(html);
    if (!snap) { runtime[i] = ''; return; }
    const builtByScript = staticTextLength(html) <= JS_RENDERED.maxStaticText && snap.renderedText >= JS_RENDERED.minRenderedText;
    if (builtByScript && snap.renderedHtml) {
      const flat = flattenRendered(snap.renderedHtml);
      setPageHtml(i, flat);
      histories[i] = record(histories[i], flat);
      runtime[i] = '';
      toast(`${pages[i].name} is built by JavaScript, so it was converted to plain HTML you can edit. Undo restores the original.`, 'warn');
      return;
    }
    runtime[i] = snap.runtimeCss;
  }

  function refreshPanels() {
    renderPages(els.pagesList, pages, current, { onOpen: (i) => show(i), onRemove: removePage });
    if (mode !== 'edit' || !doc) {
      clear(els.brandHost);
      for (const host of [els.themeHost, els.sectionsHost]) {
        clear(host);
        host.appendChild(h('p', { class: 'muted', text: 'Switch to Edit to change this page.' }));
      }
      return;
    }
    renderBrandCard(els.brandHost, { pageLook, onApply: applyBrand });
    renderTheme(els.themeHost, doc, { onColor, onFont, hasRuntimeCss: Boolean(runtime[current]) });
    renderSections(els.sectionsHost, doc, { onPick: pickSection, revealOn, onReveal });
  }

  function inspect(el) {
    if (mode !== 'edit') {
      clear(els.inspector);
      els.inspector.appendChild(h('div', { class: 'empty-note' }, [
        h('p', { text: 'Preview mode: the page runs like the real site.' }),
        h('p', { class: 'muted', text: 'Click links to move between your pages, then click Edit to change the page you are on.' }),
      ]));
      return;
    }
    renderInspector(els.inspector, el, { commit, actions: elementActions(el) });
  }

  function elementActions(el) {
    return {
      selectParent: () => { const p = el.parentElement; if (p && p !== doc.documentElement) editor.select(p); },
      duplicate: () => {
        const copy = el.cloneNode(true);
        [copy, ...copy.querySelectorAll('*')].forEach((n) => EDITOR_MARKS.forEach((a) => n.removeAttribute(a)));
        el.after(copy);
        commit();
        editor.select(copy);
      },
      move: (dir) => {
        const sibling = dir < 0 ? el.previousElementSibling : el.nextElementSibling;
        if (!sibling) return;
        if (dir < 0) sibling.before(el); else sibling.after(el);
        commit();
        inspect(el);
      },
      hide: () => {
        el.style.setProperty('display', 'none');
        editor.clear();
        commit();
        refreshPanels();
        toast('Hidden. Turn on "Show hidden parts" on the left to find it again.');
      },
      remove: removeSelected,
    };
  }

  function removeSelected() {
    const el = editor?.selected;
    if (!el || el === doc.body) return;
    editor.clear();
    el.remove();
    commit();
    refreshPanels();
    toast('Deleted. Press Ctrl/Cmd + Z to undo.');
  }

  function pickSection(el) {
    editor.select(el);
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function onReveal(on) {
    revealOn = on;
    if (doc) doc.documentElement.toggleAttribute('data-unslop-reveal', on);
  }

  function onColor(from, to) {
    const n = swapColor(doc, from, to);
    commit();
    refreshPanels();
    toast(n ? `Changed ${from} to ${to} in ${n} place${n === 1 ? '' : 's'}.` : 'That colour could not be changed here.');
  }

  function pageLook() {
    const css = readThemeCss(doc);
    return { colors: extractColors(css), fonts: extractFonts(css) };
  }

  function addBrandFonts(brand) {
    ensureFontLink(doc, brand.bodyFont);
    ensureFontLink(doc, brand.headingFont);
    const style = doc.createElement('style');
    style.textContent = `body{font-family:${fontStack(brand.bodyFont)}}h1,h2,h3,h4,h5,h6{font-family:${fontStack(brand.headingFont)}}`;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function applyBrand(brand) {
    const look = pageLook();
    const plan = planBrandSwaps(look.colors, look.fonts, brand);
    if (!look.fonts.length) addBrandFonts(brand);
    if (!plan.colors.length && !plan.fonts.length && look.fonts.length) {
      toast('This page already uses your brand.');
      return;
    }
    applySwapPlan(doc, plan, look.colors.map((c) => c.color));
    commit();
    refreshPanels();
    const fontsDone = look.fonts.length ? plan.fonts.length : 2;
    toast(`Applied "${brand.name}": ${plan.colors.length} colour${plan.colors.length === 1 ? '' : 's'} and ${fontsDone} font${fontsDone === 1 ? '' : 's'}. Undo if you don't like it.`, 'success');
  }

  function onFont(from, to) {
    const n = swapFont(doc, from, to);
    commit();
    refreshPanels();
    toast(n ? `Replaced ${from} with ${to} across the page.` : 'That font could not be changed here.');
  }

  async function show(i) {
    const seq = ++renderSeq;
    current = i;
    editor?.destroy();
    editor = null;
    doc = null;
    els.showWelcome(false);
    updateUndoButtons();
    if (mode === 'preview') {
      canvas.showPreview(pages[i].html);
      refreshPanels();
      inspect(null);
      return;
    }
    els.setBusy(true);
    await prepare(i);
    if (seq !== renderSeq) return;
    const nextDoc = await canvas.showEdit(pages[i].html, runtime[i]);
    if (seq !== renderSeq) return;
    doc = nextDoc;
    doc.documentElement.toggleAttribute('data-unslop-reveal', revealOn);
    editor = attachEditor(doc, { onSelect: inspect, onChange: commit, onKey: handleKey });
    refreshPanels();
    inspect(null);
    updateUndoButtons();
    els.setBusy(false);
  }

  function onNavigate(href) {
    const i = resolvePageLink(href, pages.map((p) => p.name));
    if (i === -1) {
      const external = /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
      toast(external ? `That link leaves your site (${href}), so it is not opened in preview.` : `"${href}" is not one of your pages. Add it with Open.`);
      return;
    }
    if (i === current) return;
    show(i);
    toast(`Now on ${pages[i].name}. Click Edit to change this page.`);
  }

  function load(newPages, { append = false } = {}) {
    const base = append ? pages : [];
    const names = base.map((p) => p.name);
    const added = newPages.map((p) => {
      const name = uniquePageName(p.name || 'page.html', names);
      names.push(name);
      return { name, html: p.html };
    });
    pages = [...base, ...added];
    histories = [...(append ? histories : []), ...added.map((p) => createHistory(p.html))];
    runtime = [...(append ? runtime : []), ...added.map(() => undefined)];
    scheduleSave();
    return show(base.length);
  }

  function removePage(i) {
    if (!window.confirm(`Remove ${pages[i].name} from this project? Files on your computer are not touched.`)) return;
    pages = pages.filter((_, j) => j !== i);
    histories = histories.filter((_, j) => j !== i);
    runtime = runtime.filter((_, j) => j !== i);
    scheduleSave();
    show(Math.min(current, pages.length - 1));
  }

  function applyHistory(step) {
    const next = step(histories[current]);
    if (next === histories[current]) return;
    histories[current] = next;
    setPageHtml(current, next.present);
    scheduleSave();
    show(current);
  }

  function setMode(next) {
    if (next === mode || !pages.length) return;
    editor?.finish();
    mode = next;
    els.setMode(next);
    show(current);
  }

  function handleKey(e) {
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') { e.preventDefault(); applyHistory(e.shiftKey ? redo : undo); return; }
    if (mod && key === 'y') { e.preventDefault(); applyHistory(redo); return; }
    if (mod && key === 's') { e.preventDefault(); exportPage(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && editor?.selected) { e.preventDefault(); removeSelected(); return; }
    if (e.key === 'Escape') editor?.clear();
  }

  function exportPage() {
    if (!pages.length) return;
    editor?.finish();
    downloadHtml(pages[current].name, pages[current].html);
    toast(`Downloaded ${pages[current].name}.`, 'success');
  }

  function exportAll() {
    if (!pages.length) return;
    editor?.finish();
    downloadSite(pages);
    toast(pages.length > 1 ? `Downloaded ${pages.length} pages as website.zip.` : `Downloaded ${pages[0].name}.`, 'success');
  }

  function copyHtml() {
    if (!pages.length) return;
    editor?.finish();
    navigator.clipboard.writeText(pages[current].html)
      .then(() => toast('HTML copied to the clipboard.', 'success'))
      .catch(() => toast('Your browser blocked the clipboard. Use Download instead.', 'warn'));
  }

  return {
    load,
    setMode,
    undo: () => applyHistory(undo),
    redo: () => applyHistory(redo),
    exportPage,
    exportAll,
    copyHtml,
    setDevice: (px) => canvas.setWidth(px),
    handleKey: (e) => { if (!isTypingTarget(e.target)) handleKey(e); },
    hasProject: () => pages.length > 0,
    currentHtml: () => pages[current]?.html ?? '',
    pageNames: () => pages.map((p) => p.name),
  };
}
