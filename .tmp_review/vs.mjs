import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const inner = '<!doctype html><html><body onload=\"window.__ranOnload=1\"><scr'+'ipt>window.__ranScript=1;</scr'+'ipt><img src=x onerror=\"window.__ranOnerror=1\"><a id=\"jslink\" href=\"javascript:window.__ranJs=1\">click</a></body></html>';
await page.setContent('<!doctype html><html><body><iframe id=\"f\" sandbox=\"allow-same-origin\"></iframe></body></html>');
await page.evaluate((html) => { document.getElementById('f').srcdoc = html; }, inner);
await page.waitForTimeout(500);
const frame = page.frames().find(fr => fr !== page.mainFrame());
const r1 = await frame.evaluate(() => ({ ranScript: !!window.__ranScript, ranOnload: !!window.__ranOnload, ranOnerror: !!window.__ranOnerror }));
console.log('Test1:', JSON.stringify(r1));
try { await frame.click('#jslink', { timeout: 1000 }); } catch (e) { console.log('click error', e.message); }
const r1b = await frame.evaluate(() => !!window.__ranJs);
console.log('Test1b javascript-url-ran:', r1b);
await browser.close();
