import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body><iframe sandbox=allow-same-origin></iframe></body></html>');
const metaHtml = String.raw`<!doctype html><html><head><meta http-equiv=refresh content='0;url=https://example.com/'></head><body>original<`+'a'+String.raw`></body></html>`;
await page.evaluate((html) => { document.querySelector('iframe').srcdoc = html; }, metaHtml);
await page.waitForTimeout(3000);
console.log('frames after meta-refresh:', page.frames().map(f => f.url()));
await browser.close();
