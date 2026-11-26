// The README's preview images, taken from the synthetic profiles with the same routing as the browser
// tests: nothing reaches LinkedIn, and no real person appears. Run with: make screenshots
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Page} from '@playwright/test';
import {launch, serviceWorker} from '../e2e/fixtures.ts';

const OUT = resolve(import.meta.dirname, '..', 'docs', 'images');
mkdirSync(OUT, {recursive: true});

const context = await launch(true);
const worker = await serviceWorker(context);
const extensionId = new URL(worker.url()).host;
const page = context.pages()[0] ?? await context.newPage();
const dot = page.locator('#profile-signals-host button.dot');
const panel = page.locator('#profile-signals-host .panel');

// The profile card and the open panel next to it, with a margin around both.
async function profile(slug: string, color: RegExp, file: string, p: Page = page): Promise<void> {
  await p.goto(`https://www.linkedin.com/in/${slug}/`);
  await dot.waitFor();
  await p.waitForFunction(re => document.querySelector('#profile-signals-host')?.shadowRoot
    ?.querySelector('button.dot')?.getAttribute('aria-label')?.match(new RegExp(re)), color.source, {timeout: 15_000});
  await dot.click();
  await panel.waitFor();
  const boxes = [await p.locator('#card').boundingBox(), await panel.boundingBox()].filter(b => b !== null);
  const x = Math.max(0, Math.min(...boxes.map(b => b.x)) - 16), y = Math.max(0, Math.min(...boxes.map(b => b.y)) - 16);
  const right = Math.max(...boxes.map(b => b.x + b.width)) + 16, bottom = Math.max(...boxes.map(b => b.y + b.height)) + 16;
  await p.screenshot({path: resolve(OUT, file), clip: {x, y, width: right - x, height: bottom - y}});
  console.log(`docs/images/${file}`);
}

await profile('ada-example', /Green/, 'preview-green.png');
await profile('mid-example', /Yellow/, 'preview-yellow.png');
await profile('new-account', /Red/, 'preview-red.png');

await page.goto(`chrome-extension://${extensionId}/options.html`);
await page.locator('#cacheCount').waitFor();
await page.screenshot({path: resolve(OUT, 'settings.png')});
console.log('docs/images/settings.png');

await context.close();
