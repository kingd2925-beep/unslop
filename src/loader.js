// Reading what people drop in: HTML pages plus the CSS, JS and images next to them.
// Assets are inlined into each page so the result is self-contained and exports cleanly.

const HTML_FILE = /\.html?$/i;
const CSS_FILE = /\.css$/i;
const JS_FILE = /\.m?js$/i;
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|svg|avif|ico|bmp)$/i;
const CSS_URL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

const readText = (file) => file.text();

function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const fileKey = (path) => path.replace(/^(\.\/|\/)+/, '').toLowerCase();
const baseName = (path) => path.split('/').pop();

function entryFile(entry) {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

function readDirectory(reader) {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

async function walkEntry(entry, prefix) {
  if (entry.isFile) {
    const file = await entryFile(entry);
    return [{ file, path: prefix + file.name }];
  }
  const reader = entry.createReader();
  const found = [];
  for (let batch = await readDirectory(reader); batch.length; batch = await readDirectory(reader)) {
    for (const child of batch) found.push(...(await walkEntry(child, `${prefix}${entry.name}/`)));
  }
  return found;
}

/** Files from a drop, including whole folders, as [{ file, path }]. */
export async function filesFromDrop(dataTransfer) {
  const entries = [...(dataTransfer.items || [])]
    .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
    .filter(Boolean);
  if (!entries.length) return [...dataTransfer.files].map((file) => ({ file, path: file.name }));
  const nested = await Promise.all(entries.map((e) => walkEntry(e, '')));
  return nested.flat();
}

export const filesFromInput = (fileList) =>
  [...fileList].map((file) => ({ file, path: file.webkitRelativePath || file.name }));

async function readAssets(items) {
  const assets = new Map();
  for (const { file, path } of items) {
    let asset = null;
    if (CSS_FILE.test(path)) asset = { kind: 'css', text: await readText(file) };
    else if (JS_FILE.test(path)) asset = { kind: 'js', text: await readText(file) };
    else if (IMAGE_FILE.test(path)) asset = { kind: 'image', dataUrl: await readDataUrl(file) };
    if (!asset) continue;
    assets.set(fileKey(path), asset);
    if (!assets.has(fileKey(baseName(path)))) assets.set(fileKey(baseName(path)), asset);
  }
  return assets;
}

function findAsset(ref, assets) {
  if (!ref || /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return null;
  const clean = ref.split(/[?#]/)[0].replace(/\.\.\//g, '');
  return assets.get(fileKey(clean)) || assets.get(fileKey(baseName(clean))) || null;
}

function inlineCssUrls(css, assets) {
  return css.replace(CSS_URL, (whole, quote, ref) => {
    const asset = findAsset(ref, assets);
    return asset?.kind === 'image' ? `url("${asset.dataUrl}")` : whole;
  });
}

function inlineStylesheets(doc, assets) {
  let count = 0;
  for (const link of doc.querySelectorAll('link[rel~="stylesheet"][href]')) {
    const asset = findAsset(link.getAttribute('href'), assets);
    if (asset?.kind !== 'css') continue;
    const style = doc.createElement('style');
    style.textContent = inlineCssUrls(asset.text, assets);
    link.replaceWith(style);
    count += 1;
  }
  return count;
}

function inlineScripts(doc, assets) {
  let count = 0;
  for (const script of doc.querySelectorAll('script[src]')) {
    const asset = findAsset(script.getAttribute('src'), assets);
    if (asset?.kind !== 'js') continue;
    script.removeAttribute('src');
    script.textContent = asset.text.replace(/<\/script/gi, '<\\/script');
    count += 1;
  }
  return count;
}

function inlineImages(doc, assets) {
  let count = 0;
  const targets = [['img', 'src'], ['source', 'src'], ['video', 'poster'], ['link[rel~="icon"]', 'href'], ['image', 'href']];
  for (const [selector, attr] of targets) {
    for (const el of doc.querySelectorAll(`${selector}[${attr}]`)) {
      const asset = findAsset(el.getAttribute(attr), assets);
      if (asset?.kind !== 'image') continue;
      el.setAttribute(attr, asset.dataUrl);
      el.removeAttribute('srcset');
      count += 1;
    }
  }
  for (const el of doc.querySelectorAll('[style*="url("]')) {
    const next = inlineCssUrls(el.getAttribute('style'), assets);
    if (next !== el.getAttribute('style')) { el.setAttribute('style', next); count += 1; }
  }
  for (const style of doc.querySelectorAll('style')) {
    const next = inlineCssUrls(style.textContent, assets);
    if (next !== style.textContent) { style.textContent = next; count += 1; }
  }
  return count;
}

function serializeParsed(doc, original) {
  const hasDoctype = /^\s*<!doctype/i.test(original);
  return (hasDoctype ? '<!DOCTYPE html>\n' : '') + doc.documentElement.outerHTML;
}

/** Inlines matching local assets into the page. Returns the original text when nothing matched. */
export function inlineAssets(html, assets) {
  if (!assets.size) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const changed = inlineStylesheets(doc, assets) + inlineScripts(doc, assets) + inlineImages(doc, assets);
  return changed ? serializeParsed(doc, html) : html;
}

/** Everything dropped -> { pages: [{ name, html }], skipped: [paths] }. */
export async function loadDroppedFiles(items) {
  const assets = await readAssets(items);
  const htmlItems = items.filter(({ path }) => HTML_FILE.test(path));
  const pages = [];
  for (const { file, path } of htmlItems) {
    pages.push({ name: baseName(path), html: inlineAssets(await readText(file), assets) });
  }
  const known = (path) => HTML_FILE.test(path) || CSS_FILE.test(path) || JS_FILE.test(path) || IMAGE_FILE.test(path);
  return { pages, skipped: items.filter(({ path }) => !known(path)).map(({ path }) => path) };
}
