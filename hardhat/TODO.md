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
