import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openBrowser } from './helpers.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
let browser;

before(async () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: ROOT });
  browser = await openBrowser();
});

after(async () => { await browser?.close(); });

test('the single-file build works when opened straight from disk', async () => {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes("'allow-scripts' permission is not set")) errors.push(m.text());
  });
  await page.goto(pathToFileURL(`${ROOT}dist/unslop.html`).href);
  await page.click('.welcome [data-action="sample"]');
  const frame = page.frameLocator('iframe.canvas-frame');
  await frame.locator('h1').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Offline works');
  await page.keyboard.press('Enter');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-page')]);
  const html = await readFile(await download.path(), 'utf8');
  assert.match(html, /<h1>Offline works<\/h1>/);
  // file:// shares storage with every local HTML file, so the offline build must never autosave there.
  await page.waitForTimeout(1200);
  const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('unslop:project') || k.startsWith('unslop:brand')));
  assert.deepEqual(stored, []);
  assert.deepEqual(errors, []);
  await context.close();
});
