// The installed extension, end to end, on synthetic profile pages. Run with: make test-e2e
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {automatic, configure, counts, dot, expect, manual, openProfile, panel, release, test} from './fixtures.ts';

test('by default, opening a profile collects it, in a few seconds', async ({page}) => {
  await openProfile(page, 'ada-example');
  // The wait for the profile to settle adds about a second, not the half minute of a slow start.
  await expect(dot(page)).toHaveAttribute('aria-label', /Green/, {timeout: 5_000});
  expect((await counts(page)).aboutOpened).toBe(1);
});

test('with automatic collection off, nothing is opened, and Collect now gives the verdict', async ({page, worker}) => {
  await configure(worker, manual);
  await openProfile(page, 'ada-example');
  await expect(dot(page)).toHaveAttribute('aria-label', /Not collected yet/);
  await page.waitForTimeout(1500);
  expect(await counts(page)).toMatchObject({menuOpened: 0, aboutOpened: 0});

  await dot(page).click();
  await expect(panel(page)).toContainText('Not collected yet');
  await panel(page).getByRole('button', {name: 'Collect now'}).click();
  await expect(dot(page)).toHaveAttribute('aria-label', /Green/, {timeout: 10_000});
  expect((await counts(page)).aboutOpened).toBe(1);
  await expect(page.locator('#about')).not.toHaveAttribute('open');
});

test('in manual mode, opening About this member yourself is read', async ({page, worker}) => {
  await configure(worker, manual);
  await openProfile(page, 'mid-example');
  await page.waitForFunction(() => (window as unknown as {__fixture: {hydrated: boolean}}).__fixture.hydrated);
  await page.locator('#more').click();
  await page.getByRole('menuitem', {name: 'About this member'}).click();
  await expect(dot(page)).toHaveAttribute('aria-label', /Yellow: Hard gate, Account created: 2020/, {timeout: 5000});
});

test('automatic collection rates each profile by the rules', async ({page, worker}) => {
  await configure(worker, automatic);
  await openProfile(page, 'ada-example');
  await expect(dot(page)).toHaveAttribute('aria-label', /Green/, {timeout: 10_000});
  await openProfile(page, 'new-account');
  await expect(dot(page)).toHaveAttribute('aria-label', /Red: Hard gate, Account created: 2023, after 2022/, {timeout: 10_000});
  await dot(page).click();
  await expect(panel(page)).toContainText('12');
  await expect(panel(page)).toContainText('No verifications');
});

test('automatic collection retries when the page ignores early clicks', async ({page, worker}) => {
  await configure(worker, automatic);
  await openProfile(page, 'slow-start');
  await expect(dot(page)).toHaveAttribute('aria-label', /Green/, {timeout: 15_000});
});

test('a cold start is waited for: green without reloading the page', async ({page, worker}) => {
  await configure(worker, automatic);
  await openProfile(page, 'cold-start');
  await expect(dot(page)).toHaveAttribute('aria-label', /Collecting/);
  await expect(dot(page)).toHaveAttribute('aria-label', /Green/, {timeout: 20_000});
  expect((await counts(page)).aboutOpened).toBe(1);
});

test('when LinkedIn never answers, the dot is a grey ?, and Try again reads it', async ({page, worker}) => {
  test.slow();
  await configure(worker, automatic);
  await openProfile(page, 'never-ready');
  await expect(dot(page)).toHaveAttribute('aria-label', /Waiting for LinkedIn, try 2 of 5/, {timeout: 10_000});
  await expect(dot(page)).toHaveAttribute('aria-label', /Could not read this profile/, {timeout: 40_000});
  await expect(dot(page).locator('.circle.unread')).toBeVisible();
  await dot(page).click();
  await expect(panel(page)).toContainText('Could not read this profile');
  await expect(panel(page)).not.toContainText(/Yellow|Hard gate not checked/);
  await expect(panel(page)).toContainText('410'); // the network line is still read

  await page.evaluate(() => { (window as unknown as {__fixture: {hydrated: boolean}}).__fixture.hydrated = true; });
  await panel(page).getByRole('button', {name: 'Try again'}).click();
  await expect(dot(page)).toHaveAttribute('aria-label', /Green/, {timeout: 15_000});
});

test('a cached profile opens nothing, and Refresh now collects again', async ({page, worker}) => {
  await configure(worker, automatic);
  await openProfile(page, 'ada-example');
  await expect(dot(page)).toHaveAttribute('aria-label', /Green/, {timeout: 10_000});

  await page.reload();
  await expect(dot(page)).toHaveAttribute('aria-label', /^Profile Signals: \[cached\] Green/, {timeout: 5000});
  await expect(dot(page).locator('.cachemark')).toBeVisible();
  await page.waitForTimeout(1000);
  expect((await counts(page)).aboutOpened).toBe(0);

  await dot(page).click();
  await expect(panel(page)).toContainText('From cache, collected');
  await panel(page).getByRole('button', {name: 'Refresh now'}).click();
  await expect(dot(page)).toHaveAttribute('aria-label', /^Profile Signals: Green/, {timeout: 10_000});
  expect((await counts(page)).aboutOpened).toBe(1);
});

test('the panel closes on a click elsewhere and on Escape', async ({page}) => {
  await openProfile(page, 'ada-example');
  await dot(page).click();
  await expect(panel(page)).toBeVisible();
  await page.mouse.click(900, 700);
  await expect(panel(page)).toHaveCount(0);
  await dot(page).click();
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
});

test('the dot floats left of the name without moving it', async ({page}) => {
  await openProfile(page, 'ada-example');
  const name = await page.locator('#name').boundingBox();
  const mark = await dot(page).boundingBox();
  expect(name && mark).toBeTruthy();
  expect(mark!.x + mark!.width).toBeLessThanOrEqual(name!.x);
  expect(Math.abs(mark!.y + mark!.height / 2 - (name!.y + name!.height / 2))).toBeLessThan(6);
  expect(name!.x).toBe(await page.evaluate(() => document.querySelector('section')!.getBoundingClientRect().x + 25));
});

