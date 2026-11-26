# How it works

## Files

Everything Chrome loads is in `extension/`, plain JavaScript with no build step (ADR-001).

| File                        | Role                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `manifest.json`             | Manifest V3; content scripts on `https://*.linkedin.com/*`                                 |
| `extract.js`                | reads the page: name heading, network line of the top card, the About this member panel   |
| `verdict.js`                | applies the rules to the collected fields: score, hard gates, color                        |
| `content.js`                | decides when to collect, opens menus in automatic mode, caches, draws the dot             |
| `inspector.js`              | draws the dot and the panel (shared by the page and the toolbar popup)                    |
| `background.js`             | hands the rules to the page (saved settings, else `rules.json`) and opens the settings tab |
| `options.html`, `options.js` | the settings tab                                                                          |
| `popup.html`, `popup.js`    | the toolbar popup: the same panel for the active tab                                      |
| `rules.json`                | the default rules                                                                          |

`rules.json` is read through the background worker, not exposed as a web-accessible resource, so LinkedIn's
pages cannot probe for it to detect the extension (ADR-005).

## The dot

One element on `<body>` with a shadow root, positioned absolutely to the left of the name heading. It is not
inside the name's link, does not move the profile text, and sits above LinkedIn's card. It hides under
LinkedIn's fixed top bar unless the panel is open. A click outside the panel, or Esc, closes it.

## Collection steps

1. Read the network line of the top card (connections, followers, mutual, degree).
2. Wait for `document.readyState === "complete"`: LinkedIn ignores clicks made before its scripts start.
3. Open **More** (`aria-label` "More actions" and variants), up to three attempts.
4. Click **About this member**, wait up to 2.5 s for the dialog.
5. The dialog opens empty and is filled about half a second later: poll until the creation date, photo or
   contact line appears (up to 4 s), read it, close the dialog.

The dot is a blue ring that fills through these steps. In manual mode, step 1 runs on arrival and steps 2–5
only on **Collect now**; a panel the person opened is read as it is.

## When LinkedIn changes

The page structure is the fragile part, and the synthetic page in `e2e/pages/profile.html` copies only what
`extract.js` reads. When the real page changes:

1. Open a real profile, open **More → About this member**, and compare its structure with the synthetic page.
2. Change `extract.js`, then the synthetic page to match the new structure (invented people only).
3. `make test-e2e`, then reload the extension and check one real profile by hand.

The panel shows a "Diagnostic" note when it could not find the menu or the dialog; it says which one.
