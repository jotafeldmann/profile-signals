# ADR-002: collection is manual by default; automatic is an opt-in setting

**Date:** 2026-11-26
**Status:** accepted.
**Context:** Until 0.2.0 the extension opened LinkedIn's **More → About this member** panel by itself on every profile. LinkedIn's User Agreement does not allow software that scrapes or copies profiles, and a public repository under the author's name makes that behaviour visible. J chose to make it optional.

## Decision

`collection.automatic` in the rules, `false` by default. In manual mode the dot is grey ("Not collected yet") until the person clicks **Collect now** or opens the About panel themselves; the extension reads the network line of the card but shows no verdict, because the account date is the hard gate. Automatic mode keeps the 0.2.0 behaviour and is a checkbox in the settings tab, with a warning.

## Rejected

- **Automatic by default:** faster, but every visit becomes automated use of LinkedIn's pages, for every user who installs it.
- **Remove automatic collection:** it is the reason the extension is useful during a long review; the person may decide the risk is theirs.

## Consequences

- One extra click per new profile by default. The cache keeps that to the first visit.
- The privacy page states the risk of automatic mode.