test('the settings tab saves the collection switch and refuses bad thresholds', async ({page, worker, extensionId}) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.locator('#status')).toHaveText('Using the defaults from rules.json.');
  await expect(page.locator('#automatic')).toBeChecked();
  await page.locator('#automatic').uncheck();
  await page.getByRole('button', {name: 'Save'}).click();
  await expect(page.locator('#status')).toHaveText('Saved. Open LinkedIn tabs use it now.');
  expect(await worker.evaluate(async () => (await chrome.storage.local.get('config')).config.collection.automatic)).toBe(false);

  await page.locator('#yellowAt').fill('90');
  await page.getByRole('button', {name: 'Save'}).click();
  await expect(page.locator('#status')).toHaveText('Yellow must start at or below green');
});

test('extraction reads English and Portuguese About panels', async ({page}) => {
  await openProfile(page, 'ada-example');
  const result = await page.evaluate(async source => {
    // Load extract.js into the page itself, apart from the extension, and feed it panels.
    new Function(source)();
    const X = (globalThis as unknown as {ProfileSignalsExtract: {extractAbout: (d: Element, now: Date) => Record<string, string>}}).ProfileSignalsExtract;
    const panel = (lines: string[]) => { const d = document.createElement('div'); d.innerHTML = lines.map(l => `<p>${l}</p>`).join(''); document.body.append(d); return d; };
    const now = new Date(Date.UTC(2026, 10, 15));
    return {
      en: X.extractAbout(panel(['Joined', 'May 2013', 'Contact information updated', 'January 2025', 'Verifications', 'Identity', 'Verified by LinkedIn in April 2026', 'Workplace', 'Verified with a work email', 'Learn more', 'Add an identity verification like Bill']), now),
      pt: X.extractAbout(panel(['Data de entrada', 'maio de 2024', 'Verificações', 'Nenhuma verificação']), now)
    };
  }, await (await import('node:fs/promises')).readFile(new URL('../extension/extract.js', import.meta.url), 'utf8'));
  expect(result.en).toMatchObject({created: 'May 2013', age: '~162 months', contact: 'January 2025', verification: 'Identity: Verified by LinkedIn in April 2026; Workplace: Verified with a work email'});
  expect(result.pt).toMatchObject({created: 'maio de 2024', age: '~30 months', verification: 'Nenhuma verificação'});
});

test('a newer release puts a badge on the toolbar icon and the update line first in the panel', async ({page, context, worker}) => {
  await release(context, worker, 'v99.0.0');
  expect(await worker.evaluate(() => chrome.action.getBadgeText({}))).toBe(' ');
  await openProfile(page, 'ada-example');
  await dot(page).click();
  const first = panel(page).locator(':scope > *').first();
  await expect(first).toHaveText('There is an update for the extension · Update now ↗');
  await expect(first.getByRole('link', {name: 'Update now ↗'})).toHaveAttribute('href', 'https://github.com/jotafeldmann/profile-signals#install');
});

test('the installed version shows no badge and no update line', async ({page, context, worker}) => {
  const installed = await worker.evaluate(() => chrome.runtime.getManifest().version);
  await release(context, worker, `v${installed}`);
  expect(await worker.evaluate(() => chrome.action.getBadgeText({}))).toBe('');
  await openProfile(page, 'ada-example');
  await dot(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).locator('.update')).toHaveCount(0);
});

test('settings are shared as a file and loaded by a teammate, to review and save', async ({page, worker, extensionId}) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.getByRole('button', {name: 'Share my settings'}).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Download file'}).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('profile-signals-config.json');
  const shared = JSON.parse(readFileSync((await file.path())!, 'utf8'));
  expect(shared).toMatchObject({profileSignals: 'profile-signals-settings', format: 1});
  expect(shared).not.toHaveProperty('collection');

  // Unsaved changes are not shared.
  await page.locator('#yellowAt').fill('40');
  await expect(page.getByRole('button', {name: 'Download file'})).toBeDisabled();
  await expect(page.locator('#shareNote')).toHaveText('Save your changes first: sharing sends your saved settings.');

  await page.getByRole('button', {name: "Load a teammate's settings"}).click();
  await page.locator('#loadFile').setInputFiles(resolve(import.meta.dirname, '..', 'docs', 'examples', 'worst-signal-wins.json'));
  await expect(page.locator('#status')).toHaveText('Loaded. Review the settings below and click Save to use them.');
  await expect(page.locator('#rules .rule')).toHaveCount(3);
  await expect(page.locator('#yellowAt')).toHaveValue('50');
  expect(await worker.evaluate(async () => (await chrome.storage.local.get('config')).config)).toBeUndefined();

  await page.getByRole('button', {name: 'Save'}).click();
  const saved = await worker.evaluate(async () => (await chrome.storage.local.get('config')).config);
  expect(saved.rules.map((r: {id: string}) => r.id)).toEqual(['account-age', 'connections', 'verification']);
  expect(saved.collection.automatic).toBe(true);
});

test('pasted text that is not settings is refused and changes nothing', async ({page, extensionId}) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.getByRole('button', {name: "Load a teammate's settings"}).click();
  await page.locator('#loadText').fill('hello team');
  await page.getByRole('button', {name: 'Load the pasted text'}).click();
  await expect(page.locator('#status')).toHaveText('This is not a settings file: the text is not valid JSON.');
  await expect(page.locator('#rules .rule')).toHaveCount(3);
  await expect(page.locator('#rules .rule').first()).toContainText('Account created');
});
