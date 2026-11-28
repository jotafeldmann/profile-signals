# ADR-012: wait for the profile, retry for about half a minute, and show a grey ? when it could not be read

**Date:** 2026-11-27
**Status:** accepted.
**Context:** J saw the yellow "Hard gate not checked" on profiles opened for the first time, and the data
arriving bit by bit over two reloads. Reproduced on a synthetic profile that ignores clicks for 12 seconds:
collection waited for `document.readyState === "complete"`, tried to open **More → About this member** three
times in about three seconds, then showed yellow and never tried again. LinkedIn is a single-page app: the page
reports itself loaded well before the profile answers clicks, and the network line can show up seconds later.
Yellow is a judgment about the person; "the extension could not read the panel" is not.

## Decision

- **Wait for the profile, not the page.** After `readyState`, wait (up to 8 s) until the top card shows the
  **More** button and the network line, then one more second for it to settle (J's suggestion).
- **Retry with growing pauses.** Five tries, with pauses of 1, 2, 4 and 8 seconds between them, about half a
  minute in all. The dot stays the blue loading ring, labelled "Waiting for LinkedIn, try N of 5".
- **When the About panel never opened, the dot is a grey ?**, the panel says "Could not read this profile",
  lists what was read (the network line) without the rules, and its button is **Try again**. Nothing is
  cached. With automatic collection on, it tries once more when the person comes back to the tab.
- A panel that opened but lacks the creation date still gives a verdict, and the unchecked gate still caps it
  at yellow, as `docs/rules.md` says: the panel was read and LinkedIn did not show the date.

## Rejected

- **Only `readyState` plus a fixed delay:** a fixed second helps on a normal day and fails on a slow one; the
  More button and the network line are what the collection needs, so they are what it waits for.
- **Keep yellow when nothing could be read:** it reads as suspicion about the person for what is a page that
  did not answer.
- **Retry forever:** a LinkedIn layout the extension no longer recognises would leave the dot loading for good.

## Consequences

- A fast profile takes about one second longer to get its color.
- A profile that never opens the panel (a new LinkedIn layout, for example) shows the loading ring for about
  half a minute before the grey ?.
- `e2e/pages/profile.html` gains a `cold-start` profile (network line after 3 s, clicks after 7 s), which
  must end green without a reload, and a `never-ready` profile for the grey state and **Try again**. None of
  this proves the timing on the real LinkedIn; that comes from using the release.
