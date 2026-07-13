# Spike: CAD stablecoins on Base for post-MVP settlement

**Question:** which CAD stablecoin, if any, should Commonality support after MVP for per-project settlement on Base?

This spike follows [`specs/product/currency.md`](../../specs/product/currency.md): MVP remains USDC settlement with CAD display-only estimates. A CAD settlement token is post-MVP and should only be adopted after checking liquidity, ordinary-Canadian acquisition, and issuer control features against escrow safety constraints.

## Current recommendation

**Do not choose a CAD stablecoin yet.** The product decision still needs human/commercial verification. The engineering-safe path is:

1. ship MVP with USDC settlement + CAD display estimates;
2. keep contract architecture token-agnostic (`paymentToken` already immutable per project);
3. before enabling CAD projects, pick exactly one allowlisted CAD token after the checks below pass.

## What I could verify without Adam

- The repo already supports per-contract ERC-20 settlement and does not need a CAD-specific contract change for post-MVP support.
- The product spec correctly identifies the main unresolved risks: thin Base liquidity, onramp/offramp practicality, and admin controls such as blacklist/pause.
- Public DEX discovery is automatable, but it requires verified token contract addresses. Symbol searches are noisy: `CADD`, `QCAD`, and `CADC` collide with unrelated tokens/pairs, and I did not find sufficiently authoritative Base contract addresses from the repo alone.

## What still needs human input

These are product/vendor decisions rather than code tasks:

- Confirm the official Base contract address for each candidate from issuer documentation or a trusted token-list source.
- For CADD, verify whether an ordinary Canadian can actually acquire/redeem it through Wealthsimple or another mainstream flow, and whether transfers to arbitrary Base wallets are supported.
- Decide whether Commonality accepts issuer freeze/pause risk for escrowed assurance contracts. Regulated fiat stablecoins usually retain some administrative control; this may be acceptable, but it is not a purely technical choice.

## Candidate scorecard template

Fill this only from primary/authoritative sources.

| Token | Issuer | Official Base address | Ordinary Canadian acquisition | Base liquidity | Admin controls | Preliminary fit |
| --- | --- | --- | --- | --- | --- | --- |
| CADD | Tetra Digital Group | TODO | TODO: especially Wealthsimple availability and external-wallet withdrawals | TODO | TODO | Likely strongest if Wealthsimple flow is real and transferable |
| QCAD | Stablecorp | TODO | TODO | TODO | TODO | Plausible, needs liquidity/onramp proof |
| CADC | Loon | TODO | TODO | TODO | TODO | Plausible, needs liquidity/onramp proof |

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

## Suggested next actions

1. Adam: provide or confirm official Base addresses for CADD, QCAD, and CADC.
2. Run a token-address-based liquidity check (Dexscreener/GeckoTerminal + manual Aerodrome/Uniswap quotes).
3. Run a source/ABI review for admin controls from Basescan or verified repo links.
4. Do one real acquisition test for the leading token: buy/receive a small amount, withdraw to a fresh Base wallet, transfer to another wallet, and (if possible) redeem/offramp.
5. Record the result here and then update `specs/product/currency.md` with a go/no-go recommendation.

## Decision boundary

I can prepare scripts, tables, and contract-review notes without more input. I cannot honestly answer the final product question without either authoritative token addresses and issuer docs or a real Canadian acquisition test.
