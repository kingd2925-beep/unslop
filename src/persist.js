// Autosave to this browser only. Nothing is ever sent anywhere.
// Opened as a file (file://), Chrome gives every local HTML file the same storage, so any other
// file the person double-clicks could read it. The offline build therefore never persists anything.

import { storageGet, storageSet, storageRemove } from './ui.js';

const PROJECT_KEY = 'unslop:project:v1';

export const isOfflineFile = () => typeof location !== 'undefined' && location.protocol === 'file:';

export function saveProject(pages, current) {
  if (isOfflineFile()) return false;
  const payload = JSON.stringify({ savedAt: new Date().toISOString(), current, pages: pages.map(({ name, html }) => ({ name, html })) });
  return storageSet(PROJECT_KEY, payload);
}

/** The last session, or null. Anything malformed is treated as no session. */
export function loadProject() {
  if (isOfflineFile()) return null;
  const raw = storageGet(PROJECT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const pages = Array.isArray(data.pages)
      ? data.pages.filter((p) => p && typeof p.name === 'string' && typeof p.html === 'string')
      : [];
    if (!pages.length) return null;
    const current = Number.isInteger(data.current) && data.current < pages.length ? data.current : 0;
    return { pages, current, savedAt: String(data.savedAt || '') };
  } catch {
    return null;
  }
}

export const forgetProject = () => storageRemove(PROJECT_KEY);

const BRAND_KEY = 'unslop:brand:v1';

/** The saved brand kit as raw data (sanitise before use), or null. */
export function loadBrandData() {
  if (isOfflineFile()) return null;
  const raw = storageGet(BRAND_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export const saveBrandData = (brand) => !isOfflineFile() && storageSet(BRAND_KEY, JSON.stringify(brand));
