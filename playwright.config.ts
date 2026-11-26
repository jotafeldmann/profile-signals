// Browser tests. One worker: each test launches its own Chromium with the extension, and that is the
// slow part, not the tests. Visual baselines are made in Playwright's Docker image (ADR-007).
import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', {open: 'never'}]] : [['list']],
  timeout: 30_000,
  use: {trace: 'retain-on-failure'},
  expect: {toHaveScreenshot: {maxDiffPixelRatio: 0.01}},
  projects: [
    {name: 'e2e', testMatch: 'extension.spec.ts'},
    {name: 'visual', testMatch: 'visual.spec.ts'}
  ]
});
