# Spike: Coinbase Onramp → counterfactual 4337 address on Base

**One question, go/no-go:** _Will Coinbase Onramp deliver USDC to a counterfactual
(undeployed) EIP-4337 smart-account address on Base mainnet?_

This is the single load-bearing test called for in
[`specs/tech/bridges.md` → "On-ramp provider selection"](../../specs/tech/bridges.md)
and item **(Ask) — plain fiat on-ramp provider** in [`inbox.md`](../../inbox.md).
Everything else about Coinbase Onramp (Base/USDC support, fees, callbacks,
compliance) is already known to pass on paper; this is the one thing no vendor
documents, so we confirm it by hand.

> **Why it matters:** our donors log in with Privy and get an EIP-4337 smart
> account that isn't deployed onchain until their first `buyERC1155`. If the
> on-ramp refuses to send funds to an address with no code yet, the whole
> "buy USDC straight into your wallet" flow breaks. If Coinbase passes, it's the
> recommended provider. If it fails, the fallback is Stripe (US-only).

## What's automated vs. what only you can do

I (Claude) have written all the scripts. They:
1. derive a real counterfactual SimpleAccount address on Base (same 4337 model
   production uses — an owner EOA, the role Privy's signer plays, wrapped by the
   SDK), and confirm it has no code yet;
2. mint a Coinbase Onramp session token bound to that address and print the
   purchase URL;
3. poll the address's USDC balance until the money arrives.

**Only you can do these three things** (they need a human + a real card + KYC):

1. **Create a Coinbase Developer Platform account & Secret API key.** See below.
2. **Complete Coinbase's KYC and pay ~$5 with a real card** in the widget.
   Onramp is **mainnet-only** — this cannot be rehearsed on testnet, so it costs
   real (small) money.
3. Watch whether the USDC lands. (The script tells you.)

## Your setup (one-time, ~10 min)

1. Go to <https://portal.cdp.coinbase.com> and sign in / create an account.
2. Create a project (any name, e.g. "commonality-onramp-spike").
3. That project must have **Onramp** access. Onramp is generally enabled for CDP
   projects; if the portal shows an Onramp/Pay section or a domain-allowlist
   setting, you're good. (For the hosted `pay.coinbase.com` URL flow used here,
   no domain allowlisting is required — that's only for the embedded widget.)
4. Under **API keys**, create a **Secret API key** and download it. You'll get a
   key **id** and a **private key** (Ed25519 base64, or an EC/PEM block).
5. Copy `.env.example` to `.env` and paste those two values into
   `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET`.

That is the entire "set up an account" part. Everything below is `npm run …`.

## Running the spike

```bash
cd spikes/coinbase-onramp
npm install

npm run derive     # step 1 — prints the counterfactual address, writes spike-state.json
npm run url        # step 2 — prints the Coinbase Onramp purchase URL
# → open the URL, do KYC, buy ~$5 of USDC on Base
npm run watch      # step 3 — polls until USDC arrives (or `npm run balance` for a one-shot)
```

### Reading the result

- **USDC balance goes above 0 at that address → GO.** Coinbase Onramp is
  confirmed for our architecture. Record it in `bridges.md` and close the (Ask).
- **Coinbase won't accept the destination address, or funds never arrive →
  NO-GO.** Capture the exact error/behavior and fall back to spiking Stripe
  (note: Stripe's own address validation may also balk at an undeployed
  address — worth testing the same way).

The `basescan.org` link the script prints lets you eyeball the transfer.

## Recovering the spike funds

The purchase leaves a few dollars of USDC in the counterfactual smart account.
To sweep it somewhere, `rescue-usdc.mjs` deploys the account and transfers the
USDC out. No bundler/paymaster needed — `SimpleAccount.execute()` is callable by
the owner directly — but the **owner EOA needs a little ETH on Base for gas**
(deploy + transfer costs well under $0.10). Fund the owner address the script
prints (~$1 of ETH is plenty), then:

```bash
node rescue-usdc.mjs 0xYourDestinationAddress
```

Re-running is safe: the factory `createAccount` is idempotent and the transfer
just moves whatever USDC is present.

## Notes / caveats

- `spike-state.json` holds a **throwaway** owner private key. It's gitignored.
  It is not production anything — it exists only so re-runs reuse one address.
- We derive a **SimpleAccount (EntryPoint v0.7)** address because that's the
  reference ABI the sponsored-gas paymaster decoder already targets
  (`specs/tech/sponsored-gas.md`). Coinbase only ever sees the resulting
  address, so which concrete 4337 implementation Pimlico ends up wrapping the
  Privy signer in doesn't change what this test proves: an undeployed contract
  address either receives on-ramp USDC or it doesn't.
- If the session token expires (they're short-lived, single-use), just re-run
  `npm run url`.
- This spike deliberately does **not** deploy the account or run a UserOp — the
  point is to test delivery to the *undeployed* address.
