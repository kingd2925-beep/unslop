import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const inner = String.raw`<!doctype html><html><body onload='window.__ranOnload=1'><script>window.__ranScript=1;</script><img src=x onerror='window.__ranOnerror=1'><a id=jslink href='javascript:window.__ranJs=1'>click</a></body></html>`;
for (const sandbox of ['allow-scripts', 'allow-same-origin']) {
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.evaluate((sb) => { const f=document.createElement('iframe'); f.setAttribute('sandbox', sb); document.body.appendChild(f); }, sandbox);
  await page.evaluate((html) => { document.querySelector('iframe').srcdoc = html; }, inner);
  await page.waitForTimeout(400);
  const frame = page.frames().find(fr => fr !== page.mainFrame());
  const r = await frame.evaluate(() => ({ ranScript: !!window.__ranScript, ranOnload: !!window.__ranOnload, ranOnerror: !!window.__ranOnerror })).catch(e => ({error: e.message}));
  console.log(sandbox, JSON.stringify(r));
}
await browser.close();
