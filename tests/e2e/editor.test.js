import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, newEditor, pasteHtml, downloadCurrent } from './helpers.js';

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

const PAGE = `<!DOCTYPE html><html><head><style>h1{color:#7c3aed}p{color:#333333;font-family:Poppins,sans-serif}</style></head>
<body><h1>Old title</h1><p>Some text</p></body></html>`;

test('typing into a heading exports clean HTML with the new text', async () => {
  const { page, frame, context, errors } = await newEditor(browser, url);
  await pasteHtml(page, PAGE);
  await frame.locator('h1').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('New title');
  await page.keyboard.press('Enter');
  const html = await downloadCurrent(page);
  assert.match(html, /<h1>New title<\/h1>/);
  assert.doesNotMatch(html, /data-unslop|contenteditable/);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('undo brings back the previous text', async () => {
  const { page, frame, context } = await newEditor(browser, url);
  await pasteHtml(page, PAGE);
  await frame.locator('h1').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Changed');
  await page.keyboard.press('Enter');
  await page.click('#undo');
  await page.waitForFunction(() => document.querySelector('iframe.canvas-frame')?.contentDocument?.querySelector('h1')?.textContent === 'Old title');
  await context.close();
});

test('changing a swatch swaps that colour everywhere', async () => {
  const { page, context } = await newEditor(browser, url);
  await pasteHtml(page, PAGE);
  const input = page.locator('#theme .swatch-input[aria-label="Change #7c3aed everywhere"]');
  await input.evaluate((el) => { el.value = '#0f766e'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  const html = await downloadCurrent(page);
  assert.match(html, /h1\{color:#0f766e\}/);
  assert.doesNotMatch(html, /7c3aed/);
  await context.close();
});

test('page scripts never run in edit mode and cannot reach the editor in preview', async () => {
  const hostile = `<!DOCTYPE html><html><body><h1>Hi</h1><script>
    try { window.parent.document.body.setAttribute('data-pwned', 'yes'); } catch (e) {}
    try { window.top.localStorage.setItem('pwned', 'yes'); } catch (e) {}
  </script></body></html>`;
  const { page, context } = await newEditor(browser, url);
  await pasteHtml(page, hostile);
  await page.click('[data-mode="preview"]');
  await page.waitForTimeout(1200);
  const state = await page.evaluate(() => ({ attr: document.body.getAttribute('data-pwned'), stored: localStorage.getItem('pwned') }));
  assert.deepEqual(state, { attr: null, stored: null });
  await context.close();
});

test('styles a page builds at runtime show while editing but are not baked into the export', async () => {
  const runtime = `<!DOCTYPE html><html><head><script>
    var s = document.createElement('style');
    s.textContent = '.x{color:rgb(' + [1, 2, 3].join(',') + ')}';
    document.head.appendChild(s);
  </script></head><body><p class="x">Styled by script</p></body></html>`;
  const { page, frame, context } = await newEditor(browser, url);
  await pasteHtml(page, runtime);
  const color = await frame.locator('p.x').evaluate((el) => getComputedStyle(el).color);
  assert.equal(color, 'rgb(1, 2, 3)');
  const html = await downloadCurrent(page);
  assert.doesNotMatch(html, /\.x\{color:rgb\(1,2,3\)\}/);
  await context.close();
});

test('a page built entirely by JavaScript becomes editable plain HTML', async () => {
  const jsOnly = `<!DOCTYPE html><html><body><div id="root"></div><script>
    document.getElementById('root').innerHTML = '<h1>Built by script</h1><p>' + 'This paragraph was written by JavaScript. '.repeat(4) + '</p>';
  </script></body></html>`;
  const { page, frame, context } = await newEditor(browser, url);
  await pasteHtml(page, jsOnly);
  await frame.locator('h1', { hasText: 'Built by script' }).waitFor();
  const html = await downloadCurrent(page);
  assert.match(html, /<h1>Built by script<\/h1>/);
  assert.doesNotMatch(html, /<script/);
  await context.close();
});

test('Apply my brand swaps colours by role and loads the brand fonts', async () => {
  const brand = { name: 'Test brand', background: '#fffdf7', text: '#111111', accent: '#0f766e', accent2: '#f59e0b', headingFont: 'Fraunces', bodyFont: 'Inter' };
  const initScript = `localStorage.setItem('unslop:brand:v1', ${JSON.stringify(JSON.stringify(brand))});`;
  const { page, context } = await newEditor(browser, url, { initScript });
  await page.click('.welcome [data-action="sample"]');
  await page.locator('#brand button', { hasText: 'Apply my brand' }).click();
  const html = await downloadCurrent(page);
  assert.match(html, /#0f766e/);
  assert.doesNotMatch(html, /#7c3aed/i);
  assert.match(html, /family=Inter/);
  assert.match(html, /'Inter'|Inter,/);
  await context.close();
});
