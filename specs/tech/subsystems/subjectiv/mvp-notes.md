# Subjectiv MVP Notes

This is the currently implemented slice of Subjectiv:

- New on-chain `TrustRegistry` contract for direct trust scores (`0-100`, with `0` as revoke).
- New SDK `subjectiv` subsystem:
  - `getDirectTrustMapping()`
  - `getTransitiveTrustMapping()`
  - `getTrustedSet()`
  - `setTrust()` / `setTrustBatch()`
- Funding-portal alignment queries now accept a trusted alignment-attester set rather than a single trusted attester.
- The UI cause board now filters through the computed trusted set when the connected user has direct trust declarations.
- The Settings page now includes a direct-trust management section for alignment attestations.

Deliberately deferred from the original spec:

- Event-driven or incremental recomputation sourced directly from TrustRegistry events

Current behavior:

- If the user has no direct trust declarations yet, the cause board falls back to showing all alignment attestations.
- On startup, `useTrustedSet()` rehydrates a cached trusted-set snapshot plus any previously visited per-user direct trust mappings from IndexedDB before kicking off a fresh background recomputation.
- Once the user declares direct trust, the UI computes the transitive trusted set in a Web Worker and uses that set for filtering.
- While the worker traversal is still running, it now streams partial trusted-set snapshots back to the UI so trust-aware screens can start updating before the full recomputation finishes.
- Refreshes reuse cached direct trust mappings for already visited downstream accounts while always refetching the connected user's own direct trust mapping first.
- The UI recomputes the trusted set when the user changes direct trust, clicks manual refresh, refocuses the window, or waits for the periodic refresh timer.
