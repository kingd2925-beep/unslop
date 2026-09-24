// Regenerates every README / social image and the demo GIF in docs/.
// Needs `npm run serve` running on :8765 and ffmpeg on PATH (or FFMPEG=/path/to/ffmpeg).
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = process.env.UNSLOP_URL || 'http://localhost:8765/index.html';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const DOCS = resolve('docs');
const VIDEO_DIR = resolve('docs/.video');
mkdirSync(DOCS, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const pause = (page, ms) => page.waitForTimeout(ms);
const frame = (page) => page.frameLocator('iframe.canvas-frame');

async function stills() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await pause(page, 900);
  await page.screenshot({ path: join(DOCS, 'hero.png') });
  await page.evaluate(() => document.getElementById('showcase').scrollIntoView({ block: 'start' }));
  await pause(page, 4200);
  await page.locator('#showcase').screenshot({ path: join(DOCS, 'showcase.png') });
  await page.click('.hero [data-action="sample"]');
  await frame(page).locator('h1').waitFor();
  await page.locator('#brand .preset-chip', { hasText: 'Studio' }).click();
  await pause(page, 1600);
  await frame(page).locator('h1').click();
  await page.keyboard.press('Escape');
  await pause(page, 500);
  await page.screenshot({ path: join(DOCS, 'editor.png') });
  await context.close();
}

async function socialCard() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve('scripts/social-card.html')).href, { waitUntil: 'networkidle' });
  await pause(page, 800);
  await page.screenshot({ path: join(DOCS, 'social-preview.png') });
  await context.close();
}

async function demoVideo() {
  rmSync(VIDEO_DIR, { recursive: true, force: true });
  const size = { width: 1280, height: 800 };
  const context = await browser.newContext({ viewport: size, recordVideo: { dir: VIDEO_DIR, size } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await pause(page, 1600);
  await page.evaluate(() => document.getElementById('showcase').scrollIntoView({ block: 'start', behavior: 'smooth' }));
  await pause(page, 4000);
  await page.locator('#showcase .preset-chip', { hasText: 'Sunset' }).click();
  await pause(page, 1500);
  await page.locator('#showcase .preset-chip', { hasText: 'Editorial' }).click();
  await pause(page, 1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(page, 700);
  await page.click('.hero [data-action="sample"]');
  await frame(page).locator('h1').waitFor();
  await pause(page, 900);
  await page.locator('#brand .preset-chip', { hasText: 'Studio' }).click();
  await pause(page, 2600);
  await frame(page).locator('h1').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Make it yours.', { delay: 70 });
  await page.keyboard.press('Enter');
  await pause(page, 1200);
  await page.click('[data-mode="preview"]');
  await pause(page, 3500);
  await context.close();
  const [webm] = readdirSync(VIDEO_DIR).filter((f) => f.endsWith('.webm'));
  renameSync(join(VIDEO_DIR, webm), join(VIDEO_DIR, 'demo.webm'));
  const filter = 'fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle';
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', join(VIDEO_DIR, 'demo.webm'), '-vf', filter, '-loop', '0', join(DOCS, 'demo.gif')]);
  rmSync(VIDEO_DIR, { recursive: true, force: true });
}

await stills();
await socialCard();
await demoVideo();
await browser.close();
console.log('docs/hero.png, docs/showcase.png, docs/editor.png, docs/social-preview.png, docs/demo.gif');
