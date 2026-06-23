# Bridges between Commonality and traditional finance

The goal is to make it so that:
  - a project can accept funding from both onchain and tradfi sources
  - there's a unified onchain record of all contributions
  - onchain activity is legible to the traditional world (tax receipts, compliance reports, grant applications)

(See also [rails.md](./rails.md).)

Some things worth noting:
  - Making your project a Commonality project doesn't mean you're cutting off normal funding sources. Normies (including orgs) who just want to contribute via tradfi should be able to do that. This includes supporting the normal stuff tradfi expects: tax receipts, compliance reports, etc.
  - The safest default is not for Commonality to become the payment intermediary. For normal credit-card contributors, the preferred path is: a licensed on-ramp sells settlement tokens (USDC for MVP) directly into the contributor's own wallet, then the contributor's wallet calls `buyERC1155`. Commonality never receives fiat, never custodys funds, and never converts money on the contributor's behalf.
  - True bridge operators still matter for charities, governments, fiscal hosts, and other already-regulated entities. In that model, the operator accepts tradfi funds and calls `buyERC1155` onchain. But a Commonality-operated shared bridge with its own Stripe account/reserve is not the default, because it risks making Commonality a money transmitter.
  - This plays nicely with assurance contracts either way. Contributions still count toward the same threshold, show up in the same onchain record, and refund through the same contract logic. The hard difference is the fiat refund path: the no-custody on-ramp model refunds USDC onchain, while a true merchant/bridge operator may be able to issue traditional fiat refunds through its own process.



This is NOT about replacing tradfi overnight. It's about making Commonality and tradfi interoperable, so that projects can draw from both worlds and participants can transition gradually.

## Tradfi → Commonality (bringing traditional money onchain)

### The preferred MVP mechanism: no-custody on-ramp plus user-originated purchase

For ordinary credit-card contributors, the recommended MVP path is deliberately not a custom Commonality-run bridge:

1. The contributor signs in with email/social login and gets an embedded wallet.
2. A licensed fiat on-ramp sells the contributor USDC by card/Apple Pay/Google Pay and delivers it directly into that wallet.
3. The contributor's wallet calls `buyERC1155` on the assurance contract.
4. Commonality may sponsor gas for the contract call, but it never receives fiat, holds a USDC reserve, or moves value on the contributor's behalf.

This is not "the bridge" in the narrow legal/payment sense; it is good walletless/gasless product UX that makes direct onchain contribution feel like a normal checkout flow. It also keeps Commonality out of money transmission and avoids relying on a fiat-to-contract vendor to whitelist our contract.

### True bridge operators

A bridge operator is any entity (charity, fiscal host, project creator, licensed service, government agency) that:
1. Accepts tradfi payments (credit card, bank transfer, etc.)
2. Converts those funds to the project's settlement token
3. Calls `buyERC1155` on the assurance contract, specifying the tradfi donor, a labeled operator address, or an escrow as the `buyer`

The existing `buyERC1155(buyer, erc1155Addr, ids, counts, data)` interface already supports this — the `buyer` parameter is separate from `msg.sender`, so an operator can pay while the tokens land somewhere else.

This means a project with one assurance contract can accept both direct onchain pledges and bridge-operator contributions. The assurance contract doesn't know or care where the settlement tokens came from. The threshold, refund logic, and token accounting all work identically. The legal/compliance burden belongs to the operator, not to the contract.

### Claim links for donors who don't have a wallet yet

If a tradfi donor doesn't have an Ethereum address, the bridge operator can't send tokens directly to them. We need a claim mechanism.

**Approach: escrow contract with claim codes.**

A `TradFiBridgeEscrow` contract that works like this:

1. Bridge operator receives tradfi payment from Donor X.
2. Bridge operator generates a claim secret (random bytes), computes `claimHash = keccak256(secret)`.
3. Bridge operator calls `buyERC1155` with `buyer = address(escrow)`, so the escrow contract holds the tokens.
4. Bridge operator calls `escrow.deposit(claimHash, erc1155Addr, ids, counts)` to register that these specific tokens are claimable with this hash.
5. Bridge operator sends Donor X an email/link: `commonality.works/claim?code=<secret>`. The link walks them through creating a wallet.
6. Donor X creates a wallet and calls `escrow.claim(secret)`. The contract verifies `keccak256(secret) == claimHash` and transfers the tokens to `msg.sender`.

If the donor never claims, the bridge operator can reclaim after a timeout (and handle the tradfi refund separately).

If the assurance contract fails and refunds are available, the escrow contract would need to be able to call `refundERC1155` and hold the refunded settlement token for the bridge operator (who then handles any fiat-side refund or credit under its own process). This means the escrow contract should also implement `onERC1155BatchReceived`.

