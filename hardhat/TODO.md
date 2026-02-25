# Smart Contract TODOs (from Slither audit)

Issues identified by running `npm run lint:slither` in `hardhat/`. Ordered by severity.

## High: Reentrancy in DelegatableNotes purchase functions

Both `purchaseFromPrimaryMarket` and `purchaseFromSecondaryMarket` in
`contracts/delegation/DelegatableNotes.sol` write to `notes` mapping **after**
external calls to the marketplace contracts. A malicious marketplace (or a
re-entrant callback) could exploit this to corrupt note state.

**Affected lines:**
- `purchaseFromPrimaryMarket` (line 377–425): external call at 398–404, state write at 407–414
- `purchaseFromSecondaryMarket` (line 436–491): external call at 456–460, state write at 473–480

**Fix:** Apply checks-effects-interactions pattern — move `_createNotesForPurchasedTokens`
(and the `nextNoteId` increment) before the external marketplace call, or add a
`nonReentrant` modifier (OpenZeppelin `ReentrancyGuard`).

## ~~Medium: Missing zero-address checks before ETH transfers~~ DONE

Added zero-address guards before each ETH transfer:
- `DelegatableNotes.reclaimFunds` — `revert ZeroAddress()` (existing error)
- `ERC1155PrimaryMarket.refundERC1155` — `revert ZeroAddress()` (new error added)
- `ERC1155SecondaryMarket.fulfillBuyOrder` — `revert InvalidRecipient()` (existing error)

## Medium: Arbitrary ETH sends

Slither flags that several functions send ETH to user-controlled addresses.
This is expected behavior for a marketplace, but each call site should be
reviewed to confirm the recipient is properly authorized:

- `DelegatableNotes.reclaimFunds` (line 214)
- `DelegatableNotes.purchaseFromPrimaryMarket` (line 398–404)
- `DelegatableNotes.purchaseFromSecondaryMarket` (line 456–460)
- `ERC1155PrimaryMarket.refundERC1155` (line 174)
- `ERC1155SecondaryMarket.fulfillBuyOrder` (line 294)

**Fix:** Likely acceptable by design, but verify access control on each function
ensures only authorized callers can trigger the send.
