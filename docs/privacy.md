# Privacy and limits

## What leaves your browser

Nothing. The extension makes no network requests and uses no LinkedIn private API; it reads only what
LinkedIn shows you on the page. There is no server, account, analytics or AI.

## What is stored

- Your settings, in `chrome.storage.local` of this Chrome profile.
- The cache: for each collected profile, the name, the fields listed in the panel and the collection date,
  in the same place, until the entry expires (90 days by default) or you clear it in the settings tab.
  Removing the extension deletes all of it.

## LinkedIn's terms

LinkedIn's User Agreement does not allow software, including browser extensions, that scrapes or copies
profiles. This extension only reads the page you are looking at, for you, and keeps it on your machine. Still:

- **By default it collects automatically** (ADR-009): it opens LinkedIn's About panel on every profile you
  visit. That is automated use of LinkedIn's pages. Read LinkedIn's terms and your company's policies; the
  risk to your account is yours.
- **Turn automatic collection off** in Settings and it opens nothing by itself: collecting is then a click of
  yours, or the About panel you opened yourself.

## What the colors mean

They are signals to look closer, not proof. A new account or a missing verification does not show that a
profile is fake, and a green profile may still be fake. Do not use them alone for hiring or any other
decision about a person.

## Limits

- It reads LinkedIn in English and Portuguese only.
- LinkedIn changes its pages often. When the dot stops appearing or fields go missing, the page structure
  changed: see [how it works](how-it-works.md#when-linkedin-changes).
