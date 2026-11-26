// Screenshots compared with stored baselines. Fonts differ between machines, so these run only inside
// Playwright's Docker image, locally (make test-visual) and in CI alike. See ADR-007.
import {automatic, configure, dot, expect, openProfile, panel, test} from './fixtures.ts';

test('panel with a green verdict', async ({page, worker}) => {
  await configure(worker, automatic);
  await openProfile(page, 'ada-example');
  await expect(dot(page)).toHaveAttribute('aria-label', /Green/, {timeout: 10_000});
  await dot(page).click();
  // The account age changes every month; everything else on the panel is fixed.
  const age = panel(page).locator('.line', {hasText: 'Account age'}).locator('dd');
  await expect(panel(page)).toHaveScreenshot('panel-green.png', {mask: [age]});
});

test('panel before anything is collected', async ({page}) => {
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

test('settings tab', async ({page, extensionId}) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.locator('#cacheCount')).toHaveText('0 profiles cached.');
  await expect(page).toHaveScreenshot('settings.png');
});
