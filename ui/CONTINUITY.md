
## 2026-07-10 — Restored Coinbase checkout URL host validation

- Continued the no-custody on-ramp checkout-persistence work. `BuyTokensSection` restores a Coinbase checkout link from `localStorage` (per project+wallet) and renders it as a `Reopen checkout` href / passes it to `window.open`. That value crossed a trust boundary unvalidated.
- Added `isTrustedOnrampCheckoutUrl` and gated `loadStoredOnrampUrl` on it: only `https://pay.coinbase.com` URLs are restored (matches the session URL built in `platform-api-service/src/onramp.ts`). Tampered/foreign-host/`javascript:` values are dropped.
- Updated test fixtures from the fake `pay.coinbase.example` host to real `pay.coinbase.com`, and added a test that a `javascript:` stored value yields no Reopen-checkout link.
- Files: `ui/src/lazy-giving/components/BuyTokensSection.tsx`, `ui/src/lazy-giving/components/BuyTokensSection.test.tsx`, `TODO.md`.
- Checks: `npm run test:vitest --workspace=ui -- BuyTokensSection --run` (46 passing), `npm run typecheck --workspace=ui` ✅, `npm run lint --workspace=ui` ✅.

## 2026-07-10 — Onramp checkout host check applied to fresh session URLs too

- Follow-up to the previous entry: `handleStartOnramp` in `BuyTokensSection` opened/persisted the freshly-minted `session.url` from `createCoinbaseOnrampSession` without the `isTrustedOnrampCheckoutUrl` host check that now guards the restore path. A misconfigured/compromised payments API returning a foreign checkout link would still be opened + stored.
- Now the fresh session URL is validated against `https://pay.coinbase.com`; a mismatch throws (surfaced as an onramp error) and nothing is opened/persisted.
- Added a test that an `evil.example` session URL is rejected: error shown, `window.open` not called, no Reopen-checkout link.
- Files: `ui/src/lazy-giving/components/BuyTokensSection.tsx`, `ui/src/lazy-giving/components/BuyTokensSection.test.tsx`, `TODO.md`.
- Checks: `npm run test:vitest --workspace=ui -- BuyTokensSection --run` (47 passing), `npm run typecheck --workspace=ui` ✅.
