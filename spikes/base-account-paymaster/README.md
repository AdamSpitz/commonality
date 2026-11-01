# Spike: Base Account + third-party paymaster (no Privy)

Phase 1 leftover from [wallet-without-privy-plan.md](../../specs/tech/wallet-without-privy-plan.md):
only a real Base Account answers whether Coinbase honors our ERC-7677 `paymasterService` URL and
what `wallet_getCapabilities` returns.

This is a localhost page. It is not the Commonality UI.

## Run

From the repository root (needs the existing `node_modules`; no extra install):

```sh
npx vite --config spikes/base-account-paymaster/vite.config.js --port 4177 --strictPort
```

Open **http://localhost:4177**. Passkeys need localhost or HTTPS.

1. **Connect Base Account** — Coinbase passkey popup (`keys.coinbase.com`), not the Coinbase Wallet extension and not Privy.
2. **wallet_getCapabilities** — copy the JSON (especially chain `0x14a34` / Base Sepolia).
3. **Probe paymasterService** — sends `wallet_sendCalls` with `paymasterService.url` pointing at this Vite server.

In the **terminal** running Vite, look for a `PAYMASTER POST` log:

- **Present** — the wallet called our URL (question 2 is yes, even if the echo returns an error).
- **Absent** — Coinbase ignored the third-party paymaster URL.

You can reject the on-chain send. Hitting the URL is the signal.

Paste the capabilities JSON and whether `PAYMASTER` appeared into chat or [sponsored-gas.md](../../specs/tech/sponsored-gas.md).
