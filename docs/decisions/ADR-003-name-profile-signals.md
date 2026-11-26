# ADR-003: the project is named Profile Signals, not j-linkedin

**Date:** 2026-11-26
**Status:** accepted.
**Context:** The extension was called j-linkedin. "LinkedIn" is a registered trademark; a public repository or a store listing named after it invites a takedown request, and the Chrome Web Store rejects such names.

## Decision

Repository `profile-signals`, extension name "Profile Signals". LinkedIn is named only to describe what it works with, with "Not affiliated with LinkedIn" in the README.

## Rejected

- **Keep j-linkedin:** familiar, but the trademark sits in the name.

## Consequences

- An unpacked 0.2.0 install is a different extension: its cache and saved settings do not carry over.
