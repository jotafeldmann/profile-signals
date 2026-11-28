# HANDOFF.md

## How to use this

*This section is the document's rules and does not change. Everything below it does.*

This is the only document here about work that has not happened. Everything else is about the past.
This is a **queue rather than an archive**.

- **An item leaves.** It ships and is recorded in an annotated tag and its commits, or it is rejected and
  the reason is written as an ADR in `docs/decisions/`. Nothing is deleted silently, and nothing stays here
  because deciding was harder than leaving it.
- **Never write a cost or a date here.** Point at the command that derives it (`make usage`). What belongs
  here is the *decision* a cost implies: whether a piece of work wants its own session.
- **A design agreed but not built belongs here, in full**, so the next session builds it instead of
  re-deciding it.
- **One backlog.** If work is listed here and somewhere else too, the two will disagree.
- **Say what is not known.** An open question is the first thing to put to the person.

What changed is in annotated git tags and commit messages (`git log`, `git tag -n`); there is no changelog.
Decisions are in `docs/decisions/`.

---

## Open

| Slug | What | Own session? | Priority | How to start |
|---|---|---|---|---|
| `own-profile` | On the person's **own** profile the dot gets a color only some of the time ([#1](https://github.com/jotafeldmann/profile-signals/issues/1)); other profiles are fine as far as known. Documented in the README, not being fixed now (J's choice). | no | after `real-linkedin-check` | Follow the checklist in issue #1 on your own profile: More button recognised, **About this member** present, network line without a degree (`ready()` in `content.js`), the panel's diagnostic line. Then an "own profile" variant in `e2e/pages/profile.html` and a test, or an ADR putting it out of scope. |
| `real-linkedin-check` | Nothing proves the synthetic page still matches the real LinkedIn: the browser tests never reach it (ADR-006). The person has not yet loaded 0.3.0 in their own Chrome. | no | first | The person removes the old unpacked j-linkedin from `chrome://extensions` (its folder moved), loads `extension/` from this repository, and on one real profile tries **Collect now**, then automatic mode, then a cached revisit. Anything off: compare the real About panel with `e2e/pages/profile.html`. |
| `popup-test` | The toolbar popup (`popup.html`) is the one surface no test opens: it asks for the active tab, and a popup opened as a page is its own active tab. | no | after `real-linkedin-check` | Open the profile page, then `popup.html` in a second tab and make the first one active through `chrome.tabs.update` from the service worker, or test `popup.js` with a stubbed `chrome.tabs`. |
| `icons` | The extension has no icons; Chrome shows a grey letter. Needed for the Web Store too. | no | any time | A 16/32/48/128 px set in `extension/icons/`, listed in `manifest.json` and in `SHIPPED` (`scripts/package.ts`). |

Items are identified by a **slug, not a number**.

## Designed, not built

### `web-store`

Publishing to the Chrome Web Store, rejected for now (ADR-008), so installing needs Developer mode. What it
would take, as far as known: a developer account (one-time fee), icons (`icons`), screenshots, a privacy
policy page (docs/privacy.md is most of it), and a review that asks why `https://*.linkedin.com/*` is needed.
Open question for the person: is a store listing wanted at all, given LinkedIn's terms (ADR-002)?

## Where things stand

- `v0.3.0` is the first public version: renamed from j-linkedin (ADR-003), manual collection by default
  (ADR-002), extraction split into `extension/extract.js`.
- `make ci` is green locally: 14 unit tests, 9 browser tests, 4 visual tests. CI runs the same in
  Playwright's Docker image on every push; a `v*` tag publishes a release with the zip.
- Not tested anywhere: the real LinkedIn (`real-linkedin-check`) and the toolbar popup (`popup-test`).
