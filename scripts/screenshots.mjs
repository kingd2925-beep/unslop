// Regenerates the README screenshots in docs/. Needs `npm run serve` running on :8765.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.UNSLOP_URL || 'http://localhost:8765/index.html';
const BRAND = { name: 'Teal Studio', background: '#fbfaf6', text: '#14201f', accent: '#0f766e', accent2: '#f59e0b', headingFont: 'Fraunces', bodyFont: 'Inter' };

mkdirSync('docs', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
await context.addInitScript(`localStorage.setItem('unslop:brand:v1', ${JSON.stringify(JSON.stringify(BRAND))}); localStorage.setItem('unslop:hint-dismissed', '0');`);
const page = await context.newPage();

await page.goto(BASE);
await page.screenshot({ path: 'docs/welcome.png' });

await page.click('.welcome [data-action="sample"]');
const frame = page.frameLocator('iframe.canvas-frame');
await frame.locator('h1').click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/editing.png' });

await page.keyboard.press('Escape');
await page.locator('#brand button', { hasText: 'Apply my brand' }).click();
await page.waitForTimeout(1500);
await frame.locator('h1').click();
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.screenshot({ path: 'docs/brand-applied.png' });

await browser.close();
console.log('docs/welcome.png, docs/editing.png, docs/brand-applied.png');
