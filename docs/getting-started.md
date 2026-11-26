# Getting started

For someone who has never seen this repository. Every step is a `make` command; the table at the end shows
what each one runs.

## Requirements

- Linux or macOS with [nvm](https://github.com/nvm-sh/nvm). The Node version is pinned in `.nvmrc`.
- Docker, only for the visual tests (`make test-visual`).
- `zip`, only for building the release package (`make package`).
- Google Chrome (or Chromium) to use the extension for real.

`make doctor` checks all of these.

## Five minutes

```bash
make node
```

```bash
make install
```

```bash
make start
```

`make start` opens Chromium with the extension loaded on a synthetic profile. Click the grey dot left of the
name, then **Collect now**. Other synthetic profiles: `make start PROFILE=new-account` (red),
`PROFILE=mid-example` (yellow), `PROFILE=slow-start` (a page that ignores the first clicks).

To try it on the real LinkedIn, load the `extension/` folder in Chrome: `chrome://extensions`, **Developer
mode**, **Load unpacked**. After changing a file, click reload on the extension and reload the LinkedIn tab.

## Tests

| Command            | What it covers                                                                          | Time  |
| ------------------ | --------------------------------------------------------------------------------------- | ----- |
| `make test`        | the scoring rules, one version everywhere, the package holds exactly what ships        | <1 s  |
| `make test-e2e`    | the installed extension in Chromium: manual and automatic collection, retries, cache, panel, settings tab, English and Portuguese panels | ~20 s |
| `make test-visual` | screenshots of the panel, the dot and the settings tab, in Playwright's Docker image   | ~30 s |
| `make ci`          | lint, typecheck and all of the above: what CI runs                                     |       |

The browser tests never reach LinkedIn: Playwright answers every `https://www.linkedin.com/in/<slug>/` with
the synthetic page in `e2e/pages/profile.html` and refuses every other request (ADR-006). `HEADED=1 make
test-e2e` shows the browser.

A visual change that is intended needs new baselines: `make test-visual-update`, then look at the images in
`e2e/visual.spec.ts-snapshots/` before committing them.

## Releasing a version (step by step)

A release is public and people install from it, so go in this order.

1. On a branch, change the version in **both** `extension/manifest.json` and `package.json`. `make test`
   fails if they differ.
2. `make ci` must be green.
3. Merge into `main`, then create an annotated tag whose message is the release notes:
   `git tag -a v0.4.0 -m "v0.4.0: ..."`.
4. Push `main` and the tag. CI runs the tests again, checks that the tag equals the manifest version,
   builds `profile-signals-<version>.zip` and publishes a GitHub release with it.
5. Check the release page, download the zip, load it in Chrome once.

To see the package without releasing: `make package` writes it to `dist/`.

## Commands and what they run

| `make`               | Runs                                                                             |
| -------------------- | -------------------------------------------------------------------------------- |
| `node`               | `nvm install && nvm use`                                                         |
| `install`            | `npm install && npx playwright install chromium`                                 |
| `start`              | `node scripts/playground.ts`                                                     |
| `test`               | `node --test 'test/*.test.ts'`                                                   |
| `test-e2e`           | `playwright test --project=e2e`                                                  |
| `test-visual`        | `docker run ... mcr.microsoft.com/playwright:<version> npm run test:visual`      |
| `test-visual-update` | the same, with `--update-snapshots`                                              |
| `lint`               | `node scripts/lint.ts` (`node --check` on each script, JSON parse)               |
| `typecheck`          | `tsc` (tests and scripts; the extension is plain JavaScript, ADR-001)            |
| `package`            | `node scripts/package.ts`                                                        |
