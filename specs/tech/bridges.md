# Bridge implementation: making it easy for normal people to contribute

See [bridges.md](/docs/end-user/commonality/vision-and-strategy/ease-of-adoption/bridges.md) for the architectural spec. This document focuses on the practical question: what does a normal person actually experience when contributing via credit card?

## The simplest path: Stripe Checkout behind a "Contribute" button

From a normal person's perspective, the ideal flow is:

1. They see a project page (e.g. the playground example).
2. They click "Contribute $50".
3. They get a Stripe Checkout form — credit card, Apple Pay, Google Pay.
4. They enter their email and payment info.
5. Done. They get a confirmation email.

Behind the scenes, the bridge operator service:
- Receives the Stripe webhook for successful payment.
- Converts USD to the project's settlement token (USDC for MVP), via exchange API or from a pre-funded pool.
- Calls `buyERC1155` with `buyer = escrow` + a claim hash.
- Sends the donor a claim link email: "Your contribution is recorded onchain. Claim your tokens anytime."

The donor never needs to know crypto is involved unless they want to. The claim link is optional — they can ignore it and still show up on the leaderboard by email/name.

## Who runs the bridge operator?

Three realistic options:

1. **Project creator runs it themselves.** Simplest but requires each creator to set up Stripe + hold ETH. Works for tech-savvy creators.
2. **Commonality runs a shared bridge service.** A hosted service any project can plug into, like how GoFundMe handles payments for all campaigns. Most practical for adoption.
3. **A charity runs it.** Gets tax deductibility for free. Most compelling for donors but requires an actual registered charity partner.

These aren't mutually exclusive. Option 2 could be the default, with options 1 and 3 available for projects that want them.

## The fiat conversion problem

The bridge operator needs to turn USD into the project's settlement token (USDC for MVP) to call `buyERC1155`. Options:

- **Pre-funded pool**: Bridge operator keeps a USDC reserve, replenishes periodically. Simple but capital-intensive.
- **Real-time exchange API**: Use Coinbase/Kraken API to buy USDC on each contribution. Adds latency (minutes) and exchange fees (~0.5-1.5%).
- **Batching**: Accumulate fiat contributions, convert in batches (e.g. daily). Lower fees but onchain recording is delayed.

## Refunds

If the assurance contract fails:
- Onchain: bridge operator calls `refundERC1155`, gets the settlement token (USDC) back.
- Offchain: bridge operator initiates Stripe refund to donor's credit card.
- Stripe supports refunds for up to 120 days, which should cover most assurance contract deadlines.

## Other tradfi payment options

- **PayPal/Venmo:** Even lower friction than credit cards for many people. PayPal has merchant APIs similar to Stripe.
- **Open Collective as bridge operator:** Open Collective already handles fiscal hosting for open-source projects. They accept credit cards, manage funds, handle tax stuff. If they added a "call this smart contract" step, they'd be a natural bridge operator.
- **QR code at local events:** For the playground example — print a QR code on a flyer, it opens a mobile payment page (Stripe Checkout, mobile-optimized). Scan, tap Apple Pay, done in 10 seconds.

## MVP recommendation

A shared bridge service (option 2 above) is probably the sweet spot:

- Commonality hosts a service with Stripe integration.
- Project creators register their assurance contract address.
- The service generates a payment page / embeddable widget.
- Donors pay with credit card; the service handles ETH conversion + `buyERC1155`.
- Claim links go out by email for donors who want onchain tokens later.

This is essentially a web service with Stripe + a crypto wallet (holding USDC), plus the `TradFiBridgeEscrow` contract already specced in the architectural doc.

## Alternative: use existing fiat-to-contract services

There are already licensed services that combine "credit card payment" with "call a smart contract" in a single step. The donor pays with a credit card through an embedded widget, and the service's own wallet calls the contract on their behalf. The service handles all the money transmission licensing (FinCEN MSB registration, state MTLs, AML/KYC).

Known services:
- **Transak One**: You pass it a contract address + calldata. User pays with credit card/Apple Pay/Google Pay. Transak's wallet calls the contract. Licensed in 11+ US states.
- **Wert**: Similar model — configure `sc_address` + `sc_input_data`, their hot wallet executes. Licensed in US and Estonia.
- **Crossmint**: Merchant-of-record model — they sell the asset to the user in fiat and handle minting. MiCA-authorized in the EU. Can create wallets for users who don't have one.

For claim links (walletless donors), **Linkdrop** is a production-deployed protocol that holds tokens (including ERC-1155) in escrow, claimable via a transit-key scheme. Includes a gasless relay so recipients don't need gas funds.

If we went this route, the MVP bridge could skip building a custom bridge operator service entirely:
1. Integrate Transak/Wert widget on the project page — they handle fiat payment, compliance, and the `buyERC1155` call.
2. Use Linkdrop for claim links rather than writing `TradFiBridgeEscrow`.
3. No need to solve the fiat-to-stablecoin conversion problem ourselves — the service handles it.

Tradeoffs: dependency on third-party services (availability, pricing, supported countries, their willingness to whitelist our contracts), less control over the UX, and we'd need to trust their compliance posture. But it avoids the massive regulatory burden of running our own fiat-to-contract service.
