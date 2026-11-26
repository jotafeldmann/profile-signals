# Rules: what makes a profile green, yellow or red

The defaults live in [`extension/rules.json`](../extension/rules.json). Change them in the **settings tab**
(Settings in the panel, or right-click the toolbar icon, **Options**). Saved settings override the file and
apply at once to open LinkedIn tabs; **Reset to defaults** returns to the file.

- **Priority** is the order of the rules: shown and checked top to bottom. ↑ ↓ reorder them.
- **Weight** is how much a rule counts. Each rule gives green (1 point), yellow (0.5) or red (0); the score is
  the weighted average of the rules that could be checked. By default 80% or more is green, 50% or more is
  yellow, anything lower is red. A field LinkedIn did not show is left out of the score.
- **Hard gate** lets one rule decide on its own: a red gate makes the profile red, a yellow gate caps it at
  yellow, and a gate that could not be checked also caps it at yellow.

## Defaults

| Rule            | Weight | Hard gate | Green                  | Yellow       | Red           |
| --------------- | ------ | --------- | ---------------------- | ------------ | ------------- |
| Account created | 5      | yes       | before 2016            | 2016 to 2022 | after 2022    |
| Verifications   | 3      | no        | any verification shown | none shown   | (never)       |
| Connections     | 2      | no        | 100 or more            | 20 to 99     | fewer than 20 |

Accounts created after 2022 are red by default because late 2022 began the generative-AI era (ChatGPT
launched in November 2022): realistic photos, CVs and posts became cheap, and fake profiles became easy to
produce at scale (ADR-004).

`500+` counts as 500: LinkedIn does not show the exact number. Creator profiles may show only followers;
then the connections rule is left out of the score.

## Rule types

| `type`    | Reads                        | Settings                                   |
| --------- | ---------------------------- | ------------------------------------------ |
| `year`    | the first year in the field  | `greenBefore`, `redAfter` (strict)         |
| `number`  | the first number in the field | `greenAtLeast`, `redBelow`                 |
| `present` | whether the field has text   | `ifMissing`: the color when nothing is shown |

Fields: `created`, `connections`, `followers`, `mutual`, `degree`, `photo`, `contact`, `verification`.

## Collection

- `collection.automatic: false` (default): nothing is opened by itself. The dot stays grey until you click
  **Collect now** or open **More → About this member** yourself.
- `collection.automatic: true`: the extension opens that panel on every profile you visit, reads it and
  closes it, in about 3 seconds. Read [privacy and limits](privacy.md) first.

## Cache

Each collected profile is kept for 90 days, keyed by its URL (`/in/<slug>`), so revisiting it shows the result
at once and opens nothing. A cached result shows a small ring on the dot and the panel says when it was
collected. **Refresh now** collects again. The settings tab changes the days, turns the cache off, or clears
it. Only profiles whose creation date was read are cached.
