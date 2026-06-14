# Bridge implementation: making it easy for normal people to contribute

See [bridges.md](/docs/end-user/commonality/vision-and-strategy/ease-of-adoption/bridges.md) for the architectural spec. This document focuses on the practical question: what does a normal person actually experience when contributing by credit card?

Terminology note: several pieces in the recommended MVP — embedded wallets, sponsored gas, contribution sequencing — are not "bridges" in the narrow sense. They are general walletless/gasless contribution UX. They belong here because they are what let a normal credit-card contributor reach the onchain contract without Commonality becoming a payment intermediary.

## The tempting but rejected simplest path: Stripe Checkout behind a "Contribute" button

From a normal person's perspective, the idealized flow would be:

1. They see a project page (e.g. the playground example).
2. They click "Contribute $50".
3. They get a Stripe Checkout form — credit card, Apple Pay, Google Pay.
4. They enter their email and payment info.
5. Done. They get a confirmation email.

Behind the scenes, a bridge operator service would:
- Receive the Stripe webhook for successful payment.
- Convert USD to the project's settlement token (USDC for MVP), via exchange API or from a pre-funded pool.
- Call `buyERC1155` with `buyer = escrow` + a claim hash, or with `buyer = donorWallet`.
- Send the donor a claim link email: "Your contribution is recorded onchain. Claim your tokens anytime."

The software is straightforward, but if Commonality runs this service itself it likely becomes money transmission: we would receive fiat, convert value, and move crypto on a donor's behalf. So this is not the recommended Commonality-operated MVP. It remains viable for licensed bridge operators, charities/fiscal hosts, or merchant-of-record vendors that take on the compliance burden.

## Who runs the bridge operator?

Three realistic options:

1. **Project creator runs it themselves.** Simplest but requires each creator to set up Stripe + hold ETH. Works for tech-savvy creators.
2. **Commonality runs a shared bridge service.** A hosted service any project can plug into, like how GoFundMe handles payments for all campaigns. Most practical for adoption.
3. **A charity runs it.** Gets tax deductibility for free. Most compelling for donors but requires an actual registered charity partner.

These aren't mutually exclusive. Option 2 could be the default, with options 1 and 3 available for projects that want them.

**Hard constraint: we do not want to be a money transmitter.** Whoever runs the bridge operator and takes USD, converts it, and moves value on the donor's behalf is performing money transmission — which in the US means FinCEN MSB registration, state-by-state money transmitter licenses (~50 jurisdictions), and AML/KYC obligations. We are not willing to take that on ourselves. This significantly downgrades option 2 (Commonality running a shared bridge with its own USDC reserve and Stripe account): the *software* is trivial, but the *licensing* is the hard, slow, expensive part, and it's exactly what we want to avoid. It pushes us toward arrangements where a licensed third party (a fiat-to-contract service) or an already-registered entity (a charity) holds the money-transmission burden, and we never touch the funds. See "Alternative: use existing fiat-to-contract services" below — that path keeps money entirely off our books.

## The fiat conversion problem

The bridge operator needs to turn USD into the project's settlement token (USDC for MVP) to call `buyERC1155`. Options:

- **Pre-funded pool**: Bridge operator keeps a USDC reserve, replenishes periodically. Simple but capital-intensive.
- **Real-time exchange API**: Use Coinbase/Kraken API to buy USDC on each contribution. Adds latency (minutes) and exchange fees (~0.5-1.5%).
- **Batching**: Accumulate fiat contributions, convert in batches (e.g. daily). Lower fees but onchain recording is delayed.

## Refunds

If the assurance contract fails, the onchain leg is trivial and identical for everyone: the tokens' holder (the donor's wallet, or the escrow) calls `refundERC1155` and gets the settlement token (USDC) back onchain. The hard part is the *fiat* leg — and here there's a fundamental asymmetry with the onramp that's worth spelling out, because it shapes which vendor model we pick.

**Why offramps don't mirror onramps.** It's tempting to assume that if a plain on-ramp can smoothly turn a card into crypto, a plain off-ramp can smoothly turn the refunded crypto back into a card credit. It can't be made equally smooth, for three structural reasons:

1. **Paying money *out* is regulated far more heavily than taking it in, and the KYC can't be hidden.** An onramp is near-frictionless because the card charge *is* the identity check — the buyer pushes their own money in. An offramp sends fiat out to a bank/card (the classic money-laundering concern), so every licensed offramp requires full KYC — ID verification, bank linking — *before* it'll pay out. That step is legally mandatory and can't be smoothed into invisibility the way wallet-creation can. The donor has to stop and verify.
2. **Card rails are pull, not push.** You can charge a card trivially but can't arbitrarily *credit* one. The only generic "money back to a card" is a refund of an original charge, through the original processor, within a window. (Push-to-card rails exist but are separate products with their own KYC.)
3. **In the recommended model, nobody has a refund handle.** We deliberately made the donor the principal of the `buyERC1155` call and used a *plain* on-ramp that treats the fiat leg as a final crypto sale — that's exactly what keeps us out of money transmission and out of contract whitelisting. But "final crypto sale" means there's no open purchase to unwind months later when the deadline passes. We never charged the card, so we have nothing to refund; the on-ramp's only reversible event was "user bought USDC," and that USDC is long gone into the contract. The only way *we* could push fiat back is to custody the refunded crypto and pay out ourselves — which is precisely **becoming a money transmitter**, the line we refuse to cross.

