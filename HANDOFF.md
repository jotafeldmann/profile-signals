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
| `real-linkedin-check` | The browser tests never reach LinkedIn (ADR-006), so what 0.5.1 changed is unproven there. The person uses the extension on real profiles; still unchecked: that a profile opened for the first time no longer turns yellow (ADR-012's waits in `extension/content.js`), that the update notice shows on 0.5.0 and goes away on 0.5.1 (ADR-010), and whether a profile with no photo lacks "Profile photo updated" in the About panel (the "No photo" rule ADR-011 left out). | no | first | Load the v0.5.0 release zip, clear the last check in the service worker console (`await chrome.storage.local.remove('update'); await update()`), see the badge and the panel line, update to 0.5.1, then open a few profiles never visited before. Anything off: compare the real page with `e2e/pages/profile.html`. |
| `own-profile` | On the person's **own** profile the dot gets a color only some of the time ([#1](https://github.com/jotafeldmann/profile-signals/issues/1)); other profiles are fine as far as known. The README warns about it; not being fixed now (J's choice). | no | after `real-linkedin-check` | Follow the checklist in issue #1 on your own profile: More button recognised (`findMenu` in `extract.js`), **About this member** present, a network line without a degree (`ready()` in `content.js`), the panel's diagnostic line. Then an "own profile" variant in `e2e/pages/profile.html` and a test, or an ADR putting it out of scope. |
| `popup-test` | The toolbar popup (`popup.html`) is the one surface no test opens: it asks for the active tab, and a popup opened as a page is its own active tab. | no | any time | Open the profile page, then `popup.html` in a second tab and make the first one active through `chrome.tabs.update` from the service worker, or test `popup.js` with a stubbed `chrome.tabs`. |
| `icons` | The extension has no icons; Chrome shows a grey letter. Needed for the Web Store too. | no | any time | A 16/32/48/128 px set in `extension/icons/`, listed in `manifest.json` and in `SHIPPED` (`scripts/package.ts`). |

Items are identified by a **slug, not a number**.

Open question for the person, from `docs/examples/worst-signal-wins.json`: does the recruiter mean "the worst
signal wins" (every rule a hard gate, as built), or a weighted score? Nothing changes until they answer.

## Designed, not built

### `web-store`

Publishing to the Chrome Web Store, rejected for now (ADR-008), so installing needs Developer mode. What it
would take, as far as known: a developer account (one-time fee), icons (`icons`), screenshots, a privacy
policy page (docs/privacy.md is most of it), and a review that asks why `https://*.linkedin.com/*` is needed.
Open question for the person: is a store listing wanted at all, given LinkedIn's terms (ADR-002)?

## Where things stand

- `v0.5.1` is the latest release: collection automatic by default (ADR-009), update notice (ADR-010), team
  settings as a file or text (ADR-011), waits for LinkedIn and a grey ? when a profile cannot be read
  (ADR-012). `git tag -n` has the notes of each.
- Anyone still on 0.4.0 or older gets no update notice (it exists from 0.5.0 on): tell them by hand.
- Checks run in this session on this tree: `make ci` passed: lint, typecheck, `make test` (28 unit tests), `make test-e2e` (16 browser tests), `make test-visual` (7 screenshots, Docker).
- Not tested anywhere: the real LinkedIn (`real-linkedin-check`) and the toolbar popup (`popup-test`).
