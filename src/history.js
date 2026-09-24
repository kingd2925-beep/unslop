// Undo/redo as immutable snapshots. Every function returns a new history and never changes the old one.

const DEFAULT_LIMIT = 100;

export function createHistory(present, limit = DEFAULT_LIMIT) {
  return Object.freeze({ past: Object.freeze([]), present, future: Object.freeze([]), limit });
}

export function record(history, next) {
  if (next === history.present) return history;
  const past = [...history.past, history.present].slice(-history.limit);
  return Object.freeze({ ...history, past: Object.freeze(past), present: next, future: Object.freeze([]) });
}

export const canUndo = (history) => history.past.length > 0;
export const canRedo = (history) => history.future.length > 0;

export function undo(history) {
  if (!canUndo(history)) return history;
  const past = history.past.slice(0, -1);
  const previous = history.past[history.past.length - 1];
  const future = [history.present, ...history.future];
  return Object.freeze({ ...history, past: Object.freeze(past), present: previous, future: Object.freeze(future) });
}

export function redo(history) {
  if (!canRedo(history)) return history;
  const [next, ...future] = history.future;
  const past = [...history.past, history.present];
  return Object.freeze({ ...history, past: Object.freeze(past), present: next, future: Object.freeze(future) });
}
