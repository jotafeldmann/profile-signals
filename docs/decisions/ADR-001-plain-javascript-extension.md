# ADR-001: the extension is plain JavaScript with no build step

**Date:** 2026-11-26
**Status:** accepted.
**Context:** The default for new code is TypeScript run by Node. A Chrome extension cannot run `.ts`; it would need a bundler and a `dist/` folder, and the folder people load would no longer be the folder they read.

## Decision

`extension/` holds plain scripts that Chrome loads as they are. Each script is an IIFE that publishes one global (`ProfileSignalsUI`, `ProfileSignalsVerdict`, `ProfileSignalsExtract`), loaded in manifest order. Tests, scripts and the Playwright config are TypeScript, checked by `tsc`.

## Rejected

- **TypeScript with esbuild:** a build step and a second tree for about 1,000 lines, and a release zip that differs from the source.

## Consequences

- The extension's code is not type checked; `make lint` only checks syntax. The browser tests carry the weight.
- `extension/` is exactly what ships; `make test` fails if a file there is not in the package list.
