/**
 * A Chromium with the extension loaded, where every https://www.linkedin.com/in/<slug>/ answers with the
 * synthetic page in pages/profile.html and every other web request is refused. Nothing reaches LinkedIn.
 *
 * `channel: "chromium"` is required: Playwright's default headless binary (chromium_headless_shell) loads
 * no extensions and says nothing about it; the full Chromium's new headless mode does.
 */
import {test as base, chromium, expect, type BrowserContext, type Page, type Worker} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

export const EXTENSION = resolve(import.meta.dirname, '..', 'extension');
const PAGE = readFileSync(resolve(import.meta.dirname, 'pages', 'profile.html'), 'utf8');
const PROFILE = /^\/in\/[^/]+\/?$/;

export async function launch(headless = true): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless,
    viewport: {width: 1000, height: 900},
    locale: 'en-US',
    timezoneId: 'UTC',
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`]
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!url.protocol.startsWith('http')) return route.continue();
    if (url.hostname === 'www.linkedin.com' && PROFILE.test(url.pathname)) return route.fulfill({contentType: 'text/html', body: PAGE});
    return route.abort();
  });
  return context;
}

export async function serviceWorker(context: BrowserContext): Promise<Worker> {
  return context.serviceWorkers()[0] ?? context.waitForEvent('serviceworker');
}

/** Saves settings as the settings tab would: rules.json with `patch` on top. */
export async function configure(worker: Worker, patch: Record<string, unknown>): Promise<void> {
  await worker.evaluate(async patch => {
    const defaults = await (await fetch(chrome.runtime.getURL('rules.json'))).json();
    await chrome.storage.local.set({config: {...defaults, ...patch}});
  }, patch);
}

export const automatic = {collection: {automatic: true}};

/** The status dot and the panel, inside the extension's shadow root (Playwright locators pierce it). */
export const dot = (page: Page) => page.locator('#profile-signals-host button.dot');
export const panel = (page: Page) => page.locator('#profile-signals-host .panel');
export const counts = (page: Page) => page.evaluate(() => (window as unknown as {__fixture: {menuOpened: number; aboutOpened: number}}).__fixture);

export async function openProfile(page: Page, slug: string): Promise<void> {
  await page.goto(`https://www.linkedin.com/in/${slug}/`);
  await expect(dot(page)).toBeVisible();
}

export const test = base.extend<{context: BrowserContext; worker: Worker; extensionId: string}>({
  context: async ({}, use) => {
    const context = await launch(!process.env.HEADED);
    await use(context);
    await context.close();
  },
  worker: async ({context}, use) => use(await serviceWorker(context)),
  extensionId: async ({worker}, use) => use(new URL(worker.url()).host)
});
export {expect};
