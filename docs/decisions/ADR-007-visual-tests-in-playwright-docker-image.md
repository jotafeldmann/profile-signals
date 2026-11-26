# ADR-007: visual tests run in Playwright's Docker image, locally and in CI

**Date:** 2026-11-26
**Status:** accepted.
**Context:** Screenshots differ between machines because fonts differ. Baselines made on a laptop fail on GitHub's runners.

## Decision

`make test-visual` and `make test-visual-update` run inside `mcr.microsoft.com/playwright`, pinned by tag and digest, and the CI job runs in the same image. The functional browser tests run natively (`make test-e2e`) and in that image in CI. The panel's account age, which changes every month, is masked.

## Rejected

- **Pixel tolerance large enough to absorb font differences:** it also absorbs real regressions.
- **Jest or a second screenshot tool:** Playwright is already here.

## Consequences

- Visual tests need Docker locally. Upgrading Playwright means changing the image tag and digest in the Makefile and the workflow, and regenerating the baselines.
