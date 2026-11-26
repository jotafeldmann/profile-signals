# ADR-009: collection is automatic by default; manual is a setting

**Date:** 2026-11-26
**Status:** accepted. Supersedes ADR-002.
**Context:** After 0.3.0 made collection manual (ADR-002), J found the extra click on every new profile not worth it: the extension is used during long reviews, where entering a profile and seeing the dot is the point. J chose to make automatic collection the default again.

## Decision

`collection.automatic` is `true` in `rules.json`, and a missing value also means automatic (`content.js` and the settings tab test `!== false`). Entering a profile opens **More → About this member**, reads it and closes it, as in 0.2.0. Manual mode stays as a checkbox in the settings tab: turned off, the dot is grey until the person clicks **Collect now** or opens the About panel.

## Rejected

- **Keep manual by default (ADR-002):** safer for a public extension, but J judged the click too costly for the way it is used.
- **Ask on first run which mode to use:** one more screen for a choice that is a checkbox away in Settings.

## Consequences

- Every profile visit is automated use of LinkedIn's pages, for every user who installs it without changing the setting; LinkedIn's User Agreement does not allow software that scrapes or copies profiles, and the repository is public under J's name. That is the risk ADR-002 avoided, now accepted.
- The privacy page and the settings tab say so, and say how to turn it off.
- A person who saved settings before this change keeps the value they saved: a stored `automatic: false` stays manual.
