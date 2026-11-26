# ADR-008: public repository under MIT; releases are GitHub releases built from tags

**Date:** 2026-11-26
**Status:** accepted.
**Context:** J chose to publish the project on GitHub with tests running for every version.

## Decision

- Public repository `jotafeldmann/profile-signals`, MIT license.
- CI on every push and pull request. A `v*` tag runs the tests, checks that the tag equals the manifest version, and publishes a GitHub release with `profile-signals-<version>.zip`; the annotated tag's message is the release notes.

## Rejected

- **Chrome Web Store for now:** a developer account, a review, a privacy policy page and icons; it can come later (HANDOFF).

## Consequences

- People install by loading an unpacked folder, with Developer mode on.
