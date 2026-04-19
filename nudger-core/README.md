# Nudger Core

Shared infrastructure for Commonality nudger services.

This package contains the reusable pieces that do not depend on a specific nudge strategy:

- `NudgerStrategy` interface — the contract every nudger strategy must implement
- `NudgeMessage` type and EIP-191 signing helpers
- `NudgerConfig` base configuration type

Nudger-specific services such as `implication-graph-nudger/` and `bridge-creator/` keep their strategy logic local, and import the shared pieces from this package.
