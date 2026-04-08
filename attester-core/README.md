# Attester Core

Shared infrastructure for Commonality attester services.

This package contains the reusable pieces that do not depend on a specific attestation domain:

- environment/config parsing helpers
- blockchain error classification
- OpenRouter JSON completion wrapper
- IPFS read/write helpers
- x402-style payment quote/validation helpers
- Express rate limiting middleware
- Express app setup plus shared `/health`, `/quote`, and placeholder `/status` route scaffolding

Attester-specific services such as `attester/` keep their prompt logic, request/response shapes, and contract interaction code local, and import the shared pieces from this package.
