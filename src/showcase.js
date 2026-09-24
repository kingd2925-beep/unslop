// The start-screen showcase: the same AI-made page before and after one click, with a draggable
// slanted divider. Both pages render in fully locked frames (no scripts, no same-origin).

import { SAMPLE_PAGES } from './sample-site.js';
import { BRAND_PRESETS } from './brand.js';
import { applyBrandToDocument } from './dom-theme.js';
import { presetChips } from './brand-panel.js';
import { h } from './ui.js';

const PAGE_WIDTH = 1280;
const PAGE_HEIGHT = 760;
const SWEEP_MS = 2800;
const START_SPLIT = 50;

/** The page HTML with a preset look applied, built without touching any live document. */
export function brandedHtml(html, brand) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  applyBrandToDocument(doc, brand);
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

function lockedFrame(html, title) {
  const frame = h('iframe', { sandbox: '', title, tabindex: '-1', loading: 'lazy', referrerpolicy: 'no-referrer' });
  frame.srcdoc = html;
  return frame;
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function introSweep(setSplit, isStopped) {
  if (prefersReducedMotion()) return;
  const start = performance.now();
  const step = (now) => {
    if (isStopped()) return;
    const t = Math.min(1, (now - start) / SWEEP_MS);
    // 50 -> 88 -> 12 -> 50, eased: a quick look at each side.
    const wave = Math.sin(t * Math.PI * 2);
    setSplit(START_SPLIT + wave * 38 * (1 - t * 0.35));
    if (t < 1) requestAnimationFrame(step); else setSplit(START_SPLIT);
  };
  requestAnimationFrame(step);
}

/** Builds the showcase inside `host`. */
export function mountShowcase(host) {
  const source = SAMPLE_PAGES[0].html;
  let userMoved = false;
  const beforeFrame = lockedFrame(source, 'Before: a typical AI-generated page');
  const afterFrame = lockedFrame(brandedHtml(source, BRAND_PRESETS[0]), 'After: the same page, one click later');
  const afterLabel = h('span', { class: 'showcase-tag after-tag', text: `After · ${BRAND_PRESETS[0].name}` });

  const viewport = h('div', { class: 'showcase-viewport' }, [
    h('div', { class: 'showcase-layer' }, [beforeFrame]),
    h('div', { class: 'showcase-layer after' }, [afterFrame]),
    h('div', { class: 'showcase-handle', 'aria-hidden': 'true' }, [h('span', { class: 'showcase-knob' })]),
    h('span', { class: 'showcase-tag before-tag', text: 'Before · AI slop' }),
    afterLabel,
  ]);
  const range = h('input', { type: 'range', min: 0, max: 100, value: START_SPLIT, class: 'showcase-range', 'aria-label': 'Slide to compare before and after' });

  const setSplit = (pct) => {
    const clamped = Math.max(0, Math.min(100, pct));
    viewport.style.setProperty('--split', `${clamped}%`);
    range.value = String(Math.round(clamped));
  };
  const fromPointer = (e) => {
    const box = viewport.getBoundingClientRect();
    setSplit(((e.clientX - box.left) / box.width) * 100);
  };
  viewport.addEventListener('pointerdown', (e) => {
    userMoved = true;
    viewport.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  viewport.addEventListener('pointermove', (e) => { if (viewport.hasPointerCapture(e.pointerId)) fromPointer(e); });
  range.addEventListener('input', () => { userMoved = true; setSplit(Number(range.value)); });

  new ResizeObserver(([entry]) => {
    const scale = entry.contentRect.width / PAGE_WIDTH;
    viewport.style.setProperty('--scale', String(scale));
    viewport.style.height = `${Math.round(PAGE_HEIGHT * scale)}px`;
  }).observe(viewport);

  const chips = presetChips((preset) => {
    afterFrame.srcdoc = brandedHtml(source, preset);
    afterLabel.textContent = `After · ${preset.name}`;
    chips.querySelectorAll('.preset-chip').forEach((c) => c.classList.toggle('active', c.dataset.preset === preset.name));
    userMoved = true;
    setSplit(30);
  });
  chips.querySelector('.preset-chip')?.classList.add('active');

  host.append(
    h('div', { class: 'showcase-frame' }, [viewport, range]),
    h('div', { class: 'showcase-controls' }, [h('span', { class: 'kicker', text: 'Try a look →' }), chips]),
  );
  setSplit(START_SPLIT);
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    introSweep(setSplit, () => userMoved);
  }, { threshold: 0.4 });
  observer.observe(viewport);
}
