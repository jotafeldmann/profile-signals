// Opens Chromium with the extension on a synthetic profile, for trying a change by hand. Run with: make start
// The same routing as the browser tests: nothing reaches LinkedIn. Close the browser window to stop.
import {launch} from '../e2e/fixtures.ts';

const slug = process.env.PROFILE || 'ada-example';
const context = await launch(false);
const page = context.pages()[0] ?? await context.newPage();
await page.goto(`https://www.linkedin.com/in/${slug}/`);
console.log(`Synthetic profiles: ada-example, mid-example, new-account, slow-start (now: ${slug}).`);
await new Promise(resolve => context.on('close', resolve));
