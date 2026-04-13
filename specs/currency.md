# What currencies do we support?

The code is currently written to support only ETH. (All the assurance contracts expect ETH, etc.)

I'm generally a fan of ETH and I'd like to see it flourish, but the Commonality project in general is probably better served by using stablecoins, or at least having one stablecoin as an option (and it should be the default option).

The problem isn't exactly "ETH is weird and unfamiliar to normies"; we could get around that by auto-converting. The problem is that the assurance contracts and delegatable notes are going to be escrowing funds, potentially for quite a while, and so ETH's volatility is a problem.

If we're going to use a stablecoin, I'd prefer it to be something more like DAI rather than USDC; it's actually important for Commonality that it be censorship-resistant.

Ideally I'd prefer an ETH-backed stablecoin like RAI or HAI, but IIUC those projects aren't doing well and don't have much liquidity.

Maybe DAI is the best we can do at the moment?

Should we just straight-up *convert* to *only* using the stablecoin, or should we offer each assurance contract the ability to choose which token it wants to use? (That'd probably be a lot more complicated, but in a sense feels cleaner and more in line with the philosophy of the project: the assurance contracts are meant to be separate things, a contract between the participants; it's not really anyone else's business what currency they want to use. But still, it's more complex to code and probably opens up more security worries and it's also an extra choice that the users would have to think about, although having sane defaults might make that livable.)

One thought about DAI vs USDC: if the long-term plan (post MVP) is to offer the ability for each assurance contract to choose, then we don't actually need to worry so much about whether the one token that we choose for now is censorship-resistant or not. Just use USDC if that's easier, and later on we can open it up so that contracts that care about censorship-resistance can use DAI or ETH or whatever they want.

Okay, let's try:
  - Generalize the smart contracts so that they can work with any arbitrary ERC-20 token, but make each assurance contract specify in the constructor which particular token to accept. (What's the standard way of doing ETH? Do we do wETH so that it's all ERC-20, or do we special-case the code to use ETH directly?)
  - For now we can at least make our queries and so on be explicit about which currency, rather than assuming ETH. (If you need to make a sum of X ETH + Y USDC, just store that as "X ETH and Y USDC"; maybe we'll find an exchange rate and convert to a single scalar at the very end for display if necessary.)
  - For MVP production, USDC only.
  - For MVP dev/testing, using ETH is fine for ease of testing.
  - Post-MVP: let each assurance contract choose which token.

## Order of work

The safest way to do this is probably *not* to start by changing the smart contracts.

Instead, first change the off-chain layers so that they are explicit about currency even while the underlying behavior remains exactly the same as it is now. In other words: for a while, everything can still really be ETH, but the queries, folded state, SDK types, UI components, formatting helpers, and aggregate calculations should all stop silently assuming that "amount" means "ETH amount". They should carry explicit currency information.

That gives us a useful intermediate state:

  - Behavior is unchanged, so this phase should mostly be a refactor rather than a semantic change.
  - The stack becomes honest about what kind of value it is displaying or aggregating.
  - We find all the places that currently assume different projects' values can be combined into one scalar just because they are numbers.
  - When we later change the smart contracts, the off-chain code will already know how to represent "this project uses token T" rather than needing that whole refactor at the same time.

This should lower risk substantially. If we try to generalize the smart contracts first while the SDK/UI/query layers are still implicitly ETH-shaped, there's a good chance of introducing confusing bugs where the contracts are technically multi-currency-capable but the rest of the system still treats everything as if it were ETH.

So the intended sequence is:

  - First: make the non-smart-contract layers currency-explicit, while still effectively ETH-only.
  - Second: generalize settlement and escrow in the smart contracts and transaction flows.
  - Third: for MVP production, probably pick one stablecoin and use only that in practice.
  - Later: allow each assurance contract to choose its own token.

## Smart-contract implementation plan

Once the off-chain layers are currency-explicit, the smart-contract work should be done in roughly this order.

### 1. Introduce a per-contract settlement token

Generalize the assurance-contract stack so that one assurance contract uses exactly one settlement token.

For the smart contracts, the cleanest model is:

  - Each assurance contract stores an immutable `paymentToken`.
  - Prices and thresholds are denominated in units of that token.
  - Primary-market purchases, refunds, successful withdrawals, and escrow transfers all use that token.
  - For now, production can still deploy all contracts with the same token.
  - Post-MVP, different assurance contracts can choose different tokens.

Using one token per assurance contract keeps the accounting simple and preserves the current assumption that a single scalar threshold can be compared against a single scalar progress value.

### 2. Change the core settlement contracts

These are the contracts that actually hold or move ETH today and therefore need real logic changes:

  - `hardhat/contracts/individual-projects/AssuranceContract.sol`
    - `withdraw()` currently empties `address(this).balance` and sends native ETH.
    - It should instead transfer the configured settlement token balance.
  - `hardhat/contracts/individual-projects/ERC1155PrimaryMarket.sol`
    - `buyERC1155()` is currently `payable` and checks `msg.value`.
    - `refundERC1155()` currently sends ETH back to the holder.
    - This contract should become token-aware and use ERC-20 transfers for buys and refunds.
  - `hardhat/contracts/individual-projects/AssuranceContracts.sol`
    - `MultiERC1155AssuranceContract` currently tracks prices and total received value but has no notion of which currency those values represent.
    - It should store the chosen payment token and expose enough information for off-chain code to query it.
  - `hardhat/contracts/content-funding/CreatorAssuranceContract.sol`
    - `withdrawToEscrow()` currently forwards native ETH into `ChannelEscrow`.
    - It should route the configured settlement token into escrow instead.
  - `hardhat/contracts/content-funding/ChannelEscrow.sol`
    - It currently stores one ETH balance per channel and withdraws native ETH.
    - It should become token-aware so unclaimed-channel funds can be held and later withdrawn in the same settlement token.

### 3. Change factory and creation flows

After the core settlement path works, thread the currency choice through the creation flows.

Contracts that need wiring changes:

  - `hardhat/contracts/content-funding/CreatorAssuranceContractFactory.sol`
    - Add a payment-token parameter to contract creation.
    - Replace `msg.value`-based initial-purchase flow with ERC-20 transfer flow.
    - Replace ETH-denominated `thirdPartyMinPurchase` with a value denominated in the chosen token, or else explicitly constrain MVP creation to one configured token.
    - Keep the threshold and initial purchase denominated in the same settlement token.
  - `hardhat/contracts/individual-projects/Pubstarter.sol`
    - Add a payment-token parameter to assurance-contract creation and plumb it into the assurance contract, primary market, and marketplace deployment.
    - Update any factory interfaces and events that currently imply ETH.

### 4. Decide what to do about threshold conditions

`hardhat/contracts/individual-projects/EthThresholdCondition.sol` does not fundamentally depend on ETH; it just compares a scalar progress value to a scalar threshold.

So the likely change here is mostly naming and clarity:

  - Rename it to something like `ValueThresholdCondition` or `TokenThresholdCondition`.
  - Keep the logic the same as long as each assurance contract has exactly one settlement token.
  - Keep `threshold` denominated in that contract's settlement token.

### 5. Decide whether secondary markets must move in the same phase

`hardhat/contracts/marketplace/ERC1155SecondaryMarket.sol` is fully ETH-based today:

  - Sale fulfillment sends ETH to the seller.
  - Buy orders escrow ETH in the marketplace.
  - Cancelling a buy order refunds ETH.

If the multi-currency work is meant to cover all on-chain trading for a project, this contract must be generalized in the same way as the primary market.

The cleanest model is:

  - Each marketplace instance is tied to both one ERC1155 contract and one payment token.
  - Listings and buy orders settle only in that payment token.

If we want to reduce scope, we could temporarily leave the secondary market ETH-only and treat that as an explicit limitation, but that would be an awkward mismatch once primary funding is token-based.

### 6. Decide whether DelegatableNotes must move in the same phase

`hardhat/contracts/delegation/DelegatableNotes.sol` already supports ERC-20 deposits in general, but its purchase paths are still effectively ETH-only:

  - `_preparePayment()` currently rejects payment notes unless `note.token == address(0)`.
  - Note-backed purchases call the primary and secondary markets with `{value: paymentAmount}`.

If delegatable notes are expected to fund projects or buy contribution tokens in the chosen settlement token, this contract needs to be updated in the same smart-contract phase.

The likely model is:

  - Payment notes used for a purchase must all match the target market's payment token.
  - The note contract should transfer ERC-20 funds to the market instead of forwarding ETH.
  - Purchased ERC1155 tokens can still be wrapped back into notes exactly as before.

### 7. Contracts that probably do not need semantic changes

These contracts do not appear to be materially currency-coupled:

  - `hardhat/contracts/content-funding/ContentRegistry.sol`
  - `hardhat/contracts/content-funding/ChannelRegistry.sol`
  - `hardhat/contracts/individual-projects/CancellableCondition.sol`
  - `hardhat/contracts/individual-projects/IAssuranceCondition.sol`
  - ERC1155 utility/token contracts
  - Non-funding subsystems such as statements, subjectiv, alignment-attestations, and mutable refs

### Recommended implementation sequence inside the smart-contract phase

  - First: add a settlement-token concept to the assurance-contract and primary-market stack.
  - Second: update escrow and content-funding factory flows to use that token.
  - Third: generalize the secondary market to use one payment token per market.
  - Fourth: update DelegatableNotes so note-backed purchases work with token-settled markets.
  - Fifth: rename ETH-specific types and events for clarity.

### MVP recommendation

For MVP production, the simplest path is:

  - Implement the contracts in a token-general way.
  - Deploy production with exactly one approved stablecoin.
  - Keep dev/testing on ETH only if that remains substantially easier, but preferably do that via a mock ERC-20 or wrapped ETH so the contract code path stays the same.

Using wrapped ETH rather than special-casing native ETH would keep the contract design simpler.
