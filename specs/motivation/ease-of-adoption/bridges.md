# Bridges between Commonality and traditional finance

The goal is to make it so that:
  - a project can accept funding from both onchain and tradfi sources
  - there's a unified onchain record of all contributions
  - onchain activity is legible to the traditional world (tax receipts, compliance reports, grant applications)

(See also [rails.md](./rails.md).)

Some things worth noting:
  - Making your project a Commonality project doesn't mean you're cutting off normal funding sources. Normies (including orgs) who just want to contribute via tradfi can do that, via bridge operators (see below). This includes supporting the normal stuff tradfi expects: tax receipts, etc.
  - This plays nicely with assurance contracts. Tradfi contributions go through a bridge operator who calls `buyERC1155` with ETH, so they count toward the threshold just like onchain pledges. If the threshold isn't met, the bridge operator calls `refundERC1155`, gets ETH back, and handles the fiat refund to the tradfi donor through their own process. The tradfi refund path requires trusting the bridge operator — but that's just what tradfi *is*. The onchain record is trustless; the fiat side uses the same trusted intermediaries people are already comfortable with.



This is NOT about replacing tradfi overnight. It's about making Commonality and tradfi interoperable, so that projects can draw from both worlds and participants can transition gradually.

## Tradfi → Commonality (bringing traditional money onchain)

### The core mechanism: bridge operators

A bridge operator is any entity (charity, project creator, dedicated service, government agency) that:
1. Accepts tradfi payments (credit card, bank transfer, etc.)
2. Converts those funds to ETH
3. Calls `buyERC1155` on the assurance contract, specifying the tradfi donor as the `buyer`

The existing `buyERC1155(buyer, erc1155Addr, ids, counts, data)` interface already supports this — the `buyer` parameter is separate from `msg.sender`, so the bridge operator pays and the tokens land in the donor's wallet.

This means a project with one assurance contract can accept both onchain pledges (users call `buyERC1155` directly) and tradfi payments (bridge operator calls `buyERC1155` on their behalf). The assurance contract doesn't know or care where the ETH came from. The threshold, refund logic, and token accounting all work identically.

### Claim links for donors who don't have a wallet yet

If a tradfi donor doesn't have an Ethereum address, the bridge operator can't send tokens directly to them. We need a claim mechanism.

**Approach: escrow contract with claim codes.**

A `TradFiBridgeEscrow` contract that works like this:

1. Bridge operator receives tradfi payment from Donor X.
2. Bridge operator generates a claim secret (random bytes), computes `claimHash = keccak256(secret)`.
3. Bridge operator calls `buyERC1155` with `buyer = address(escrow)`, so the escrow contract holds the tokens.
4. Bridge operator calls `escrow.deposit(claimHash, erc1155Addr, ids, counts)` to register that these specific tokens are claimable with this hash.
5. Bridge operator sends Donor X an email/link: `commonality.xyz/claim?code=<secret>`. The link walks them through creating a wallet.
6. Donor X creates a wallet and calls `escrow.claim(secret)`. The contract verifies `keccak256(secret) == claimHash` and transfers the tokens to `msg.sender`.

If the donor never claims, the bridge operator can reclaim after a timeout (and handle the tradfi refund separately).

If the assurance contract fails and refunds are available, the escrow contract would need to be able to call `refundERC1155` and hold the refunded ETH for the bridge operator (who then refunds via tradfi). This means the escrow contract should also implement `onERC1155BatchReceived`.

**Alternative: existing claim-link protocols like [Linkdrop](https://linkdrop.io/).** Linkdrop is an already-deployed protocol that does exactly this — create claim links for tokens (including ERC-1155) where the recipient doesn't need a wallet yet. It uses signature verification rather than a hash-commitment scheme, and includes a relay server that pays gas on the recipient's behalf. If Linkdrop (or a similar protocol) supports our specific flow well enough, we could skip writing `TradFiBridgeEscrow` entirely and just use their infrastructure. The tradeoff: less control (we depend on their contracts and relay), but no custom escrow code to write or audit. Worth evaluating before building our own. There are also **merkle-proof airdrop contracts** (like [thirdweb's AirdropERC1155Claimable](https://thirdweb.com/thirdweb.eth/AirdropERC1155Claimable)) for the case where you know the recipient addresses upfront — cheaper per-claim but requires knowing addresses in advance.

**Alternative: account abstraction (EIP-4337).** Instead of an escrow contract, the bridge operator creates a smart account for the donor, funded with a gas sponsorship (paymaster). The donor receives a link to "activate" their account by setting a password/key. Tokens are already in their account when they arrive. This is a smoother UX but more infrastructure to set up (bundler, paymaster, smart account factory — and you still need a secret-based handoff mechanism for account ownership, so the core problem doesn't fully go away). Worth considering for the non-MVP version.

### Charity-as-onramp

A registered charity can serve as a bridge operator with tax benefits:

1. Donor makes a tax-deductible donation to the charity via tradfi.
2. Charity issues a tax receipt (traditional paperwork).
3. Charity converts funds to ETH and buys tokens on the donor's behalf (or into escrow with a claim link).
4. Donor gets both a tax deduction AND onchain recognition (leaderboard credit, resellable NFT).

The charity is trusted for the fiat-to-crypto conversion, but the onchain record is independently verifiable. If the charity is shady about conversion rates, that's visible because the tradfi donation amount and the onchain token amount are both auditable.

This is probably the most practical near-term bridge because it doesn't require new infrastructure — just a charity willing to interact with both systems.

### Government matching funds

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

A project that raises funds onchain still needs to pay contractors and buy materials in fiat. This is just a normal crypto off-ramp (the project recipient calls `withdraw()` after the threshold is met, then converts ETH to fiat). The important thing is that the accountability stays onchain even when the spending happens in tradfi — the full funding history, contributor list, and delegation chains are permanently recorded.

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

### Smart contracts

1. **TradFiBridgeEscrow** — Holds tokens for unclaimed donors. Key functions:
   - `deposit(bytes32 claimHash, address erc1155Addr, uint256[] ids, uint256[] counts)` — register claimable tokens (callable by authorized bridge operators)
   - `claim(bytes secret)` — donor claims tokens by revealing the secret
   - `reclaimExpired(bytes32 claimHash)` — bridge operator reclaims after timeout
   - Must implement `onERC1155BatchReceived` (to hold ERC-1155 tokens)
   - Must be able to call `refundERC1155` on the assurance contract if it fails, and hold refunded ETH for the bridge operator

2. **No changes needed to existing assurance contracts.** The `buyERC1155(buyer, ...)` interface already supports buying on behalf of others. The bridge pattern is entirely additive.

### Off-chain services

1. **Bridge operator service** — Accepts tradfi payments, converts to ETH, calls `buyERC1155` or deposits into escrow. Could be run by the project creator, a charity, or a dedicated third-party service.
2. **Claim link frontend** — Wallet creation flow for tradfi donors receiving claim links. Walks them through creating a wallet and claiming their tokens.
3. **Reporting service** — Reads onchain data and generates compliance documents, tax summaries, etc.

### Not in scope for MVP

- Account abstraction / paymaster infrastructure (nice UX improvement, not essential)
- Automated matching-fund contracts (government can just use the bridge operator pattern manually)
- Multi-chain bridges (one L2 is enough to start)
