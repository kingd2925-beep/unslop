// Regression tests for issues found in the pre-release code review.
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

const page = (title) => `<!DOCTYPE html><html><body><h1>${title}</h1></body></html>`;
const frameH1 = () => document.querySelector('iframe.canvas-frame')?.contentDocument?.querySelector('h1')?.textContent;

test('undo shortcuts before opening anything do not throw', async () => {
  const { page: tab, context, errors } = await newEditor(browser, url);
  await tab.keyboard.press('ControlOrMeta+Z');
  await tab.keyboard.press('ControlOrMeta+Shift+Z');
  await tab.keyboard.press('ControlOrMeta+Y');
  assert.deepEqual(errors, []);
  await context.close();
});

test('removing a page above the current one keeps you on the same page', async () => {
  const { page: tab, context } = await newEditor(browser, url);
  tab.on('dialog', (d) => d.accept());
  await pasteHtml(tab, page('Page A'));
  for (const t of ['Page B', 'Page C']) {
    await tab.locator('.toolbar [data-action="paste"]').click();
    await tab.fill('#paste-text', page(t));
    await tab.click('#paste-form button[value="open"]');
    await tab.waitForFunction((want) => document.querySelector('iframe.canvas-frame')?.contentDocument?.querySelector('h1')?.textContent === want, t);
  }
  await tab.locator('#pages-list li').nth(1).locator('.page-link').click();
  await tab.waitForFunction(() => document.querySelector('iframe.canvas-frame')?.contentDocument?.querySelector('h1')?.textContent === 'Page B');
  await tab.locator('#pages-list li').nth(0).locator('button.icon').click();
  await tab.waitForFunction(() => document.querySelectorAll('#pages-list li').length === 2);
  await tab.waitForFunction(() => !document.querySelector('#stage.busy'));
  await tab.waitForTimeout(300);
  assert.equal(await tab.evaluate(frameH1), 'Page B');
  assert.equal(await tab.locator('#pages-list li.active .page-link').textContent(), 'index-2.html');
  await context.close();
});

test('the whole page cannot be hidden or deleted', async () => {
  const { page: tab, context } = await newEditor(browser, url);
  await pasteHtml(tab, page('Body test'));
  await tab.frameLocator('iframe.canvas-frame').locator('h1').click();
  await tab.keyboard.press('Escape');
  await tab.locator('#inspector button', { hasText: 'Parent' }).click();
  assert.equal(await tab.locator('#inspector strong').textContent(), 'Page');
  assert.equal(await tab.locator('#inspector button', { hasText: 'Hide' }).count(), 0);
  assert.equal(await tab.locator('#inspector button', { hasText: 'Delete' }).count(), 0);
  await context.close();
});