**The twist:** the cleanliness that makes our onramp safe is what kills the fiat-refund path. The one model where clean fiat refunds *are* natural is **merchant-of-record** (e.g. Crossmint), because it frames the whole thing as "user bought asset X for $50" — and a purchase can be refunded by the seller. So cleanest-for-compliance and cleanest-for-refunds point at *different* vendors (see the fallback section).

**What we realistically do**, none of which requires us to handle money:
- **Leave it as USDC (default).** The refund sits in the donor's embedded wallet as spendable stablecoin. Fine for many; increasingly spendable directly via stablecoin-backed cards without ever off-ramping. Unsatisfying for a true normie.
- **Offer to forward it.** "Re-contribute to another project" instead of cashing out — keeps it onchain, sidesteps the offramp entirely, and is a nice default for someone who wanted to support *something*.
- **Smoothest-possible-but-KYC-gated offramp.** Prompt "your contribution was refunded — withdraw to your bank," and hand the donor into a licensed offramp's KYC+payout flow pre-filled with the amount. As smooth as the rails legally allow, but it *will* involve a one-time verification step.

(In the rejected own-bridge model, refunds *were* a clean Stripe credit — the operator was the merchant of record and Stripe supports refunds for ~120 days. We gave that up along with the money-transmitter liability.)

## Other tradfi payment options

- **PayPal/Venmo:** Even lower friction than credit cards for many people. PayPal has merchant APIs similar to Stripe.
- **Open Collective as bridge operator:** Open Collective already handles fiscal hosting for open-source projects. They accept credit cards, manage funds, handle tax stuff. If they added a "call this smart contract" step, they'd be a natural bridge operator.
- **QR code at local events:** For the playground example — print a QR code on a flyer, it opens a mobile payment page (Stripe Checkout, mobile-optimized). Scan, tap Apple Pay, done in 10 seconds.

## MVP recommendation: embedded wallet + plain on-ramp + sponsored gas

The chosen approach. It feels like one tap to the donor, but under the hood it's two decoupled steps so that **no licensed service ever touches our contract and we never touch the money.** This is mostly general contribution UX, not bridge-specific smart-contract work.

The donor experience:

