# Spike: CAD stablecoins on Base for post-MVP settlement

**Question:** which CAD stablecoin, if any, should Commonality support after MVP for per-project settlement on Base?

This spike follows [`specs/product/currency.md`](../../specs/product/currency.md): MVP remains USDC settlement with CAD display-only estimates. A CAD settlement token is post-MVP and should only be adopted after checking liquidity, ordinary-Canadian acquisition, and issuer control features against escrow safety constraints.

## Findings (researched 2026-07-14)

On-chain facts below were verified directly against Base mainnet RPC and Blockscout
verified sources; run `node check-candidates.mjs candidates.json` and
`node admin-probe.mjs candidates.json` to re-verify. Addresses came from CoinGecko
and Basescan (confirm with issuer docs before any production allowlisting).

### Scorecard

| | CADD | QCAD | CADC |
| --- | --- | --- | --- |
| Issuer | Tetra Trust / CAD Digital Inc. (Alberta-regulated; NBC, Wealthsimple, Shopify backing) | Stablecorp | Loon Payments (Paytrie spinout) |
| Base address | `0x16f93ebc5320c89efc8701577efe49d14a276a06` (same on Ethereum) | `0xa15705e6fc8b3e08e7253f3758de1a754baa0761` | `0x043eb4b75d0805c43d7c834902e335621983cf03` |
| Decimals | 18 | 6 | 18 |
| Base supply | ~641k CADD | **0 — deployed but unused** | ~1.52M CADC |
| Base DEX liquidity | Aerodrome CADD/USDC: $172k liq, ~$7.6k/day vol; Hydrex CADD/frxUSD: $37k | **None** (Kraken QCAD/USD only, ~$54/day) | Aerodrome CADC/USDC: $136k liq, ~$53k/day vol (most active) |
| Ordinary-Canadian acquisition today | **Institutional-first.** Mint/redeem is for institutions; Wealthsimple is a *backer/investor* but does **not** list CADD for retail (as of 2026-07 Wealthsimple's only CIRO-approved stablecoin is USDC). Retail path today = swap USDC→CADD on Aerodrome. | Kraken (QCAD/USD), but no way to get it *onto Base* | **Best today: Paytrie** — buy/sell CADC (and USDC) via Interac e-Transfer, direct on/off-ramp with Base network support |
| Contract flavor | Fireblocks **ERC20F** upgradeable proxy | Custom upgradeable proxy (pausable) | **FiatTokenProxy — the Centre/Circle USDC contract**, so identical admin semantics to USDC |
| Pause | Yes (PAUSER_ROLE; approve/transfer gated `whenNotPaused`) | Yes | Yes (USDC-style) |
| Blacklist/freeze | Yes, via external `accessRegistry` (set on Base at `0x4bfc…126a`); **probed: default-allow** — a random fresh address `hasAccess() == true`, so it's a denylist, not a KYC allowlist | Untested (dead on Base anyway) | Yes — USDC-style `blacklister`/`isBlacklisted` |
| Seize/confiscate | **Yes**: `recoverTokens(account, amount)` (RECOVERY_ROLE) can transfer the full balance out of any *access-revoked* account; plus SALVAGE_ROLE and UPGRADER_ROLE | Upgradeable, so ultimately yes | Not directly, but upgradeable proxy = ultimately yes (same as USDC) |
| Vanilla-ERC-20 in normal operation (no fees/rebase/hooks) | Yes | Yes | Yes |
| Peg | ~US$0.714 ≈ CAD ✓ | ~US$0.711 ✓ | ✓ |

### Reading of the results

- **QCAD is out** for Base settlement: zero supply on Base, zero Base DEX pairs, ~$54/day global volume. Nothing to evaluate further unless that changes.
- **CADC is the pragmatic near-term choice.** It is literally the USDC contract with a different issuer, so every escrow-safety assumption Commonality already makes for USDC transfers over unchanged (blacklist + pause exist, but that risk is already accepted for USDC). It has the most active Base pool *and* the only working retail on/off-ramp for ordinary Canadians today (Paytrie via Interac e-Transfer, no crypto exchange account needed). Caveats: small issuer (Loon, ~$3M raise), ~$1.5M on-Base supply, 18 decimals (USDC is 6 — display/formatting code must not assume 6).
- **CADD is the strongest brand/backing story but not retail-ready yet.** The spec's hope that "ordinary Canadians can get CADD via Wealthsimple" is currently false — Wealthsimple backs the issuer but does not list the token. Mint/redeem is institutional. Its escrow risk profile is also strictly worse than USDC's: beyond the (confirmed default-allow) denylist and pause, the issuer can *seize* balances from access-revoked accounts via `recoverTokens` — if the escrow contract were ever denylisted, funds could be moved out, not just frozen. Worth re-evaluating in 6–12 months if Wealthsimple lists it; the consortium suggests it may win long-term.
- **Liquidity heuristic check**: both CADD and CADC pass. Initial TVL-based read ($130–170k) suggested four-figure swaps only, but real aggregator quotes (see "Depth-at-price quotes" below) show both pools are concentrated-liquidity and handle even C$10,000 at well under 0.5% impact. CL depth is revocable, so re-check before relying on it.

### Recommendation to Adam

Keep the currency.md plan (MVP = USDC + CAD display estimate). For the post-MVP CAD token, the evidence points to **CADC first** (identical contract semantics to USDC, working Interac onramp, most active pool), with **CADD as the watch-list successor** once/if Wealthsimple retail listing materializes — at which point its `recoverTokens` seize power needs an explicit risk acceptance, since it exceeds USDC's admin powers. Update the "CADD … strongest candidate" line in `specs/product/currency.md` after you make the call.

### Address confirmation against issuer docs (done 2026-07-14)

- **CADC: confirmed from the issuer.** loon.finance embeds structured data listing "Base contract" (chainId 8453) = `0x043eb4b75d0805c43d7c834902e335621983cf03`, and links that Basescan token page from its homepage. Matches `candidates.json`. (Note: loon.finance 403s non-browser user agents; fetch with a browser UA.)
- **CADD: issuer does not publish contract addresses anywhere public** — not on tetradg.com, not in the launch press release. Best available: the Basescan token page for `0x16f93ebc…76a06` links tetradg.com and @TetraDigitalGrp as official (token-page info is issuer-submitted), the same address exists on Ethereum, and CoinGecko agrees. Strong but secondhand; if CADD is ever adopted, email Tetra for a canonical list first.
- **QCAD: unresolvable and moot.** Stablecorp publishes no Base address (CoinGecko lists only an Ethereum-era address), consistent with the zero-supply finding. Nothing to confirm.

### Depth-at-price quotes (done 2026-07-14, via KyberSwap aggregator)

`node quote-swaps.mjs` — executable routes across all Base DEX liquidity, not pool TVL. Both main pools turned out to be Aerodrome **Slipstream (concentrated liquidity)**, so depth near peg is far better than TVL suggested:

| Trade (vs C$1 marginal probe) | CADC impact | CADD impact |
| --- | --- | --- |
| Sell C$100 / C$1,000 / C$10,000 → USDC | 0.01% / 0.01% / 0.02% | 0.00% / 0.01% / 0.11% |
| Buy ~C$100 / ~C$1,000 / ~C$10,000 with USDC | 0.27% / 0.29% / 0.32% | 0.04% / 0.07% / 0.18% |

Both tokens comfortably pass the liquidity heuristic below even at five figures; CADC's buy side is a touch thinner (LPs ranged more one-sided) but a full C$10k round trip costs well under 0.5%. Caveat: CL liquidity can be pulled or re-ranged at any time — re-run `quote-swaps.mjs` before relying on this.

### Still open (needs a human / real money)

- One real end-to-end CADC test: Paytrie Interac purchase → withdraw to a fresh Base wallet → transfer → offramp back. (Analogue of `spikes/coinbase-onramp/`.) **Step-by-step runbook: [paytrie-round-trip.md](paytrie-round-trip.md).**
- Issuer support path if a smart contract is ever wrongly blacklisted: **email draft ready in [loon-email-draft.md](loon-email-draft.md)** — Adam to review and send to partners@loon.finance.

## Scripts

- `check-candidates.mjs candidates.json` — verifies each address is a deployed ERC-20 on Base and pulls Dexscreener pools/liquidity/volume.
- `admin-probe.mjs candidates.json` — probes pause/blacklist/owner selectors and EIP-1967 proxy slots via read-only `eth_call`.
- `quote-swaps.mjs` — real depth-at-price quotes (sell/buy C$100/C$1k/C$10k) via the keyless KyberSwap aggregator API; results above.
- `candidates.json` — the three tokens with sourced Base addresses (`candidates.example.json` is the shape template).

## Liquidity acceptance heuristic

For Commonality's early post-MVP use, do **not** require deep exchange liquidity if users acquire the CAD token through a direct issuer/onramp. But require enough Base liquidity to unwind mistakes and support small operational flows:

- at least one reputable Base pool against USDC or another major asset;
- a test swap of C$100 and C$1,000 showing acceptable slippage/spread;
- visible daily volume, not a stale dust pool;
- documented fallback if swaps disappear.

If acquisition is direct and withdrawals to Base wallets work, acquisition ease matters more than AMM depth. If acquisition relies on swapping from USDC on Base, thin liquidity is a blocker.

## Escrow safety questions for each token

Before allowlisting a CAD stablecoin, answer:

1. Can transfers be paused globally?
2. Can individual holders or contracts be blacklisted/frozen?
3. Can the issuer seize, wipe, or forcibly move balances?
4. Are approvals or transfers non-standard in any way (fees, rebasing, hooks, denylist reverts)?
5. What happens if the project escrow contract is frozen while a campaign is live or after failure before refunds?
6. Is there an issuer support path for mistakenly frozen smart contracts?

A token with freeze/pause can still be acceptable, but Commonality must disclose it and design operational runbooks for stuck escrows.

Answers for CADD/QCAD/CADC are in the scorecard above: all three can pause; CADD and CADC can blacklist (CADD confirmed default-allow registry); CADD can additionally seize from revoked accounts; all are vanilla ERC-20s in normal operation; questions 5–6 remain open and are issuer conversations, not code.
