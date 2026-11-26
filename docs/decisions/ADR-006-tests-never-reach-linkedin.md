# ADR-006: browser tests run on synthetic pages; nothing reaches LinkedIn

**Date:** 2026-11-26
**Status:** accepted.
**Context:** The extension only runs on `https://*.linkedin.com/*`. Testing against the real site would need an account, would be automated use of LinkedIn, and would put real people's data into a public repository.

## Decision

Playwright launches Chromium with the unpacked extension and answers every `https://www.linkedin.com/in/<slug>/` with `e2e/pages/profile.html`, which copies only the structure `extract.js` reads, with invented people. Every other web request is refused.

## Rejected

- **Saved copies of real profile pages:** personal data and LinkedIn's content in a public repository.
- **Tests against linkedin.com:** an account in CI, flaky, and against the terms.

## Consequences

- Green tests do not prove the real page still matches. Checking one real profile by hand stays part of a release (docs/how-it-works.md).
