# ADR-005: rules reach the page through the background worker; results are cached locally per profile URL

**Date:** 2026-11-26
**Status:** accepted.
**Context:** The content script needs `rules.json`, and collecting the same profile again opens LinkedIn's menus again.

## Decision

- The background worker answers `profile-signals:rules` with the saved settings or `rules.json`. The file is not a web-accessible resource, so pages cannot probe for it.
- Each collected profile is stored in `chrome.storage.local` under `profile:/in/<slug>` for 90 days (configurable), only when the creation date was read. **Refresh now** replaces it.

## Rejected

- **web_accessible_resources for rules.json:** any page could detect the extension by fetching it.
- **Cache keyed by name:** names repeat; the URL slug does not.

## Consequences

- Collected profile data stays on the machine until it expires, is cleared, or the extension is removed (docs/privacy.md).
