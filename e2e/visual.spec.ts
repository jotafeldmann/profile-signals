// Screenshots compared with stored baselines. Fonts differ between machines, so these run only inside
// Playwright's Docker image, locally (make test-visual) and in CI alike. See ADR-007.
import {automatic, configure, dot, expect, manual, openProfile, panel, release, test} from './fixtures.ts';

test('panel with a green verdict', async ({page, worker}) => {
  await configure(worker, automatic);
  await openProfile(page, 'ada-example');
  await expect(dot(page)).toHaveAttribute('aria-label', /Green/, {timeout: 10_000});
  await dot(page).click();
  // The account age changes every month; everything else on the panel is fixed.
  const age = panel(page).locator('.line', {hasText: 'Account age'}).locator('dd');
  await expect(panel(page)).toHaveScreenshot('panel-green.png', {mask: [age]});
});

test('panel before anything is collected', async ({page, worker}) => {
  await configure(worker, manual);
  await openProfile(page, 'new-account');
  await dot(page).click();
  await expect(panel(page)).toHaveScreenshot('panel-idle.png');
});

test('dot next to the name', async ({page, worker}) => {
  await configure(worker, automatic);
  await openProfile(page, 'new-account');
  await expect(dot(page)).toHaveAttribute('aria-label', /Red/, {timeout: 10_000});
  await expect(page.locator('#card')).toHaveScreenshot('card-red.png');
});

test('panel when LinkedIn never opened About this member', async ({page, worker}) => {
  test.slow();
  await configure(worker, automatic);
  await openProfile(page, 'never-ready');
  await expect(dot(page)).toHaveAttribute('aria-label', /Could not read this profile/, {timeout: 40_000});
  await expect(page.locator('#card')).toHaveScreenshot('card-unread.png');
  await dot(page).click();
  await expect(panel(page)).toHaveScreenshot('panel-unread.png');
});

test('settings tab', async ({page, extensionId}) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.locator('#cacheCount')).toHaveText('0 profiles cached.');
  await expect(page).toHaveScreenshot('settings.png');
});

test('update line at the top of the panel', async ({page, context, worker}) => {
  await release(context, worker, 'v99.0.0');
  await configure(worker, manual);
  await openProfile(page, 'new-account');
  await dot(page).click();
  await expect(panel(page).locator('.update')).toHaveScreenshot('panel-update.png');
});

test('share with your team, open', async ({page, extensionId}) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.getByRole('button', {name: 'Share my settings'}).click();
  await expect(page.locator('#share')).toHaveScreenshot('share.png');
});
