// Shared set-up for browser tests: a static file server for the repo and a Chrome page.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

export function startServer() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(ROOT, path === '/' ? 'index.html' : path);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

export async function openBrowser() {
  const channel = process.env.UNSLOP_BROWSER_CHANNEL || 'chrome';
  return chromium.launch({ channel, headless: true });
}

/** A fresh editor tab. Collects real errors (the sandbox's "blocked script" notices are expected). */
export async function newEditor(browser, url, { initScript } = {}) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes("'allow-scripts' permission is not set")) errors.push(m.text());
  });
  await page.goto(`${url}/index.html`);
  return { page, context, errors, frame: page.frameLocator('iframe.canvas-frame') };
}

/** Opens raw HTML through the Paste dialog and waits for the edit frame. */
export async function pasteHtml(page, html) {
  await page.locator('.welcome [data-action="paste"]').click();
  await page.fill('#paste-text', html);
  await page.click('#paste-form button[value="open"]');
  await page.waitForFunction(() => {
    const f = document.querySelector('iframe.canvas-frame');
    return f && f.contentDocument && f.contentDocument.readyState === 'complete' && !document.querySelector('#stage.busy');
  });
}

/** Clicks "Download page" and returns the downloaded HTML text. */
export async function downloadCurrent(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-page')]);
  return readFile(await download.path(), 'utf8');
}
