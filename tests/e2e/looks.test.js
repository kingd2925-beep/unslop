// The start-screen showcase and the one-click "Try a look" presets.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, newEditor, downloadCurrent } from './helpers.js';

let server;
let url;
let browser;

before(async () => {
  ({ server, url } = await startServer());
  browser = await openBrowser();
});

after(async () => {
  await browser?.close();
  server?.close();
});

test('the start screen shows the same page before and after, and looks can be switched', async () => {
  const { page, context, errors } = await newEditor(browser, url);
  const frames = page.locator('#showcase iframe');
  assert.equal(await frames.count(), 2);
  assert.equal(await frames.nth(0).getAttribute('sandbox'), '');
  const afterBefore = await frames.nth(1).getAttribute('srcdoc');
  assert.match(afterBefore, /#ff4b2b/i);
  await page.locator('#showcase .preset-chip', { hasText: 'Sunset' }).click();
  assert.match(await page.locator('#showcase .after-tag').textContent(), /Sunset/);
  const afterSunset = await frames.nth(1).getAttribute('srcdoc');
  assert.match(afterSunset, /#d9480f/i);
  assert.doesNotMatch(afterSunset, /#7c3aed/i);
  assert.deepEqual(errors, []);
  await context.close();
});

test('"Try a look" in the editor restyles the page by role and exports cleanly', async () => {
  const { page, context } = await newEditor(browser, url);
  await page.click('.welcome [data-action="sample"]');
  await page.frameLocator('iframe.canvas-frame').locator('h1').waitFor();
  await page.locator('#brand .preset-chip', { hasText: 'Studio' }).click();
  const html = await downloadCurrent(page);
  assert.match(html, /#ff4b2b/i);
  assert.match(html, /#f3f4f0/i);
  assert.doesNotMatch(html, /#7c3aed|#faf5ff/i);
  assert.match(html, /family=Bricolage\+Grotesque/);
  assert.doesNotMatch(html, /data-unslop/);
  await context.close();
});
