// The installed extension, end to end, on synthetic profile pages. Run with: make test-e2e
import {automatic, configure, counts, dot, expect, openProfile, panel, test} from './fixtures.ts';

test('by default nothing is opened, and Collect now gives the verdict', async ({page}) => {
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

test('in manual mode, opening About this member yourself is read', async ({page}) => {
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
  await expect(page.locator('#automatic')).not.toBeChecked();
  await page.locator('#automatic').check();
  await page.getByRole('button', {name: 'Save'}).click();
  await expect(page.locator('#status')).toHaveText('Saved. Open LinkedIn tabs use it now.');
  expect(await worker.evaluate(async () => (await chrome.storage.local.get('config')).config.collection.automatic)).toBe(true);

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
