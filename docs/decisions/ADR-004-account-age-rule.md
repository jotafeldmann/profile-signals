# ADR-004: account age is the hard gate, with the generative-AI era as the red line

**Date:** 2026-11-26
**Status:** accepted.
**Context:** J asked for configurable rules, with this default: an account created before 2016 is green, around 2020 yellow, after 2022 red, because of the AI era.

## Decision

Rule `account-created`, weight 5, hard gate, green before 2016, red after 2022, yellow in between. Late 2022 starts the generative-AI era (ChatGPT, November 2022): realistic photos, CVs and posts became cheap. Verifications (weight 3, yellow when none is shown, never red) and connections (weight 2) complete the score. Green at 80%, yellow at 50%.

## Rejected

- **Red when no verification is shown:** many genuine members never verify.

## Consequences

- Every account created after 2022 is red whatever else it shows, including genuine people who joined recently. The panel explains it, and the docs say the colors are signals, not proof.
- Everything here is editable in the settings tab.