1. They land on a project page and click "Contribute $50".
2. They sign in with email or a social login. An **embedded wallet** is created transparently behind that login (via a wallet-as-a-service — Privy / Dynamic / Web3Auth / Coinbase Smart Wallet, or an EIP-4337 smart account). They don't know it's a wallet.
3. They pay $50 by card / Apple Pay / Google Pay through a **plain fiat on-ramp** (Stripe crypto onramp, Coinbase Onramp, MoonPay, Transak's vanilla product, etc.). The on-ramp delivers USDC straight into *their own* embedded wallet.
4. The page then has them sign the `buyERC1155` call from that wallet. Gas is **sponsored via a paymaster**, so they don't need to hold ETH and never see a gas prompt.
5. Done. Tokens are already in their wallet; they get a confirmation email.

### Why this shape

The two activities are deliberately separated:

- **The on-ramp only ever sells crypto to a wallet address.** It's the oldest, most broadly-licensed, most-jurisdictions activity in the space. It never sees or calls our contract.
- **The contract call is made by the donor themselves**, from their own wallet — exactly like any native onchain backer.

This buys us three things at once:

- **Not a money transmitter.** The on-ramp is the licensed party that takes USD and moves value. We never hold a reserve, never run a Stripe merchant account for funds, never register as an MSB. (See the hard constraint above.)
- **No contract whitelisting.** Because no third-party service executes calldata against our contract, there's nothing for them to review or gate — and no kill-switch where they could de-whitelist us. (Contrast the one-step services below, which *do* require this.)
- **Still feels walletless and gasless to a normal person.** The embedded wallet and sponsored gas hide the crypto entirely, recovering the "normie" UX that the two-step model would otherwise lose.

### The tradeoffs (so we remember why we picked this)

- **More infra than any single-vendor option.** We stand up and operate: a wallet-as-a-service integration, a paymaster / bundler for gas sponsorship, and the glue that sequences on-ramp → contract call. That's the cost of owning the UX instead of renting it.
- **We pay for gas.** Sponsored transactions mean we eat L2 gas (cheap, but non-zero and an abuse surface — needs rate limiting / per-session caps).
- **Refunds are onchain, not fiat.** If the assurance contract fails, the donor is refunded *crypto* to their embedded wallet automatically (`refundERC1155`); there's no card chargeback path, and making one would put us back into money transmission. This is structural, not a gap we can engineer away — see the Refunds section for why offramps can't mirror onramps. Acceptable because the refund is trustless and automatic, but worth surfacing carefully in the claim/refund UI.
- **On-ramp screening still applies.** On-ramps do sanctions/address screening and some won't deliver to arbitrary address types. That's screening, not contract-logic review, so it doesn't reintroduce whitelisting — but confirm with the chosen provider that it'll deliver into our embedded-wallet addresses.

### Rejected alternatives (and why)

- **One-step fiat-to-contract services (Transak One / Wert / Crossmint).** Smoothest possible flow and least infra we build — *their* wallet executes `buyERC1155` for the user. But because they call our contract, they must whitelist it: a review gate they control, a dependency they could revoke, and narrower country coverage. Detailed below under "Alternative: use existing fiat-to-contract services." Good fallback if our own infra slips, but we don't want the dependency as the default.
- **Commonality runs its own Stripe + USDC-reserve bridge.** Technically the simplest software, but it makes *us* the money transmitter (MSB + ~50 state MTLs + AML/KYC). Off the table — see the hard constraint above.

## Fallback: one-step fiat-to-contract services

This is the fallback if the embedded-wallet approach above proves too much infra for the MVP, or as a stopgap while it's being built. It's lower-effort for us but trades away independence (see whitelisting below).

There are already licensed services that combine "credit card payment" with "call a smart contract" in a single step. The donor pays with a credit card through an embedded widget, and the service's own wallet calls the contract on their behalf. The service handles all the money transmission licensing (FinCEN MSB registration, state MTLs, AML/KYC).

**The catch is whitelisting.** Because the service's wallet executes calldata against *our* contract, the service must review and whitelist each assurance contract before it'll run the call. That's a review gate they control, a dependency they could revoke, and it tends to come with narrower country coverage than a plain on-ramp. Avoiding exactly this gate is why the recommended approach keeps the contract call in the donor's own hands.

Known services:
- **Transak One**: You pass it a contract address + calldata. User pays with credit card/Apple Pay/Google Pay. Transak's wallet calls the contract. Licensed in 11+ US states.
- **Wert**: Similar model — configure `sc_address` + `sc_input_data`, their hot wallet executes. Licensed in US and Estonia.
- **Crossmint**: Merchant-of-record model — they sell the asset to the user in fiat and handle minting. MiCA-authorized in the EU. Can create wallets for users who don't have one.

**Merchant-of-record is the one model with clean fiat refunds.** Because Crossmint frames the transaction as "user bought asset X for $50," the *seller* can refund that purchase to the original card — the refund handle the recommended approach structurally lacks (see Refunds). So there's a real tension: the plain-on-ramp recommendation is cleanest for compliance/whitelisting but forces onchain-only refunds, while a merchant-of-record fallback trades the whitelisting dependency for the ability to give donors a normal card refund. If refund UX for normies turns out to matter more than independence, this tips the balance toward Crossmint.

For claim links (donors served by a true bridge operator who do not have wallets), **Linkdrop** is a production-deployed protocol that holds tokens (including ERC-1155) in escrow, claimable via a transit-key scheme. Includes a gasless relay so recipients don't need gas funds.

If we fell back to this route, the bridge could skip almost all custom infra:
1. Integrate Transak/Wert widget on the project page — they handle fiat payment, compliance, and the `buyERC1155` call.
2. Use Linkdrop for claim links rather than writing `TradFiBridgeEscrow`.
3. No need to solve the fiat-to-stablecoin conversion problem ourselves — the service handles it.
4. No embedded-wallet / paymaster infra to operate.

Tradeoffs vs. the recommended approach: dependency on third-party services (availability, pricing, supported countries, and their willingness to whitelist our contracts), less control over the UX, and we'd need to trust their compliance posture. Both routes keep us out of money transmission; the difference is the whitelisting dependency and how much UX we own vs. rent.

## Implementation workstreams

Track these as separate product/engineering tasks rather than one monolithic "bridge" task:

1. **Embedded wallets** — choose provider, add email/social login, create/recover wallets, expose wallet address to the app, and support signing/sending contribution transactions.
2. **Plain on-ramp** — choose provider, create purchase sessions, deliver USDC to the embedded wallet, handle provider callbacks/status, and show fees/availability clearly.
3. **Contribution sequencing** — after USDC arrives, handle balances, allowance if needed, `buyERC1155`, transaction confirmation, retry/error states, and leaderboard/indexer visibility.
4. **Sponsored gas** — integrate paymaster/bundler or equivalent, define sponsorship policy, cap gas spend, and prevent abuse.
5. **Refund UX** — make failed-project refunds understandable: claim USDC onchain, re-contribute elsewhere, or exit via a licensed offramp with KYC.
6. **Notifications and receipts** — contribution confirmations, refund-available notices, transaction links, and later compliance/tax reporting.
7. **True bridge-operator support** — document/integrate patterns for charities, fiscal hosts, governments, or licensed vendors that really do accept fiat and call `buyERC1155`.
8. **Claim-link fallback** — evaluate Linkdrop or similar before building a custom `TradFiBridgeEscrow`; only build custom escrow if the existing protocols cannot support our flow.
