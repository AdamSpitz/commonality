# Finder Core

Shared infrastructure for Commonality finder services.

This package contains the reusable pieces that do not depend on a specific finder domain:

- file-backed JSON state loading and saving
- generic polling-loop runner
- shared candidate-pass bookkeeping for submitted / not-promising / failed items with retry limits
- shared batched JSON POST helper for talking to attester-style APIs
- reusable text-candidate quality/keyword scoring and scored evaluation-request construction

Finder-specific services such as `implication-finder/`, `content-finder/`, and beat-agent finder mode keep their source adapters, service wiring, and domain-specific request/response shapes local, and import the shared pieces from this package.
