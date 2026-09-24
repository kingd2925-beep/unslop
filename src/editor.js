// Selection and inline text editing inside the (script-free) edit frame.

const INLINE_TAGS = new Set(['B', 'I', 'U', 'S', 'EM', 'STRONG', 'SPAN', 'A', 'BR', 'SMALL', 'MARK', 'CODE', 'SUP', 'SUB', 'ABBR', 'TIME', 'LABEL']);
const NEVER_SELECT = new Set(['HTML', 'HEAD', 'SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'TEMPLATE']);
const SINGLE_LINE = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'A', 'BUTTON', 'LABEL', 'SPAN', 'LI', 'TD', 'TH', 'FIGCAPTION']);
const CHANGE_DEBOUNCE_MS = 500;

/** True when an element holds text and only inline formatting, so it can be typed into directly. */
export function isTextElement(el) {
  if (!el || NEVER_SELECT.has(el.tagName) || el.tagName === 'BODY') return false;
  if (!(el.textContent || '').trim()) return false;
  return [...el.children].every((child) => INLINE_TAGS.has(child.tagName) && child.children.length === 0);
}

function placeCaret(doc, x, y) {
  const range = doc.caretRangeFromPoint?.(x, y)
    || (() => {
      const pos = doc.caretPositionFromPoint?.(x, y);
      if (!pos) return null;
      const r = doc.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      return r;
    })();
  if (!range) return;
  const selection = doc.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Wires editing into a document. Callbacks:
 *   onSelect(el | null), onChange(), onKey(event) for app shortcuts outside text editing.
 */
export function attachEditor(doc, { onSelect, onChange, onKey }) {
  let hovered = null;
  let selected = null;
  let editing = null;
  let changeTimer = null;

  const flushChange = () => { clearTimeout(changeTimer); changeTimer = null; onChange(); };
  const scheduleChange = () => { clearTimeout(changeTimer); changeTimer = setTimeout(flushChange, CHANGE_DEBOUNCE_MS); };

  function setHover(el) {
    if (hovered === el) return;
    hovered?.removeAttribute('data-unslop-hover');
    hovered = el && !NEVER_SELECT.has(el.tagName) && el !== doc.body ? el : null;
    hovered?.setAttribute('data-unslop-hover', '');
  }

  function stopEditing() {
    if (!editing) return;
    // Clear state first: removing contenteditable blurs the element, which fires focusout -> stopEditing again.
    const el = editing;
    editing = null;
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-unslop-editing');
    flushChange();
  }

  function startEditing(el, point) {
    editing = el;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-unslop-editing', '');
    el.focus();
    if (point) placeCaret(doc, point.x, point.y);
  }

  function select(el, point) {
    if (el === editing) return;
    stopEditing();
    selected?.removeAttribute('data-unslop-selected');
    selected = el && !NEVER_SELECT.has(el.tagName) ? el : null;
    if (selected) {
      selected.setAttribute('data-unslop-selected', '');
      if (point && isTextElement(selected)) startEditing(selected, point);
    }
    onSelect(selected);
  }

  const listeners = {
    mouseover: (e) => setHover(e.target),
    mouseleave: () => setHover(null),
    click: (e) => {
      e.preventDefault();
      if (editing && editing.contains(e.target)) return;
      select(e.target, { x: e.clientX, y: e.clientY });
    },
    submit: (e) => e.preventDefault(),
    input: () => { if (editing) scheduleChange(); },
    paste: (e) => {
      if (!editing) return;
      e.preventDefault();
      doc.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    },
    keydown: (e) => {
      if (editing) {
        if (e.key === 'Escape') { e.preventDefault(); stopEditing(); return; }
        if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); doc.execCommand('insertLineBreak'); return; }
        if (e.key === 'Enter' && SINGLE_LINE.has(editing.tagName)) { e.preventDefault(); stopEditing(); }
        return;
      }
      onKey(e);
    },
    focusout: (e) => { if (editing && e.target === editing) stopEditing(); },
  };
  for (const [type, fn] of Object.entries(listeners)) doc.addEventListener(type, fn, true);

  return {
    select: (el) => select(el, null),
    clear: () => select(null, null),
    get selected() { return selected; },
    finish: stopEditing,
    destroy() {
      clearTimeout(changeTimer);
      for (const [type, fn] of Object.entries(listeners)) doc.removeEventListener(type, fn, true);
    },
  };
}
