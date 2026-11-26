# Profile Signals

[![ci](https://github.com/jotafeldmann/profile-signals/actions/workflows/ci.yml/badge.svg)](https://github.com/jotafeldmann/profile-signals/actions/workflows/ci.yml)

A Chrome extension that reads what LinkedIn already shows about a member profile (account creation date,
verifications, connections) and rates it green, yellow or red with rules you set. No account, no AI, no
server: everything runs and stays in your browser.

**The colors are signals to look closer, not proof.** A new account does not make a profile fake, and a
green one may still be fake. Do not use them alone for hiring or any other decision about a person.

## Preview

<p>
  <img src="docs/images/preview-green.png" width="270" alt="A green dot next to a profile name, with the panel open: every rule passes">
  <img src="docs/images/preview-yellow.png" width="270" alt="A yellow verdict: the account was created between 2016 and 2022">
  <img src="docs/images/preview-red.png" width="270" alt="A red verdict: the account was created after 2022, with no verifications and few connections">
</p>

The profiles above are invented, as in the tests. The settings tab:

<img src="docs/images/settings.png" width="600" alt="The settings tab: verdict thresholds, automatic collection, rules and cache">

## Install

1. Download `profile-signals-<version>.zip` from the
   [latest release](https://github.com/jotafeldmann/profile-signals/releases/latest) and extract it.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the extracted
   `profile-signals` folder (the one with `manifest.json`).
3. Pin the extension from the puzzle icon, then open or reload a LinkedIn profile.

To update, replace the folder's files, click reload on the extension in `chrome://extensions`, then reload
LinkedIn.

## Use

- On a profile (`https://www.linkedin.com/in/...`) a dot floats to the left of the name. The extension opens
  **More → About this member** by itself, reads it and closes it: the dot turns **green**, **yellow** or
  **red**, and clicking it shows why, rule by rule.
- **Settings** in the panel changes the rules, their weights and hard gates, the cache, and whether to
  collect automatically (on by default: see [privacy and limits](docs/privacy.md)). Turned off, the dot stays
  grey until you click it and choose **Collect now**, or open the About panel yourself.
- A small ring on the dot means the result came from the cache; **Refresh now** collects again.

## Develop

Needs nvm, and Docker for the visual tests. Then:

```bash
make install
```

```bash
make ci
```

`make` lists every command. `make start` opens Chromium with the extension on synthetic profiles; the
tests never reach LinkedIn.

## Docs

- [Getting started](docs/getting-started.md): first run, tests, releasing a version
- [Rules](docs/rules.md): how the color is decided, the defaults, the cache
- [Privacy and limits](docs/privacy.md)
- [How it works](docs/how-it-works.md): the files, the collection steps, what breaks when LinkedIn changes
- [Decisions](docs/decisions/README.md)
- [HANDOFF.md](HANDOFF.md): what is left to do

License: [MIT](LICENSE).

Made by [jotafeldmann](https://github.com/jotafeldmann). Not affiliated with LinkedIn.
