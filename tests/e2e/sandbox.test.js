// Guards the isolation settings so a future change cannot quietly loosen them.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, newEditor, pasteHtml } from './helpers.js';

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

const DENIED = ['camera', 'microphone', 'geolocation', 'clipboard-read', 'clipboard-write', 'display-capture'];
const frameAttrs = () => {
  const f = document.querySelector('iframe.canvas-frame');
  return { sandbox: f.getAttribute('sandbox'), allow: f.getAttribute('allow') || '' };
};

test('edit frame: same-origin without scripts, powerful features denied', async () => {
  const { page, context } = await newEditor(browser, url);
  await pasteHtml(page, '<!DOCTYPE html><html><body><h1>x</h1></body></html>');
  const { sandbox, allow } = await page.evaluate(frameAttrs);
  assert.equal(sandbox, 'allow-same-origin');
  for (const feature of DENIED) assert.ok(allow.includes(`${feature} 'none'`), `edit frame should deny ${feature}`);
  await context.close();
});

test('preview frame: scripts without same-origin, powerful features denied', async () => {
  const { page, context } = await newEditor(browser, url);
  await pasteHtml(page, '<!DOCTYPE html><html><body><h1>x</h1></body></html>');
  await page.click('[data-mode="preview"]');
  await page.waitForFunction(() => document.querySelector('iframe.canvas-frame')?.getAttribute('sandbox') === 'allow-scripts');
  const { sandbox, allow } = await page.evaluate(frameAttrs);
  assert.equal(sandbox, 'allow-scripts');
  for (const feature of DENIED) assert.ok(allow.includes(`${feature} 'none'`), `preview frame should deny ${feature}`);
  await context.close();
});

test('a previewed page cannot use the camera, microphone or location', async () => {
  const hostile = `<!DOCTYPE html><html><body><script>
    const probe = (name) => document.featurePolicy ? document.featurePolicy.allowsFeature(name) : 'unknown';
    parent.postMessage({ report: ['camera', 'microphone', 'geolocation'].map(probe) }, '*');
  </script></body></html>`;
  const { page, context } = await newEditor(browser, url);
  await pasteHtml(page, hostile);
  const reportPromise = page.evaluate(() => new Promise((resolve) => {
    window.addEventListener('message', (e) => { if (e.data && e.data.report) resolve(e.data.report); });
  }));
  await page.click('[data-mode="preview"]');
  const report = await reportPromise;
  assert.deepEqual(report, [false, false, false]);
  await context.close();
});
