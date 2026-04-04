# Subjectiv MVP Notes

This is the currently implemented slice of Subjectiv:

- New on-chain `TrustRegistry` contract for direct trust scores (`0-100`, with `0` as revoke).
- New SDK `subjectiv` subsystem:
  - `getDirectTrustMapping()`
  - `getTransitiveTrustMapping()`
  - `getTrustedSet()`
  - `setTrust()` / `setTrustBatch()`
- Funding-portal alignment queries now accept a trusted alignment-attester set rather than a single trusted attester.
- The UI funding portal now filters through the computed trusted set when the connected user has direct trust declarations.
- The Settings page now includes a direct-trust management section for alignment attestations.

Deliberately deferred from the original spec:

- IndexedDB persistence / rehydration
- Partial-progress trust graph updates while traversal is still running
- Event-driven or incremental recomputation sourced directly from TrustRegistry events

Current behavior:

- If the user has no direct trust declarations yet, the funding portal falls back to showing all alignment attestations.
- Once the user declares direct trust, the UI computes the transitive trusted set in a Web Worker and uses that set for filtering.
- The UI recomputes the trusted set when the user changes direct trust, clicks manual refresh, refocuses the window, or waits for the periodic refresh timer.
