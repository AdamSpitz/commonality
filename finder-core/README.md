# Finder Core

Shared infrastructure for Commonality finder services.

This package contains the reusable pieces that do not depend on a specific finder domain:

- file-backed JSON state loading and saving
- generic polling-loop runner
- shared batched JSON POST helper for talking to attester-style APIs

Finder-specific services such as `implication-finder/` and `content-finder/` keep their candidate-selection logic, source adapters, and request/response shapes local, and import the shared pieces from this package.
