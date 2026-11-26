# CLAUDE.md: Profile Signals

The owner's defaults are in `~/.claude/CLAUDE.md`; this file holds only what is particular to this project.

- **The repository is public.** Never commit real LinkedIn content: no saved profile pages, screenshots of
  real profiles, names or URLs of real people. Test data is invented (`e2e/pages/profile.html`).
- **Tests never reach LinkedIn** (ADR-006). New browser tests go through `e2e/fixtures.ts`, which refuses every
  web request except the synthetic profile routes.
- **`extension/` is exactly what ships**, plain JavaScript without a build (ADR-001). A new file there goes into
  `SHIPPED` in `scripts/package.ts` and, if Chrome loads it, into `manifest.json`.
- **Collection stays manual by default** (ADR-002). Anything that opens LinkedIn's menus by itself runs only
  when `collection.automatic` is true or the person clicked.
- **A version lives in two files**: `extension/manifest.json` and `package.json`. Releasing:
  docs/getting-started.md.
- A visual change needs `make test-visual-update` (Docker) and a look at the new images before committing.