**Alternative: existing claim-link protocols like [Linkdrop](https://linkdrop.io/).** Linkdrop is an already-deployed protocol that does exactly this — create claim links for tokens (including ERC-1155) where the recipient doesn't need a wallet yet. If Linkdrop (or a similar protocol) supports our specific flow well enough, we could skip writing `TradFiBridgeEscrow` entirely and just use their infrastructure. The tradeoff: less control (we depend on their contracts and relay), but no custom escrow code to write or audit. There are also **merkle-proof airdrop contracts** (like [thirdweb's AirdropERC1155Claimable](https://thirdweb.com/thirdweb.eth/AirdropERC1155Claimable)) for the case where you know the recipient addresses upfront — cheaper per-claim but requires knowing addresses in advance.

> **Evaluation of Linkdrop (June 2026).** The relevant product is the **Linkdrop SDK V3** escrow-based claim-link protocol (`@linkdrop/sdk`, GPL-3.0, actively maintained — `3.15.2-beta`, Sep 2025), *not* the separate hosted "Linkdrop Pay" onramp product. It matches our design point-for-point on the hard parts:
> - **ERC-1155 claim links on Base** are supported (Base 8453 + Base Sepolia 84531 are listed chains).
> - Tokens sit in an **escrow contract** between deposit and claim, and the **relay server** sponsors gas so the recipient can claim to a brand-new, gasless wallet (non-custodial).
> - **Timeout-reclaim is built in**: an `expiration` timestamp auto-returns unclaimed tokens to the sender (`refunding`/`refunded` states), covering the "donor never claims" path described above.
>
> This is a strong argument for **not** writing a custom `TradFiBridgeEscrow` for the claim-link mechanics. Two caveats remain, and they are the actual decision points:
> 1. **The assurance-contract refund path is not covered.** Linkdrop's "refund" means an *unclaimed link* expiring back to the sender — it holds the **project ERC-1155 tokens**, not the settlement token, and its generic escrow has no way to call our assurance contract's `refundERC1155` to convert tokens back to USDC if the contract *fails* (the requirement noted below). That refund would have to be handled operationally by the bridge operator (reclaim expired tokens, then issue the fiat/USDC refund through its own process) rather than inside the escrow. If we insist the refund-to-settlement-token happen on-contract, *that single requirement* — not the claim-link mechanics — is what would justify custom code.
> 2. **Deposit shape differs from `buyer = address(escrow)`.** Linkdrop expects the sender to deposit *through its SDK* so it can register the claim secret, rather than minting straight into the escrow via `buyERC1155(buyer = escrow)`. So the operator flow becomes: buy tokens to the operator's own address → deposit into Linkdrop escrow via the SDK. Functionally equivalent; two steps instead of one, with the operator transiently holding the tokens.
>
> **Still to verify before committing:** whether the relay can be cleanly self-hosted (the `apiUrl` is configurable away from the default `escrow-api.linkdrop.io/v3` and the relay is open-source Node.js, but a clean self-host path wasn't confirmed) and the exact per-claim fee/gas model on the hosted plans. **Bottom line:** adopt Linkdrop for claim links if we can accept the assurance-failure refund being handled off-contract and accept (or self-host away) the hosted-relay dependency.

**Alternative: account abstraction (EIP-4337).** Instead of an escrow contract, the bridge operator creates a smart account for the donor, funded with a gas sponsorship (paymaster). The donor receives a link to "activate" their account by setting a password/key. Tokens are already in their account when they arrive. This overlaps with the general embedded-wallet/sponsored-gas work we want anyway, but bridge-operator account handoff still needs its own security design.

### Charity-as-onramp

A registered charity can serve as a bridge operator with tax benefits:

1. Donor makes a tax-deductible donation to the charity via tradfi.
2. Charity issues a tax receipt (traditional paperwork).
3. Charity converts funds to the project's settlement token and buys tokens on the donor's behalf (or into escrow with a claim link).
4. Donor gets both a tax deduction AND onchain recognition (leaderboard credit, resellable NFT).

The charity is trusted for the fiat-to-crypto conversion, but the onchain record is independently verifiable. If the charity is shady about conversion rates, that's visible because the tradfi donation amount and the onchain token amount are both auditable.

This is probably the most practical near-term bridge because it doesn't require new infrastructure — just a charity willing to interact with both systems.

### Government matching funds

(For the *strategy* of matching funds — why onchain matching beats the mainstream version, and the "credible benefit" framing — see [matching funds](../credible-solution/matching-funds.md). This section is just the plumbing.)

A government matching-fund program can use the bridge operator pattern too:

1. Government agency is authorized as a bridge operator.
2. When a project's assurance contract receives onchain pledges, the government matches (e.g. 1:1 up to some cap).
3. Government calls `buyERC1155` with `buyer` set to a government-labeled address (for transparency).
4. The government's contribution shows up on the leaderboard alongside individual donors.

The assurance contract threshold can be set to account for expected matching — e.g. if the government matches 1:1, set the threshold at half the actual cost and let the matching fill the rest. Or set the full threshold and let the matching bring it closer to success.

## Commonality → Tradfi (making onchain activity legible to traditional systems)

### Compliance reporting

A reporting service reads onchain data and generates tradfi-legible documents:
- Tax receipts / donation acknowledgment letters (for charity-as-onramp contributions)
- Annual giving summaries for donors
- Grant compliance reports for government-funded projects
- Audit trails showing exactly where funds went

The blockchain is the source of truth. The paperwork is just a view on top of it. This is a UI/service concern, not a smart contract concern — the data is all there in events and state already.

### Grant-application evidence

A project with a track record on Commonality has machine-readable proof of community support:
- Number of unique backers
- Total pledged amount
- Whether the assurance contract threshold was met
- Delegation chains showing which trusted community figures vouched for the project

This can feed into government grant applications: "We already have 500 community supporters who've pledged $50K — here's the onchain proof, verifiable by anyone." Government reviewers who value evidence of community buy-in get something much more credible than a petition with signatures.

### Fiat off-ramp for project creators

A project that raises funds onchain still needs to pay contractors and buy materials in fiat. This is just a normal crypto off-ramp (the project recipient calls `withdraw()` after the threshold is met, then converts the received settlement token to fiat). The important thing is that the accountability stays onchain even when the spending happens in tradfi — the full funding history, contributor list, and delegation chains are permanently recorded.

## Hybrid projects (both worlds simultaneously)

The most interesting case: a single project funded from multiple sources.

**Example:** A community wants to build a playground. They set up a Commonality assurance contract for $80K.
- 50 families pledge directly onchain ($40K total).
- The city offers a $20K matching grant — a city employee acting as bridge operator buys tokens on behalf of the city.
- A local business donates $10K through a charity-as-onramp (gets a tax receipt AND onchain tokens).
- A diaspora donor contributes $10K via credit card through a bridge operator service, receives a claim link.

The assurance contract sees $80K in `_totalReceivedValue`. The leaderboard shows all four types of contributors. The city can pull a compliance report. The business has a tax receipt. The diaspora donor can claim their tokens whenever they get around to setting up a wallet. And if the threshold isn't met, onchain pledges refund automatically while the bridge operator handles tradfi refunds through their own process.

**The design principle: Commonality is the system of record even when money flows through tradfi channels.** The blockchain is where accountability lives. Tradfi is just a payment rail.

## What needs to be built

### MVP product/infra pieces

These are general contribution-UX pieces, not bridge-specific contracts:

1. **Embedded wallet flow** — email/social login, wallet creation/recovery, and a way for the app to send/sign the contribution transaction from the contributor's own wallet.
2. **Plain fiat on-ramp integration** — card/Apple Pay/Google Pay purchase of USDC directly into the contributor's wallet.
3. **Contribution sequencing** — after the on-ramp succeeds, guide the contributor through allowance if needed, `buyERC1155`, confirmation, retry/error states, and leaderboard/status updates.
4. **Sponsored gas** — paymaster/bundler or equivalent so contributors do not need ETH. This needs rate limits and sponsorship caps.
5. **Refund UX** — if the assurance contract fails, show the contributor how to receive their onchain USDC refund, re-contribute it, or hand off to a licensed offramp if they want fiat.
6. **Notifications/reporting** — confirmation emails, refund-available emails, contribution records, and later tax/compliance reports where appropriate.

### Bridge-specific pieces

These are only needed for true bridge operators, claim-link flows, charities/fiscal hosts, or fallback vendor integrations:

1. **Bridge operator service** — Accepts tradfi payments, converts to the settlement token, calls `buyERC1155`, and handles its own compliance/refund obligations. This should be run by a licensed/regulated/appropriate third party, not Commonality by default.
2. **Claim-link or escrow mechanism** — Needed when an operator has a donor who does not yet have a wallet. **Linkdrop SDK V3 is the leading candidate** (ERC-1155 on Base, gasless relay claim, built-in timeout-reclaim) and likely lets us skip custom escrow code — see the evaluation above. The open decisions are whether to self-host its relay and whether we can accept assurance-failure refunds being handled off-contract.
3. **Optional `TradFiBridgeEscrow`** — Only if Linkdrop (or similar) proves insufficient. The most likely reason to still need this is the on-contract refund path: a custom contract to hold ERC-1155 tokens against claim secrets, support expiry/reclaim, *and* call `refundERC1155` to hold the refunded settlement token for the operator when the assurance contract fails — which Linkdrop's generic escrow does not do.
4. **Reporting service** — Reads onchain data and generates compliance documents, tax summaries, grant evidence, etc.
5. **Fallback one-step fiat-to-contract vendor integration** — Transak One, Wert, Crossmint, etc. Useful if the MVP on-ramp/wallet/paymaster path slips, but comes with contract whitelisting/vendor-dependency tradeoffs.

### Not in scope for the bridge MVP

- Commonality operating its own Stripe-plus-USDC-reserve bridge
- Commonality issuing fiat refunds itself
- Automated matching-fund contracts (government can just use the bridge operator pattern manually)
- Multi-chain bridges (one L2 is enough to start)
