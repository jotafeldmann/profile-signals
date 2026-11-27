# ADR-010: a newer release is announced, not installed

**Date:** 2026-11-27
**Status:** accepted.
**Context:** People install the extension from the zip on GitHub with **Load unpacked**, following the README; Chrome never updates such an extension. A person who installed it that way can update it the same way, but has no way to know a new version exists. Automatic updates need the Chrome Web Store (a developer account, Google's review, and a review risk because of automatic collection, ADR-009) or a self-hosted updater script, which macOS and Windows block or warn about for people who are not technical.

## Decision

The extension asks GitHub for the latest release (`api.github.com/repos/jotafeldmann/profile-signals/releases/latest`, its `tag_name`) and only announces it:

- **At most once a day.** The answer and its time are kept in `chrome.storage.local` (`update`); a failed request is retried an hour later, not on every page.
- **Never again once a newer version is known**, until the installed version reaches it: one or two versions behind, the message is the same, and the link always leads to the latest.
- While a newer version exists, a red badge sits on the toolbar icon and the first line of the panel (on the page and in the popup) says *There is an update for the extension · Update now ↗*, linking to the README's install steps. No version numbers.
- No new permission: GitHub's API allows the request from the extension.

## Rejected

- **Chrome Web Store:** the only real automatic update, but it needs an account, a review per version, and may be refused for automatic collection.
- **Updater scripts for Windows and macOS:** blocked by Gatekeeper and SmartScreen unless signed; too hard for the people who use the extension.
- **A red mark on the dot next to the profile name:** red there means a red profile.
- **A setting to turn the check off:** not asked for; easy to add.

## Consequences

- The extension is no longer free of network requests: one request a day to GitHub at most, which tells GitHub the person's IP address and that they use the extension. It carries no profile data. The privacy page says so.
- The browser tests refuse that request like every other one (ADR-006); `release()` in `e2e/fixtures.ts` answers it with a fake release.
- The badge and the line depend on GitHub's release tags matching the manifest version, which CI already enforces.
