
## 2026-07-10 — Restored Coinbase checkout URL host validation

- Continued the no-custody on-ramp checkout-persistence work. `BuyTokensSection` restores a Coinbase checkout link from `localStorage` (per project+wallet) and renders it as a `Reopen checkout` href / passes it to `window.open`. That value crossed a trust boundary unvalidated.
- Added `isTrustedOnrampCheckoutUrl` and gated `loadStoredOnrampUrl` on it: only `https://pay.coinbase.com` URLs are restored (matches the session URL built in `platform-api-service/src/onramp.ts`). Tampered/foreign-host/`javascript:` values are dropped.
- Updated test fixtures from the fake `pay.coinbase.example` host to real `pay.coinbase.com`, and added a test that a `javascript:` stored value yields no Reopen-checkout link.
- Files: `ui/src/lazy-giving/components/BuyTokensSection.tsx`, `ui/src/lazy-giving/components/BuyTokensSection.test.tsx`, `TODO.md`.
- Checks: `npm run test:vitest --workspace=ui -- BuyTokensSection --run` (46 passing), `npm run typecheck --workspace=ui` ✅, `npm run lint --workspace=ui` ✅.
