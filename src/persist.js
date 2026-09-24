// Autosave to this browser only. Nothing is ever sent anywhere.

import { storageGet, storageSet, storageRemove } from './ui.js';

const PROJECT_KEY = 'unslop:project:v1';

export function saveProject(pages, current) {
  const payload = JSON.stringify({ savedAt: new Date().toISOString(), current, pages: pages.map(({ name, html }) => ({ name, html })) });
  return storageSet(PROJECT_KEY, payload);
}

/** The last session, or null. Anything malformed is treated as no session. */
export function loadProject() {
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
  const raw = storageGet(BRAND_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export const saveBrandData = (brand) => storageSet(BRAND_KEY, JSON.stringify(brand));
