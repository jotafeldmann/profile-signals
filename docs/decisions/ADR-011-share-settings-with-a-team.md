# ADR-011: teams share settings as a file or text; only what decides the color travels

**Date:** 2026-11-27
**Status:** accepted.
**Context:** A recruiter using the extension wants the whole team to judge profiles by the same rules: one person sets the hard gates and limits, the others use them. The settings tab already showed the settings as JSON, but copying from there is a technical step, and it carries the collection mode and the cache too.

## Decision

A **Share with your team** section at the top of the settings tab:

- **Share my settings** downloads `profile-signals-config.json` or copies the same text. It sends the **saved** settings; with unsaved changes the buttons are off and say why.
- **Load a teammate's settings** takes the file or pasted text, checks it with the same checks as Save, and puts it in the form. Nothing is saved until the person clicks **Save**.
- The file holds `profileSignals: "profile-signals-settings"`, `format: 1`, the extension version it came from, the **verdict thresholds and the rules** (weights, hard gates, limits). A plain `rules.json` is accepted too. A file from a newer format is refused with "update the extension first".
- `share.js` holds this and the checks the settings tab uses before saving, so the unit tests reach them.

`docs/examples/worst-signal-wins.json` is the first shared set, from a recruiter's criteria: account age in months (red under 12, green from 24), connections (red under 100, green above 200) and verifications (red when none), every rule a hard gate, so the worst signal decides.

## Rejected

- **Sharing collection and cache too:** automatic collection is a risk each person takes for their own LinkedIn account (ADR-009); a teammate's file must not turn it on.
- **A link or a server to sync settings:** the extension has no server, and a file sent in chat is enough.
- **"No photo" as red in the example:** the only photo field is "Profile photo updated" from the About panel; its absence does not show that there is no photo. It needs a check on a real profile first (`real-linkedin-check` in HANDOFF.md). "AI photo" cannot be judged deterministically and stays out.

## Consequences

- One person's rules can become the team's in two clicks each. Everyone still sees and saves them.
- With every rule a gate, the weights stop mattering, and missing verification alone makes a profile red; many genuine members never verify. The example says so.
- A new account now reads "~0 months" instead of "This month", so an age rule can judge it.
